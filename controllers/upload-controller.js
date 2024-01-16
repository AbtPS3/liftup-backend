/**
 * @file UploadController.js
 * @module controllers/UploadController
 * @description Controller class for handling CSV file upload logic and authentication.
 * @version 1.0.0
 * @author Kizito S.M.
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import csvParser from "csv-parser";
import pkg from "csv-writer";
import streamifier from "streamifier";
import axios from "axios";
import jwt from "jsonwebtoken";

import CustomError from "../helpers/custom-error.js";
import response from "../helpers/api-helper.js";
import AuthenticateJwt from "../middleware/authenticate-jwt.js";

// Get the current module's URL
const currentModuleURL = new URL(import.meta.url);
// Get the directory name
const __dirname = dirname(fileURLToPath(currentModuleURL));
// Destructure the csv-writer package
const { createObjectCsvWriter } = pkg;

/**
 * Controller class for handling CSV file upload logic and authentication.
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
    // Initialize AuthenticateJwt instance for authentication
    this.auth = new AuthenticateJwt();
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
   * Handles requests to the protected route.
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   * @returns {Object} - JSON response containing the message and authentication status.
   */
  async protected(req, res, next) {
    try {
      // Check if the request is authenticated
      const authenticated = req.decoded ? true : false;

      // Response payload
      const payload = {
        token: null,
        authenticated: authenticated,
        message: "Protected route has been reached!",
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
      // const match = originalFileName.match(/^(\d{4}-\d{2}-\d{2})_[^_]+_(clients|contacts)_/);
      // const uploadType = match ? match[2] : null;
      const fileNameParts = originalFileName.split("_");
      const uploadType =
        fileNameParts[1] === "clients" || fileNameParts[1] === "contacts" ? fileNameParts[1] : null;

      const fileBuffer = req.file.buffer;

      // Convert the buffer to a readable stream using streamifier
      const fileStream = streamifier.createReadStream(fileBuffer);

      // Process the uploaded CSV file
      const results = [];
      const csvStream = csvParser({ headers: true });

      // Flag to check if it's the first row
      let isFirstRow = true;
      csvStream.on("data", (data) => {
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
            // throw new CustomError(`Invalid uploadType: ${uploadType}`, 400);
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

          // Response payload
          const payload = {
            token: null,
            authenticated: true,
            message: "File uploaded, processed, and saved successfully!",
          };

          return response.api(req, res, 201, payload);
        } else {
          throw new CustomError("No data available to write to CSV.", 400);
        }
      });

      // Process the uploaded CSV file using the readable stream
      fileStream.pipe(csvStream);
    } catch (error) {
      console.error(error.message);
      next(error);
    }
  }

  /**
   * Handles user login requests and generates a JWT token.
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   * @returns {Object} - JSON response containing the token and authentication status.
   */
  async login(req, res, next) {
    try {
      // Extract username and password from the request body
      const { username, password } = req.body;
      // Check if both username and password are provided
      if (!username || !password) {
        throw new CustomError("Username or Password is missing!", 400);
      }

      // Create a base64-encoded Authorization header value
      const authHeaderValue = Buffer.from(`${username}:${password}`).toString("base64");

      // Configure headers for the authentication request to external service
      const axiosConfig = {
        headers: {
          Authorization: `Basic ${authHeaderValue}`,
          "Content-Type": "application/json",
        },
      };

      // Make an authentication request to an external service
      const opensrpIp = process.env.OPENSRP_IP;
      const opensrpPort = process.env.OPENSRP_PORT;
      const authResponse = await axios.get(
        "http://" + opensrpIp + ":" + opensrpPort + "/opensrp/security/authenticate",
        axiosConfig
      );

      // Extract username and password from the request body
      const userType = await authResponse.data.team.locations[0].tags[0].name;
      // Check if both username and password are provided
      if (userType !== "Facility") {
        throw new CustomError("User is not allowed to add files!", 400);
      }

      // Generate a JWT token using user information from the authentication response
      const token = jwt.sign(
        {
          exp: Date.now(),
          data: {
            team: authResponse.data.team.team.teamName,
            teamId: authResponse.data.team.team.uuid,
            providerId: authResponse.data.user.username,
            locationId: authResponse.data.team.locations[0].uuid,
            facility: authResponse.data.team.locations[0].display,
          },
        },
        process.env.JWT_SECRET
      );

      // Response payload
      const payload = {
        token: token,
        authenticated: true,
        message: "Login successful",
      };

      return response.api(req, res, 200, payload);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
}

export default new UploadController();
