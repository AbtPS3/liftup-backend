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

      const [ctcNumbersResponse, elicitationNumbersResponse] = await Promise.all([fetch(ctcNumbersEndpoint), fetch(elicitationNumbersEndpoint)]);

      if (!ctcNumbersResponse.ok) throw new Error("CTC Deduplicator checker unavailable. Retry later!");
      if (!elicitationNumbersResponse.ok) throw new Error("Elicitation Deduplicator checker unavailable. Retry later!");

      const existingCtcNumbers = (await ctcNumbersResponse.json()).map((item) => item.ctc_number);
      const existingElicitationNumbers = (await elicitationNumbersResponse.json()).map((item) => item.elicitation_number);

      const acceptedRows = [];
      const rejectedRows = [];
      const csvStream = csvParser({ headers: true });
      let isFirstRow = true;

      csvStream.on("data", (row) => {
        console.log("Processing row: ", row); // Log each row
        let rejectionReason = "";

        // Check for duplicate CTC numbers in 'clients' files
        if (uploadType === "clients" && existingCtcNumbers.includes(row._0)) {
          rejectionReason = "Duplicate CTC number in clients file";
        }

        // Check for matching CTC number in 'contacts', if none reject the record
        else if (uploadType === "contacts") {
          const indexCtcNumberColumnValue = row._12;
          const elicitationNumberColumnValue = row._13;
          const elicitationExists = existingElicitationNumbers.some((item) => item.elicitation_number === elicitationNumberColumnValue);

          // Check for matching index CTC Number, if none reject the record
          if (!existingCtcNumbers.includes(indexCtcNumberColumnValue)) {
            rejectionReason = "No matching index client CTC number in contacts file";
          }

          // Check if contact elicitation number column calue is in exisiting elicitations, if YES reject it
          if (elicitationExists) {
            rejectionReason = "Duplicate elicitation number, already uploaded!";
          }
        }

        // Check if the file is 'results'
        else if (uploadType === "results") {
          const indexCtcNumberColumnValue = row._12;
          const elicitationData = existingElicitationNumbers.find((item) => item.elicitation_number === row._13);
          // Check for matching index CTC Number, if none reject the record
          if (!existingCtcNumbers.includes(indexCtcNumberColumnValue)) {
            rejectionReason = "No matching index client CTC number in results file";
          }
          // Check if elicitation number already has results. If it has, reject it
          if (elicitationData && elicitationData.has_results) {
            rejectionReason = "Elicitation number has already been registered with results.";
          }
        }

        // If a rejection reason is found, add to rejectedRows array
        if (rejectionReason) {
          row.rejectionReason = rejectionReason;
          console.log("Rejected row data: ", row); // Add this line
          rejectedRows.push(row);
          console.log("*** REJECTED ROWS ***", rejectedRows); // Check after push
        } else {
          // Processing for accepted rows
          if (isFirstRow) {
            row.providerId = "providerId";
            row.team = "team";
            row.teamId = "teamId";
            row.locationId = "locationId";
            isFirstRow = false;
          } else {
            row.providerId = req.decoded.data.providerId;
            row.team = req.decoded.data.team;
            row.teamId = req.decoded.data.teamId;
            row.locationId = req.decoded.data.locationId;
          }
          acceptedRows.push(row);
        }
      });

      csvStream.on("end", async () => {
        if (acceptedRows.length > 0) {
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

          const clientFiles = await getFileTypeCount(await req.decoded.data.providerId, "clients");
          const contactFiles = await getFileTypeCount(await req.decoded.data.providerId, "contacts");
          const resultFiles = await getFileTypeCount(await req.decoded.data.providerId, "results");
          const acceptedRecords = await getTotalImportedRecords(await req.decoded.data.providerId);
          const rejectedRecords = await getTotalRejectedRecords(await req.decoded.data.providerId);
          const lastUploadDate = await getLastUploadDate(await req.decoded.data.providerId);

          const rejected = rejectedRows.length > 0;
          const payload = {
            token: null,
            authenticated: true,
            message: "File uploaded, processed, and saved successfully!",
            rejected: rejected,
            rejectedRows: rejected ? rejectedRows.slice(1) : rejectedRows,
            stats: {
              clientFiles: clientFiles,
              contactFiles: contactFiles,
              resultFiles: resultFiles,
              acceptedRecords: acceptedRecords,
              rejectedRecords: rejectedRecords,
              lastUploadDate: lastUploadDate,
            },
          };

          return response.api(req, res, 201, payload);
        } else {
          throw new CustomError("All rows were rejected.", 400);
        }
      });

      fileStream.pipe(csvStream);
    } catch (error) {
      console.error(error.message);
      next(error);
    }
  }
}

export default new UploadController();
