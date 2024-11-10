/**
 * @file authentication-controller.js
 * @module controllers/authentication-controller
 * @description Controller class for handling user authentication.
 * @version 1.0.1
 * @author Kizito S.M.
 */

import axios from "axios";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
import { PrismaClient } from "@prisma/client";

import CustomError from "../helpers/custom-error.js";
import response from "../helpers/response-handler.js";
import AuthenticateJwt from "../middlewares/authenticate-jwt.js";
import AuthenticationService from "../services/authentication-service.js";
import { getFileTypeCount, getImportedRecords, getRejectedRecords, getLastUploadDate, getTotalFileTypeCount, getTotalAcceptedRecords, getTotalRejectedRecords } from "../services/upload-service-v2.js";

/**
 * Controller class for handling user authentication.
 * @class
 */
class AuthenticationController {
  /**
   * Constructor for AuthenticationController.
   * @constructor
   */
  constructor() {
    // Initialize AuthenticateJwt instance for authentication
    this.auth = new AuthenticateJwt();
    this.authenticationService = new AuthenticationService();
    this.prisma = new PrismaClient();
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
      const envUsername = atob(process.env.LIFTUP_USERNAME);
      const envPassword = atob(process.env.LIFTUP_PASSWORD);

      // Check if both username and password are provided
      if (!username || !password) {
        throw new CustomError("Username or Password is missing!", 400);
      } else if (username == "tepifac") {
        // Change to 'tepifad' to disable this behaviour
        // Check if password is sawasawa
        if (password !== envPassword) {
          throw new CustomError("Invalid password!", 401);
        }

        // Generate TEPIFAC specific dashboards
        const totalClientFilesDodoma = await getTotalFileTypeCount("clients", "Dodoma Region");
        const totalClientFilesMbeya = await getTotalFileTypeCount("clients", "Mbeya Region");
        const totalClientFilesMwanza = await getTotalFileTypeCount("clients", "Mwanza Region");
        const totalContactFilesDodoma = await getTotalFileTypeCount("contacts", "Dodoma Region");
        const totalContactFilesMbeya = await getTotalFileTypeCount("contacts", "Mbeya Region");
        const totalContactFilesMwanza = await getTotalFileTypeCount("contacts", "Mwanza Region");
        const totalResultFilesDodoma = await getTotalFileTypeCount("results", "Dodoma Region");
        const totalResultFilesMbeya = await getTotalFileTypeCount("results", "Mbeya Region");
        const totalResultFilesMwanza = await getTotalFileTypeCount("results", "Mwanza Region");
        const totalAcceptedRecordsDodoma = await getTotalAcceptedRecords("Dodoma Region");
        const totalAcceptedRecordsMbeya = await getTotalAcceptedRecords("Mbeya Region");
        const totalAcceptedRecordsMwanza = await getTotalAcceptedRecords("Mwanza Region");
        const totalRejectedRecordsDodoma = await getTotalRejectedRecords("Dodoma Region");
        const totalRejectedRecordsMbeya = await getTotalRejectedRecords("Mbeya Region");
        const totalRejectedRecordsMwanza = await getTotalRejectedRecords("Mwanza Region");

        const adminUploadStats = {
          totalClientFilesDodoma: totalClientFilesDodoma,
          totalClientFilesMbeya: totalClientFilesMbeya,
          totalClientFilesMwanza: totalClientFilesMwanza,
          totalContactFilesDodoma: totalContactFilesDodoma,
          totalContactFilesMbeya: totalContactFilesMbeya,
          totalContactFilesMwanza: totalContactFilesMwanza,
          totalResultFilesDodoma: totalResultFilesDodoma,
          totalResultFilesMbeya: totalResultFilesMbeya,
          totalResultFilesMwanza: totalResultFilesMwanza,
          totalAcceptedRecordsDodoma: totalAcceptedRecordsDodoma,
          totalAcceptedRecordsMbeya: totalAcceptedRecordsMbeya,
          totalAcceptedRecordsMwanza: totalAcceptedRecordsMwanza,
          totalRejectedRecordsDodoma: totalRejectedRecordsDodoma,
          totalRejectedRecordsMbeya: totalRejectedRecordsMbeya,
          totalRejectedRecordsMwanza: totalRejectedRecordsMwanza,
        };

        // Generate a JWT token using user information from the authentication response
        const token = jwt.sign(
          {
            exp: Date.now(),
            data: {
              team: "TEPI_Dev",
              teamId: "e26a5499-a4db-4441-b5b1-3bb16d95822c",
              providerId: envUsername,
              locationId: "065fc2b9-15d6-4453-8134-4a3b02efd64e",
              facility: "TEPI Dev Facility",
              userBaseEntityId: "e26a5499-a4db-4441-b5b1-3bb16d95822c",
            },
          },
          process.env.JWT_SECRET
        );

        // Response payload
        const payload = {
          token: token,
          authenticated: true,
          message: "Dev login successful",
          adminUploadStats: adminUploadStats,
        };

        return response.api(req, res, 200, payload);
      } else {
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
        const authResponse = await axios.get("http://" + opensrpIp + ":" + opensrpPort + "/opensrp/security/authenticate", axiosConfig);

        // Extract tags from the returned locations object
        const locationTags = await authResponse.data.team.locations[0].tags;

        // Check id any tag has the name "Facility"
        const hasFacilityTag = locationTags.some((tag) => tag.name === "Facility");

        if (!hasFacilityTag) {
          throw new CustomError("User is not allowed to add files!", 401);
        }

        const clientFiles = await getFileTypeCount(username, "clients");
        const contactFiles = await getFileTypeCount(username, "contacts");
        const resultFiles = await getFileTypeCount(username, "results");
        const acceptedRecords = await getImportedRecords(username);
        const rejectedRecords = await getRejectedRecords(username);
        const lastUploadDate = await getLastUploadDate(username);

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
              userBaseEntityId: authResponse.data.user.baseEntityId,
            },
          },
          process.env.JWT_SECRET
        );

        // Response payload
        const payload = {
          token: token,
          authenticated: true,
          message: "Login successful",
          userUploadStats: {
            clientFiles: clientFiles,
            contactFiles: contactFiles,
            resultFiles: resultFiles,
            acceptedRecords: acceptedRecords,
            rejectedRecords: rejectedRecords,
            lastUploadDate: lastUploadDate,
          },
        };

        return response.api(req, res, 200, payload);
      }
    } catch (error) {
      console.error(error);
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

  // Get unauthorizedResponse Object
  async getUnauthorizedResponse() {
    const unauthorizedResponse = {
      status: null,
      success: null,
      message: "",
      /**
       * @param {number} status
       */
      set status(status) {
        this.status = 401;
      },
      /**
       * @param {boolean} success
       */
      set success(success) {
        this.success = false;
      },
      /**
       * @param {string} message
       */
      set message(message) {
        this.message = "Unauthorized";
      },
    };

    return unauthorizedResponse;
  }

  // Get users from ENV variables
  async getUsers() {
    try {
      const users = {
        [process.env.DASHBOARD_USERNAME1]: process.env.DASHBOARD_PASSWORD1,
        [process.env.DASHBOARD_USERNAME2]: process.env.DASHBOARD_PASSWORD2,
      };
      return users;
    } catch (error) {
      console.error(error.message);
      next(error);
    }
  }

  async getFileTypeCount(username, fileType) {
    // Query the data from the DB
    const fileTypeCount = await this.prisma.uploads.count({
      where: {
        username: username,
        uploaded_file_type: fileType,
      },
    });

    return fileTypeCount;
  }

  async getSumImportedRecords(username) {
    const sumImportedRows = await this.prisma.uploads.aggregate({
      where: {
        username: username,
      },
      _sum: {
        imported_rows: true,
      },
    });

    return sumImportedRows._sum.imported_rows || 0;
  }

  async getSumRejectedRecords(username) {
    const sumRejectedRows = await this.prisma.uploads.aggregate({
      where: {
        username: username,
      },
      _sum: {
        rejected_rows: true,
      },
    });

    return sumRejectedRows._sum.rejected_rows || 0;
  }

  async getLastUploadDate(username) {
    const lastUploadDate = await prisma.uploads.findFirst({
      where: {
        username: username,
      },
      orderBy: {
        upload_date: "desc",
      },
      select: {
        upload_date: true,
      },
    });

    return lastUploadDate?.upload_date || null;
  }
}

export default new AuthenticationController();
