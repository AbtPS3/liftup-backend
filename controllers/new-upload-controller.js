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

      // Capture the original file name to determine if it's for clients or contacts
      const originalFileName = req.file.originalname;

      // Fetch ctcNumbers from the provided endpoint
      const ctcNumbersResponse = await fetch("http://localhost:8090/get-uploaded-ctc-numbers");
      const ctcNumbers = await ctcNumbersResponse.json();
      console.log("CTC Numbers", ctcNumbers);

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

      csvStream.on("data", (data) => {
        const ctcNumber = data.ctc_number;

        // Check if ctcNumber is in existingCtcNumbers
        if (!existingCtcNumbers.includes(ctcNumber)) {
          results.push(data);
        } else {
          rejectedRows.push(data);
        }
      });

      // Event handler when the CSV stream ends
      csvStream.on("end", async () => {
        // Check if there is data available
        if (results.length > 0) {
          // Rest of the code for writing the CSV file remains the same
          // Define the payload object
          const rejected = rejectedRows.length > 0 ? true : false;
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
