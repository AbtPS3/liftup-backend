/**
 * @file error-handler.js
 * @module error-handler
 * @description Class for handling errors and generating appropriate responses.
 * @version 1.0.1
 * @author [Kizito S.M.]
 */

import CustomErrorLogger from "./custom-error-logger.js";

/**
 * Class representing an error handler.
 * @class
 */
class ErrorHandler {
  /** @type {CustomErrorLogger} */
  errorLogger;

  /**
   * Creates a new instance of ErrorHandler.
   * @constructor
   */
  constructor() {
    /** @type {CustomErrorLogger} */
    this.errorLogger = new CustomErrorLogger();
  }

  /**
   * Handles errors and sends an appropriate response to the client.
   * @method
   * @async
   * @param {Error} err - The error object.
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   * @param {Function} next - The next function in the middleware chain.
   * @returns {Promise<void>}
   */
  async handleError(err, req, res, next) {
    try {
      // Log the error using the custom logger
      await this.errorLogger.logError(err);

      // Check if the request is authenticated
      const authenticated = req.decoded ? true : false;

      // Create a response payload
      const payload = {
        token: null,
        authenticated: authenticated,
        message: err.message,
        stack: err.stack,
      };

      // Send the error response to the client
      res.status(err.statusCode || 500).json({
        success: false,
        request: req.path,
        payload: payload,
      });
    } catch (error) {
      // Call the next middleware with the error
      next(error);
    }
  }
}

// Export the ErrorHandler class
export default ErrorHandler;
