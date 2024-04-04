/**
 * @file dashboard-router.js
 * @module dashboard-router
 * @description Express router for handling authentication routes.
 * @version 1.0.1
 * @author Kizito S.M.
 */

import dotenv from "dotenv";
dotenv.config();
import { Router } from "express";
import basicAuth from "express-basic-auth";

import DashboardController from "../controllers/dashboard-controller.js";
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

router.get("/rawelicitations", DashboardController.rawElicitations);
router.get("/countelicitations", DashboardController.getElicitations);
router.get("/rawoutcomes", DashboardController.rawOutcomes);
router.get("/countoutcomes", DashboardController.getOutcomes);
router.get("/rawindexclients", DashboardController.getIndexClients);
router.get("/countindexclients", DashboardController.countIndexClients);

// Export the router
export default router;
