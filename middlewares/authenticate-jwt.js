/**
 * @file authenticate-jwt.js
 * @module authenticate-jwt
 * @description Class for decoding and authenticating JWT tokens.
 * @version 1.0.0
 * @author Kizito S.M.
 */

import jwt from "jsonwebtoken";
import CustomError from "../helpers/custom-error.js";

const secret = process.env.JWT_SECRET;

/**
 * Class representing JWT token authentication.
 * @class
 */
class AuthenticateJwt {
  /**
   * Creates a new instance of AuthenticateJwt.
   * @constructor
   */
  constructor() {
    this.secret = process.env.JWT_SECRET;
  }

  /**
   * Decodes and verifies the provided JWT token.
   * @method
   * @async
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   * @returns {Promise<void>}
   */
  async decode(req, _res, next) {
    try {
      // Extract the token from the request headers
      let token = req.headers["x-access-token"] || req.headers["authorization"];

      // Check if the token is not provided
      if (!token) {
        throw new CustomError("Auth token is not supplied.", 401);
      }

      // Remove the 'Bearer ' prefix if present
      if (token.startsWith("Bearer ")) {
        token = token.slice(7, token.length);
      }

      // Check if token is still not provided after removing the prefix
      if (!token) {
        throw new CustomError("Token not provided!", 401);
      }

      // Verify and decode the JWT token using the secret
      const decoded = jwt.verify(token, secret);

      // Attach the decoded payload to the request object
      req.decoded = decoded;

      // @TODO: Remove this in PROD
      console.log("DECODED REQ\n", req.decoded);

      // Move to the next middleware
      next();
    } catch (error) {
      console.error(error.message);
      next(error);
    }
  }
}

// Export the AuthenticateJwt class
export default AuthenticateJwt;
