/**
 * @file upload-controller.js
 * @module controllers/upload-controller
 * @description Controller class for handling CSV file upload logic.
 * @version 1.0.1
 * @author Kizito S.M.
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import csvParser from "csv-parser";
import pkg from "csv-writer";
import streamifier from "streamifier";
import dotenv from "dotenv";
dotenv.config();

import CustomError from "../helpers/custom-error.js";
import response from "../helpers/response-handler.js";

// Get the current module's URL
const currentModuleURL = new URL(import.meta.url);
// Get the directory name
const __dirname = dirname(fileURLToPath(currentModuleURL));
// Destructure the csv-writer package
const { createObjectCsvWriter } = pkg;

/**
 * Controller class for handling CSV file upload logic.
 * @class
 */
class UploadController {
  /**
   * Constructor for UploadController.
   * @constructor
   */
  constructor() {
    // Set the current directory name
    this.__dirname = dirname(fileURLToPath(currentModuleURL));
  }

  /**
   * Handles requests to the root path.
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   * @returns {Object} - JSON response containing the message and authentication status.
   */
  async all(req, res, next) {
    try {
      // Check if the request is authenticated
      const authenticated = req.decoded ? true : false;

      // Response payload
      const payload = {
        token: null,
        authenticated: authenticated,
        message: "Root path reached",
      };

      return response.api(req, res, 200, payload);
    } catch (error) {
      console.error(error.message);
      next(error);
    }
  }

  /**
   * Handles file uploads and processes the CSV file.
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   * @returns {Object} - JSON response containing the message and authentication status.
   */
  async create(req, res, next) {
    try {
      // Check if a file is provided in the request
      if (!req.file) {
        throw new Error("No file provided!");
      }

      // Capture the original file name to determine if it's for clientscontacts
      const originalFileName = req.file.originalname;

      // Fetch ctcNumbers from the provided endpoint
      const ctcNumbersResponse = await fetch("http://170.187.199.69:8090/get-uploaded-ctc-numbers");
      if (!ctcNumbersResponse) {
        throw new Error("Duplicate checker service unavailable. Please retry later!");
      }
      const ctcNumbers = await ctcNumbersResponse.json();

      // Extract ctc_numbers from the response
      const existingCtcNumbers = ctcNumbers.map((item) => item.ctc_number);

      const fileNameParts = originalFileName.split("_");
      const uploadType =
        fileNameParts[1] === "clients" || fileNameParts[1] === "contacts" ? fileNameParts[1] : null;

      const fileBuffer = req.file.buffer;

      // Convert the buffer to a readable stream using streamifier
      const fileStream = streamifier.createReadStream(fileBuffer);

      // Process the uploaded CSV file
      const results = [];
      const rejectedRows = [];
      const csvStream = csvParser({ headers: true });

      // Flag to check if it's the first row
      let isFirstRow = true;
      csvStream.on("data", (data) => {
        // Check if ctcNumber is in existingCtcNumbers
        const ctcNumber = data._0;
        if (existingCtcNumbers.includes(ctcNumber)) {
          rejectedRows.push(data); // If ctc_number is in existingCtcNumbers, push it to rejectedRows
        } else {
          // Check if it's the first row
          if (isFirstRow) {
            // Add the specified columns to the header row
            data.providerId = "providerId";
            data.team = "team";
            data.teamId = "teamId";
            data.locationId = "locationId";

            // Update the flag to false for subsequent rows
            isFirstRow = false;
          } else {
            // For every other row, obtain the data from the decoded token
            data.providerId = req.decoded.data.providerId;
            data.team = req.decoded.data.team;
            data.teamId = req.decoded.data.teamId;
            data.locationId = req.decoded.data.locationId;
          }

          // Push the processed data to the results array
          results.push(data);
        }
      });

      // Event handler when the CSV stream ends
      csvStream.on("end", async () => {
        // Check if there is data available
        if (results.length > 0) {
          // Determine the upload directory based on the uploadType
          let uploadDirectory;

          if (uploadType === "clients") {
            uploadDirectory = "index_uploads";
          } else if (uploadType === "contacts") {
            uploadDirectory = "contacts_uploads";
          } else {
            console.error("UploadType:", uploadType);
            return response.api(req, res, 201, "Upload type is null!" + req.file.originalname);
          }

          // Set the filePath based on the determined upload directory
          const filePath = join(__dirname, `../public/${uploadDirectory}`, originalFileName);

          // Create a CSV writer instance
          const csvWriter = createObjectCsvWriter({
            path: filePath,
            header: Object.keys(results[0]), // Use the keys from the first row as headers
            alwaysQuote: true, // Ensure all values are quoted
          });

          // Write records to the CSV file
          await csvWriter.writeRecords(results);

          const rejected = rejectedRows.length > 0 ? true : false;

          // Response payload
          const payload = {
            token: null,
            authenticated: true,
            message: "File uploaded, processed, and saved successfully!",
            rejected: rejected,
            rejectedRows: rejectedRows,
          };

          return response.api(req, res, 201, payload);
        } else {
          throw new CustomError("All rows were rejected.", 400);
        }
      });

      // Process the uploaded CSV file using the readable stream
      fileStream.pipe(csvStream);
    } catch (error) {
      console.error(error.message);
      next(error);
    }
  }
}

export default new UploadController();
