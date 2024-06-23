/**
 * @file dashboard-router-v2.js
 * @module dashboard-router
 * @description V2 Express router for handling dashboard routes.
 * @version 1.0.2
 * @author Kizito S.M.
 */

import dotenv from "dotenv";
dotenv.config();
import { Router } from "express";
import basicAuth from "express-basic-auth";

import DashboardControllerV2 from "../controllers/dashboard-controller-v2.js";
import authenticationController from "../controllers/authentication-controller.js";

/**
 * Express router for handling authentication routes.
 * @type {Router}
 */
const router = Router();

// Configure basic authentication
const users = await authenticationController.getUsers();
const unauthorizedResponse = await authenticationController.getUnauthorizedResponse();

// Initialize auth usage
router.use(
  basicAuth({
    users: users,
    challenge: true, // Displays login dialog
    unauthorizedResponse: unauthorizedResponse,
  })
);

router.post("/count-index-clients", DashboardControllerV2.countIndexClients);
router.post("/count-elicitations", DashboardControllerV2.countElicitations);
router.post("/count-outcomes", DashboardControllerV2.countOutcomes);

// Export the router
export default router;
