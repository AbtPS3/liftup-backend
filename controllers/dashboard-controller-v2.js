/**
 * @file dashboard-controller-v2.js
 * @module controllers/dashboard-controller
 * @description Version 2 Controller class for handling export of data to LIFT UP Dashboard.
 * @version 1.0.2
 * @author Kizito S.M.
 */

import response from "../helpers/response-handler.js";
import DashboardServiceV2 from "../services/dashboard-service-v2.js";

/**
 * Controller class for handling export of data to LIFT UP Dashboard.
 * @class
 */
class DashboardControllerV2 {
  /**
   * Constructor for DashboardControllerV2.
   * @constructor
   */
  constructor() {
    this.dashboardService = new DashboardServiceV2();
    this.countIndexClients = this.countIndexClients.bind(this);
    this.countElicitations = this.countElicitations.bind(this);
    this.countOutcomes = this.countOutcomes.bind(this);
  }

  /**
   * Handles requests to count index clients, grouped by location.
   * @async
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   * @returns {Promise<Object>} - JSON response containing grouped index clients data.
   */
  async countIndexClients(req, res, next) {
    try {
      const { location, startDate, endDate } = req.body;
      const clients = await this.dashboardService.countIndexClients(location, startDate, endDate);
      return response.api(req, res, 200, clients);
    } catch (error) {
      console.error("ERROR GETTING INDEX CLIENTS: \n", error.message);
      next(error);
    }
  }

  /**
   * Handles requests to count elicitations, grouped by location.
   * @async
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   * @returns {Promise<Object>} - JSON response containing grouped elicitations data.
   */
  async countElicitations(req, res, next) {
    try {
      const { location, startDate, endDate } = req.body;
      const elicitations = await this.dashboardService.countElicitations(
        location,
        startDate,
        endDate
      );
      return response.api(req, res, 200, elicitations);
    } catch (error) {
      console.error("ERROR GETTING ELICITATIONS: \n", error.message);
      next(error);
    }
  }

  /**
   * Handles requests to count outcomes, grouped by location.
   * @async
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   * @returns {Promise<Object>} - JSON response containing grouped outcomes data.
   */
  async countOutcomes(req, res, next) {
    try {
      const { location, startDate, endDate } = req.body;
      const outcomes = await this.dashboardService.countOutcomes(location, startDate, endDate);
      return response.api(req, res, 200, outcomes);
    } catch (error) {
      console.error("ERROR GETTING OUTCOMES: \n", error.message);
      next(error);
    }
  }
}

export default new DashboardControllerV2();
