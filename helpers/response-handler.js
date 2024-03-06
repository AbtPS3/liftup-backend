import CustomErrorLogger from "./custom-error-logger.js";

/**
 * @file response-handler.js
 * @module response-handler
 * @description Helper class for handling API responses.
 * @version 1.0.1
 * @author [Kizito S.M.]
 */

class ResponseHandler {
  infoLogger;

  constructor() {}

  static async api(req, res, status, payload) {
    // Log every response action
    const infoLogger = new CustomErrorLogger();
    var ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const info = `Client ${ip} has accessed ${req.path}`;
    await infoLogger.logInfo(info);

    res.status(status || 200).json({
      success: true,
      request: req.path,
      payload: payload || "",
    });
  }
}

// Export the ResponseHandler class
export default ResponseHandler;
