/**
 * @file error-helper.js
 * @module error-helper
 * @description Class for logging errors using Winston.
 * @version 1.0.0
 * @author [Kizito S.M.]
 */

import winston from "winston";

/**
 * Class representing a custom error logger.
 * @class
 */
class CustomErrorLogger {
  /** @type {winston.Logger} */
  logger;

  /**
   * Creates a new instance of CustomErrorLogger.
   * @constructor
   */
  constructor() {
    /** @type {winston.Logger} */
    this.logger = winston.createLogger({
      level: "info",
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      transports: [
        new winston.transports.File({ filename: "logs/error.log", level: "error" }),
        new winston.transports.File({ filename: "logs/app.log", level: "info" }),
        new winston.transports.Console({ level: "info" }),
      ],
    });
  }

  /**
   * Logs an error using the configured logger.
   * @method
   * @async
   * @param {Error} err - The error object.
   * @returns {Promise<void>}
   */
  async logError(err) {
    // Call the error logger method
    await this.errorLogger(err);
  }

  /**
   * Logs an error message.
   * @method
   * @async
   * @param {Error} err - The error object.
   * @returns {Promise<void>}
   */
  async errorLogger(err) {
    // Log an info message indicating that an error has occurred
    this.logger.info("An error has occurred");
  }
}

// Export the CustomErrorLogger class
export default CustomErrorLogger;
