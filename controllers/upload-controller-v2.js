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
          timeoutPromise(10000, "UCS checker services unavailable"),
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
      let rejectionReason = "";

      csvStream.on("data", (data) => {
        if (uploadType === "clients") {
          const ctcNumberFormatRegex = /^\d{2}-\d{2}-\d{4}-\d{6}$/;
          // Check if CTC number exists and if it follows the valid format for the 'clients' upload type
          if (!data._0 || !ctcNumberFormatRegex.test(data._0)) {
            rejectionReason = "Invalid CTC number";
            data.rejectionReason = rejectionReason;
            rejectedRows.push(data);
          }

          // Check if ctcNumber is in existingCtcNumbers for 'clients' uploadType
          if (existingCtcNumbers.includes(data._0)) {
            rejectionReason = "Duplicate CTC number in clients file";
            data.rejectionReason = rejectionReason;
            rejectedRows.push(data);
          }
        }

        // Check for 'contacts' uploadType and matching index CTC Number
        else if (uploadType === "contacts") {
          const indexCtcNumberColumnValue = data._12.trim();
          // Check for matching index CTC Number, if none reject the record
          if (!existingCtcNumbers.includes(indexCtcNumberColumnValue)) {
            rejectionReason = "No matching index client CTC number in contacts file";
            data.rejectionReason = rejectionReason;
            rejectedRows.push(data);
            return;
          }

          const ctcNumberFormatRegex = /^\d{2}-\d{2}-\d{4}-\d{6}$/;
          // Check if CTC number exists and if it follows the valid format for the 'clients' upload type
          if (!indexCtcNumberColumnValue || !ctcNumberFormatRegex.test(indexCtcNumberColumnValue)) {
            rejectionReason = "Invalid CTC number";
            data.rejectionReason = rejectionReason;
            rejectedRows.push(data);
          }

          const elicitationNumberColumnValue = data._13;
          const elicitationExists = existingElicitationNumbers.includes(elicitationNumberColumnValue);
          // Check if contact elicitation number is in existing elicitations, if YES reject it
          if (elicitationExists) {
            rejectionReason = "Duplicate elicitation number, already uploaded!";
            data.rejectionReason = rejectionReason;
            rejectedRows.push(data);
            return;
          }
        } else if (uploadType === "results") {
          const indexCtcNumberColumnValue = data._12;
          // Check for matching index CTC Number, if none reject the record
          if (!existingCtcNumbers.includes(indexCtcNumberColumnValue)) {
            rejectionReason = "No matching index client CTC number in results file";
            data.rejectionReason = rejectionReason;
            rejectedRows.push(data);
          }

          const ctcNumberFormatRegex = /^\d{2}-\d{2}-\d{4}-\d{6}$/;
          // Check if CTC number exists and if it follows the valid format for the 'clients' upload type
          if (!indexCtcNumberColumnValue || !ctcNumberFormatRegex.test(indexCtcNumberColumnValue)) {
            rejectionReason = "Invalid CTC number";
            data.rejectionReason = rejectionReason;
            rejectedRows.push(data);
          }

          const elicitationData = existingElicitationNumbers.find((item) => item === data._13);
          // Check if elicitation number already has results. If it has, reject it
          if (elicitationData) {
            rejectionReason = "Elicitation number has already been registered with results.";
            data.rejectionReason = rejectionReason;
            rejectedRows.push(data);
          }
        }
        // Processing for accepted rows
        else {
          if (isFirstRow) {
            data.providerId = "providerId";
            data.team = "team";
            data.teamId = "teamId";
            data.locationId = "locationId";
            isFirstRow = false;
          } else {
            data.providerId = req.decoded.data.providerId;
            data.team = req.decoded.data.team;
            data.teamId = req.decoded.data.teamId;
            data.locationId = req.decoded.data.locationId;
          }
          acceptedRows.push(data);
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
