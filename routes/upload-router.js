/**
 * @file upload-router.js
 * @module upload-router
 * @description Express router for handling file uploads and related routes.
 * @version 1.0.1
 * @author Kizito S.M.
 */

import { Router } from "express";
import multer from "multer";
import AuthenticateJwt from "../middlewares/authenticate-jwt.js";
import UploadController from "../controllers/upload-controller-2.js";

/**
 * Express router for handling file uploads and related routes.
 * @type {Router}
 */
const router = Router();

// Instance of AuthenticateJwt middleware for decoding and verifying JWT tokens
const authMiddleware = new AuthenticateJwt();

// Multer configuration for handling file uploads
const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const allowedMimes = ["text/csv", "application/vnd.ms-excel"]; // Add more MIME types if needed
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only CSV files are allowed!"), false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

/**
 * Route for handling root path requests.
 * @name GET /
 * @function
 * @async
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 * @returns {Promise<void>}
 */
router.get("/", UploadController.all);

/**
 * Route for uploading files.
 * @name POST /
 * @function
 * @async
 * @middleware {Function} authMiddleware.decode - Middleware for decoding and verifying JWT tokens.
 * @middleware {Function} upload.single("file") - Middleware for handling single file uploads.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 * @returns {Promise<void>}
 */
router.post("/", upload.single("file"), authMiddleware.decode, UploadController.create);

// Export the router
export default router;
