/**
 * @file custom-error.js
 * @module custom-error
 * @description Custom error class extending the built-in Error class.
 * @version 1.0.1
 * @author [Kizito S.M.]
 */

/**
 * Class representing a custom error with an associated HTTP status code.
 * @class
 * @extends Error
 */
class CustomError extends Error {
  /**
   * Creates a new instance of CustomError.
   * @constructor
   * @param {string} message - The error message.
   * @param {number} statusCode - The HTTP status code associated with the error.
   */
  constructor(message, statusCode) {
    /**
     * The error message.
     * @member {string}
     */
    super(message);

    /**
     * The HTTP status code associated with the error.
     * @member {number}
     */
    this.statusCode = statusCode;
  }
}

// Export the CustomError class
export default CustomError;
