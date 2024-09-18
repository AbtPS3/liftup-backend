/**
 * @file upload-controller.js
 * @module controllers/upload-controller
 * @description Controller class for handling CSV file upload logic.
 * @version 1.1.0
 * @autor Kizito S.M.
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import csvParser from "csv-parser";
import pkg from "csv-writer";
import streamifier from "streamifier";
import dotenv from "dotenv";
import crypto from "crypto";

import CustomError from "../helpers/custom-error.js";
import response from "../helpers/response-handler.js";
import { uploadStats, getFileTypeCount, getTotalImportedRecords, getTotalRejectedRecords, getLastUploadDate } from "../services/upload-service-v2.js";

dotenv.config();

const { createObjectCsvWriter } = pkg;
const currentModuleURL = new URL(import.meta.url);
const __dirname = dirname(fileURLToPath(currentModuleURL));

/**
 * Controller class for handling CSV file upload logic.
 * @class
 */
class UploadController {
  constructor() {
    this.ctcNumbersResponse = null;
    this.elicitationNumbersResponse = null;
  }

  /**
   * Handles requests to the root path.
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  async all(req, res, next) {
    try {
      const authenticated = !!req.decoded;
      const payload = {
        token: null,
        authenticated,
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
   */
  async create(req, res, next) {
    try {
      if (!req.file) throw new Error("No file provided!");

      const originalFileName = req.file.originalname;
      const fileNameParts = originalFileName.split("_");
      const uploadType = ["clients", "contacts", "results"].includes(fileNameParts[1]) ? fileNameParts[1] : null;
      const fileBuffer = req.file.buffer;
      const fileStream = streamifier.createReadStream(fileBuffer);
      const ctcNumbersEndpoint = process.env.CTC_NUMBERS_ENDPOINT;
      const elicitationNumbersEndpoint = process.env.ELICITATION_NUMBERS_ENDPOINT;

      // Fetch responses with a timeout promise
      try {
        [this.ctcNumbersResponse, this.elicitationNumbersResponse] = await Promise.race([
          Promise.all([fetch(ctcNumbersEndpoint), fetch(elicitationNumbersEndpoint)]),
          timeoutPromise(60000, "UCS checker services unavailable"),
        ]);
      } catch (error) {
        throw new CustomError("UCS checker services unavailable.", 500);
      }

      function timeoutPromise(ms, message) {
        return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms));
      }

      if (!this.ctcNumbersResponse.ok) throw new Error("CTC Deduplicator checker unavailable. Retry later!");
      if (!this.elicitationNumbersResponse.ok) throw new Error("Elicitation Deduplicator checker unavailable. Retry later!");

      const existingCtcNumbers = (await this.ctcNumbersResponse.json()).map((item) => item.ctc_number);
      const existingElicitationNumbers = (await this.elicitationNumbersResponse.json()).map((item) => item.elicitation_number);

      const acceptedRows = [];
      const rejectedRows = [];
      const csvStream = csvParser({ headers: true });
      let isFirstRow = true;

      csvStream.on("data", (data) => {
        let isAccepted = true;
        let rejectionReason = "";

        // Process based on the upload type
        if (!isFirstRow && uploadType === "clients") {
          const ctcNumberFormatRegex = /^\d{2}-\d{2}-\d{4}-\d{6}$/;
          const indexCtcNumberColumnValue = data._0.trim();
          if (!indexCtcNumberColumnValue || !ctcNumberFormatRegex.test(indexCtcNumberColumnValue)) {
            rejectionReason = "Invalid CTC number";
            isAccepted = false;
          } else if (existingCtcNumbers.includes(indexCtcNumberColumnValue)) {
            rejectionReason = "Duplicate CTC number in clients file";
            isAccepted = false;
          }
        } else if (!isFirstRow && uploadType === "contacts") {
          const ctcNumberFormatRegex = /^\d{2}-\d{2}-\d{4}-\d{6}$/;
          const indexCtcNumberColumnValue = data._12.trim();
          const contactElicitationNumberColumnValue = data._13.trim();
          if (!existingCtcNumbers.includes(indexCtcNumberColumnValue)) {
            rejectionReason = "No matching index client CTC number in contacts file";
            isAccepted = false;
          } else if (!ctcNumberFormatRegex.test(indexCtcNumberColumnValue)) {
            rejectionReason = "Invalid CTC number";
            isAccepted = false;
          } else if (existingElicitationNumbers.includes(contactElicitationNumberColumnValue)) {
            rejectionReason = "Duplicate elicitation number, already uploaded!";
            isAccepted = false;
          }
        } else if (!isFirstRow && uploadType === "results") {
          const ctcNumberFormatRegex = /^\d{2}-\d{2}-\d{4}-\d{6}$/;
          const indexCtcNumberColumnValue = data._12;
          const contactElicitationNumberColumnValue = data._13;

          if (!existingCtcNumbers.includes(indexCtcNumberColumnValue)) {
            rejectionReason = "No matching index client CTC number in results file";
            isAccepted = false;
          } else if (!ctcNumberFormatRegex.test(indexCtcNumberColumnValue)) {
            rejectionReason = "Invalid CTC number";
            isAccepted = false;
          } else {
            // Check if the elicitation_number has results
            const elicitationData = existingElicitationNumbers.find((item) => item.elicitation_number === contactElicitationNumberColumnValue);

            // Only reject if has_results is true for this elicitation_number
            if (elicitationData && elicitationData.has_results) {
              rejectionReason = "Elicitation number has already been registered with results.";
              isAccepted = false;
            }
          }
        }

        // If the row is accepted, process it accordingly
        if (isAccepted) {
          // For accepted rows, add headings to the first row, and user details to subsequent rows
          if (isFirstRow) {
            // Add headings (to first accepted row)
            data.providerId = "providerId";
            data.team = "team";
            data.teamId = "teamId";
            data.locationId = "locationId";
            isFirstRow = false;
          } else {
            // Add user details for non-first rows
            data.providerId = req.decoded.data.providerId;
            data.team = req.decoded.data.team;
            data.teamId = req.decoded.data.teamId;
            data.locationId = req.decoded.data.locationId;
          }
          acceptedRows.push(data);
        } else {
          // For rejected rows, append the rejection reason in column 22 or beyond
          data._22 = rejectionReason;
          rejectedRows.push(data);
        }
      });

      csvStream.on("end", async () => {
        let uploadDirectory;

        switch (uploadType) {
          case "clients":
            uploadDirectory = "index_uploads";
            break;
          case "contacts":
            uploadDirectory = "contacts_uploads";
            break;
          case "results":
            uploadDirectory = "results_uploads";
            break;
          default:
            throw new Error(`Invalid upload type: ${uploadType}`);
        }

        if (acceptedRows.length > 0) {
          const filePath = join(__dirname, `../public/${uploadDirectory}`, originalFileName);
          const csvWriter = createObjectCsvWriter({
            path: filePath,
            header: Object.keys(acceptedRows[0]),
            alwaysQuote: true,
          });

          const uploadStatsData = {
            id: crypto.randomUUID(),
            user_base_entity_id: req.decoded.data.userBaseEntityId,
            username: req.decoded.data.providerId,
            uploaded_file: originalFileName,
            uploaded_file_type: uploadType,
            imported_rows: acceptedRows.length,
            rejected_rows: rejectedRows.length,
            upload_date: new Date(),
          };

          await uploadStats(uploadStatsData);
          await csvWriter.writeRecords(acceptedRows);
        }

        const clientFiles = await getFileTypeCount(req.decoded.data.providerId, "clients");
        const contactFiles = await getFileTypeCount(req.decoded.data.providerId, "contacts");
        const resultFiles = await getFileTypeCount(req.decoded.data.providerId, "results");
        const acceptedRecords = await getTotalImportedRecords(req.decoded.data.providerId);
        const rejectedRecords = await getTotalRejectedRecords(req.decoded.data.providerId);
        const lastUploadDate = await getLastUploadDate(req.decoded.data.providerId);

        const rejected = rejectedRows.length > 0;
        const payload = {
          token: null,
          authenticated: true,
          message: acceptedRows.length > 0 ? "File uploaded, processed, and saved successfully!" : "All rows were rejected.",
          rejected: rejected,
          rejectedRows: rejected ? rejectedRows.slice(1) : rejectedRows,
          stats: {
            clientFiles: clientFiles,
            contactFiles: contactFiles,
            resultFiles: resultFiles,
            acceptedRecords: acceptedRows.length > 0 ? acceptedRecords : 0,
            rejectedRecords: rejectedRecords,
            lastUploadDate: lastUploadDate,
          },
        };

        return response.api(req, res, acceptedRows.length > 0 ? 201 : 200, payload);
      });

      fileStream.pipe(csvStream);
    } catch (error) {
      console.error(error.message);
      next(error);
    }
  }
}

export default new UploadController();
