/**
 * @file api-helper.js
 * @module api-helper
 * @description Helper class for handling API responses.
 * @version 1.0.0
 * @author [Kizito S.M.]
 */

/**
 * Class representing the response handler for API responses.
 * @class
 */
class ResponseHandler {
  /**
   * Sends an API response.
   * @static
   * @async
   * @param {Object} req - The Express request object.
   * @param {Object} res - The Express response object.
   * @param {number} status - The HTTP status code for the response.
   * @param {Object|string} payload - The payload or message to be included in the response.
   * @returns {Promise<void>} A Promise that resolves when the response is sent.
   */
  static async api(req, res, status, payload) {
    /**
     * Sends an API response.
     * @param {Object} req - The Express request object.
     * @param {Object} res - The Express response object.
     * @param {number} [status=200] - The HTTP status code for the response.
     * @param {Object|string} [payload=""] - The payload or message to be included in the response.
     */
    res.status(status || 200).json({
      success: true,
      request: req.path,
      payload: payload || "",
    });
  }
}

// Export the ResponseHandler class
export default ResponseHandler;
