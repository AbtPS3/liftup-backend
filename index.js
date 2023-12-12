/**
 * @file index.js
 * @module index
 * @description Entry point for the UCS Uploader application.
 * @version 1.0.0
 * @author Kizito S.M.
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import ErrorHandler from "./helpers/error-handler.js";
import AuthenticateJwt from "./middleware/authenticate-jwt.js";
import uploadRouter from "./routes/upload-router.js";

/**
 * Class representing the UCS Uploader application server.
 * @class
 */
class AppServer {
  /**
   * Constructor for AppServer.
   * @constructor
   */
  constructor() {
    // Initialize Express application
    this.app = express();
    // Set the port from the environment variable or default to 3000
    this.port = process.env.NODE_PORT || 3000;
    // Authentication middleware
    this.auth = AuthenticateJwt;

    // Initialize middleware
    this.initializeMiddleware();
    // Initialize routes
    this.initializeRoutes();
    // Initialize error handling
    this.initializeErrorHandling();
  }

  /**
   * Initialize middleware for the Express application.
   * @private
   */
  initializeMiddleware() {
    // Disable x-powered-by header
    this.app.disable("x-powered-by");
    // Parse JSON requests
    this.app.use(express.json());
    // Parse URL-encoded requests
    this.app.use(express.urlencoded({ extended: false }));
    // Enable Cross-Origin Resource Sharing (CORS)
    this.app.use(cors());
  }

  /**
   * Initialize routes for the Express application.
   * @private
   */
  async initializeRoutes() {
    // Get the current module's URL
    const currentModuleURL = new URL(import.meta.url);

    // Mount the uploadRouter at /api/v1/uploads
    this.app.use("/api/v1/uploads", uploadRouter);
  }

  /**
   * Initialize error handling for the Express application.
   * @private
   */
  initializeErrorHandling() {
    // Create an instance of the ErrorHandler class
    const errorHandlerInstance = new ErrorHandler();

    // Custom error handling middleware
    this.app.use((err, req, res, next) => {
      errorHandlerInstance.handleError(err, req, res, next);
    });
  }

  /**
   * Start the Express application server.
   */
  start() {
    // Listen on the specified port
    this.app.listen(this.port, () => {
      console.log("INFO: UCS Uploader is listening on " + this.port);
    });
  }
}

// Create an instance of the AppServer class and start the server
const appServer = new AppServer();
appServer.start();

// Export the AppServer class
export default AppServer;
