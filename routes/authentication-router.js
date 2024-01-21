/**
 * @file authentication-router.js
 * @module authentication-router
 * @description Express router for handling authentication routes.
 * @version 1.0.1
 * @author Kizito S.M.
 */

import { Router } from "express";
import AuthenticateJwt from "../middlewares/authenticate-jwt.js";
import AuthenticationController from "../controllers/authentication-controller.js";

/**
 * Express router for handling authentication routes.
 * @type {Router}
 */
const router = Router();

// Instance of AuthenticateJwt middleware for decoding and verifying JWT tokens
const authMiddleware = new AuthenticateJwt();

/**
 * Route for handling login requests.
 * @name POST /login
 * @function
 * @async
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 * @returns {Promise<void>}
 */
router.post("/login", AuthenticationController.login);

/**
 * Route for handling protected path requests.
 * @name GET /protected
 * @function
 * @async
 * @middleware {Function} authMiddleware.decode - Middleware for decoding and verifying JWT tokens.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 * @returns {Promise<void>}
 */
router.get("/protected", authMiddleware.decode, AuthenticationController.protected);

// Export the router
export default router;
