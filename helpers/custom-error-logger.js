/**
 * @file custom-error-logger.js
 * @module custom-error-logger
 * @description Class for logging errors using Winston.
 * @version 1.0.1
 * @author [Kizito S.M.]
 */

import winston from "winston";

class CustomErrorLogger {
  /** @type {winston.Logger} */
  infoLogger;
  errorLogger;

  constructor() {
    this.infoLogger = winston.createLogger({
      level: "info",
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      transports: [
        new winston.transports.File({ filename: "logs/app.log", level: "info" }),
        new winston.transports.Console({ level: "info" }),
      ],
    });

    this.errorLogger = winston.createLogger({
      level: "error",
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      transports: [
        new winston.transports.File({ filename: "logs/error.log", level: "error" }),
        new winston.transports.Console({ level: "error" }),
      ],
    });
  }

  async logError(err) {
    // Call the error logger method
    await this.logger(err);
  }

  async logInfo(info) {
    // Call the error logger method
    await this.action(info);
  }

  async logger(err) {
    // Log an info message indicating that an error has occurred
    this.errorLogger.error("ERROR:" + err.message);
    console.error(err);
  }

  async action(info) {
    // Log an info message indicating that an error has occurred
    this.infoLogger.info("ACTION:" + info);
  }
}

// Export the CustomErrorLogger class
export default CustomErrorLogger;
