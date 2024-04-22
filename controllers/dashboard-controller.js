/**
 * @file dashboard-controller.js
 * @module controllers/dashboard-controller
 * @description Controller class for handling export of data to LIFT UP Dashboard.
 * @version 1.0.1
 * @author Kizito S.M.
 */

import { PrismaClient, Prisma } from "@prisma/client";
import dotenv from "dotenv";

import response from "../helpers/response-handler.js";
import ce from "../helpers/count-elicitations.js";
import co from "../helpers/count-outcomes.js";
import DateCalculator from "../helpers/calculate-age.js";
// import countElicitations from "../helpers/count-elicitations.js";

dotenv.config();

BigInt.prototype.toJSON = function () {
  return this.toString();
};

const prisma = new PrismaClient();

/**
 * Controller class for handling export of data to LIFT UP Dashboard.
 * @class
 */
class DashboardController {
  /**
   * Constructor for DashboardController.
   * @constructor
   */
  constructor() {}

  /**
   * Handles requests to the root path.
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   * @returns {Object} - JSON response containing the message and authentication status.
   */
  async rawElicitations(req, res, next) {
    try {
      const allElicitations = await prisma.elicitation.findMany();
      return response.api(req, res, 200, [...allElicitations]);
    } catch (error) {
      console.error(error.message);
      next(error);
    }
  }

  async rawOutcomes(req, res, next) {
    try {
      const allOutcomes = await prisma.test_outcome.findMany();
      return response.api(req, res, 200, [...allOutcomes]);
    } catch (error) {
      console.error(error.message);
      next(error);
    }
  }

  async rawIndexClients(req, res, next) {
    try {
      const indexClients = await prisma.index_client.findMany({
        where: {
          ucs_registration_date: {
            gte: "2024-04-01",
          },
        },
      });
      return response.api(req, res, 200, [...indexClients]);
    } catch (error) {
      console.error(error.message);
      next(error);
    }
  }

  async countIndexClients(req, res, next) {
    const { locationid, startdate, enddate } = req.query;
    try {
      const location = await prisma.locations.findFirst({
        where: {
          hfr_code: locationid,
          region_name: {
            in: ["Mbeya Region", "Mwanza Region", "Dodoma Region", "Dar es Salaam Region"],
          },
        },
        select: {
          location_uuid: true,
        },
      });

      if (!location) {
        return "Location not found";
      }

      // Calculate the total number of days in the date range
      const totalDays = Math.ceil(
        (new Date(enddate) - new Date(startdate)) / (1000 * 60 * 60 * 24)
      );

      // Limit search queries to 31 days to manage server resources
      if (totalDays > 31) {
        throw new Error("Date range too long, maximum 31 days allowed!");
      }

      // Initialize an object to store counts for each day
      const countsByDay = {};

      // Loop through each day in the date range
      for (let i = 0; i < totalDays + 1; i++) {
        const currentDate = new Date(startdate);
        currentDate.setDate(currentDate.getDate() + i);

        const formattedDate = currentDate.toISOString().slice(0, 10);

        // Query to count all index clients
        const countAllIndices = await prisma.index_client.count({
          where: {
            location_id: location.location_uuid,
            sex: "Female",
            date_of_birth: {
              lt: DateCalculator.calculateBirthDate(14),
            },
            ucs_registration_date: {
              gte: formattedDate,
              lt: new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // Next day
            },
          },
        });

        // Query to count imported clients for the current day
        const countCtcIndices = await prisma.index_client.count({
          where: {
            location_id: location.location_uuid,
            sex: "Female",
            date_of_birth: {
              lt: DateCalculator.calculateBirthDate(14),
            },
            ucs_registration_date: {
              gte: formattedDate,
              lt: new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // Next day
            },
            data_source: "ctc_import",
          },
        });

        // Count reached clients
        const countReachedIndexClientsResult = await prisma.index_client.count({
          where: {
            location_id: location.location_uuid,
            sex: "Female",
            elicitation: {
              some: {},
            },
            ucs_registration_date: {
              gte: formattedDate, // Assuming formattedDate is in the format "YYYY-MM-DD"
              lt: new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // Next day
            },
            date_of_birth: {
              lt: DateCalculator.calculateBirthDate(14),
            },
          },
        });

        // Query to count unreached index clients for the current day
        const countUnreachedIndexClientsResult = await prisma.index_client.count({
          where: {
            location_id: location.location_uuid,
            sex: "Female",
            elicitation: {
              none: {},
            },
            ucs_registration_date: {
              gte: formattedDate, // Assuming formattedDate is in the format "YYYY-MM-DD"
              lt: new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // Next day
            },
            date_of_birth: {
              lt: DateCalculator.calculateBirthDate(14),
            },
          },
        });

        const countElicitedContacts = await prisma.elicitation.count({
          where: {
            location_id: location.location_uuid,
            elicitation_date: {
              gte: formattedDate,
              lt: new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // Next day
            },
            date_of_birth: {
              gt: DateCalculator.calculateBirthDate(19),
            },
          },
        });

        countsByDay[formattedDate] = {
          totalClients: countAllIndices,
          ctcClients: countCtcIndices,
          ucsClients: countAllIndices - countCtcIndices,
          reachedClients: countReachedIndexClientsResult,
          unreachedClients: countUnreachedIndexClientsResult,
          elicitedContacts: countElicitedContacts,
        };
      }

      return response.api(req, res, 200, countsByDay);
    } catch (error) {
      console.error(error.message);
      next(error);
    }
  }

  async getOutcomes(req, res, next) {
    try {
      const startDate = req.query.startdate;
      const endDate = req.query.enddate;
      const locationId = req.query.locationid;
      const payloadArray = [
        {
          testOutcomesDate: new Date().toISOString().split("T", 1)[0],
          facilityHFRCode: locationId,
          paediatricTestOutcomes: [],
        },
      ];

      const paediatricTestOutcomesArray = payloadArray[0].paediatricTestOutcomes;

      // Calculate the total number of days in the date range
      const totalDays = Math.ceil(
        (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
      );

      // Limit search queries to 31 days to manage server resources
      if (totalDays > 31) {
        throw new Error("Date range too long, maximum 31 days allowed!");
      }

      // Loop through each day in the date range
      for (let i = 0; i < totalDays + 1; i++) {
        // Initialize an object to store counts for each day
        const countsByDay = [];

        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);

        const formattedDate = currentDate.toISOString().slice(0, 10);

        countsByDay.push(
          // 0 -4 (less than 5)
          await co.getAll(
            "facility",
            "Female",
            0,
            4,
            "non_biological_child",
            startDate,
            endDate,
            locationId
          ),
          await co.getAll(
            "facility",
            "Female",
            0,
            4,
            "biological_child",
            startDate,
            endDate,
            locationId
          ),
          await co.getAll(
            "community",
            "Female",
            0,
            4,
            "non_biological_child",
            startDate,
            endDate,
            locationId
          ),
          await co.getAll(
            "community",
            "Female",
            0,
            4,
            "biological_child",
            startDate,
            endDate,
            locationId
          ),
          await co.getAll(
            "facility",
            "Male",
            0,
            4,
            "non_biological_child",
            startDate,
            endDate,
            locationId
          ),
          await co.getAll(
            "facility",
            "Male",
            0,
            4,
            "biological_child",
            startDate,
            endDate,
            locationId
          ),
          await co.getAll(
            "community",
            "Male",
            0,
            4,
            "non_biological_child",
            startDate,
            endDate,
            locationId
          ),
          await co.getAll(
            "community",
            "Male",
            0,
            4,
            "biological_child",
            startDate,
            endDate,
            locationId
          ),

          // 5 - 9
          await co.getAll(
            "facility",
            "Female",
            5,
            9,
            "non_biological_child",
            startDate,
            endDate,
            locationId
          ),
          await co.getAll(
            "facility",
            "Female",
            5,
            9,
            "biological_child",
            startDate,
            endDate,
            locationId
          ),
          await co.getAll(
            "community",
            "Female",
            5,
            9,
            "non_biological_child",
            startDate,
            endDate,
            locationId
          ),
          await co.getAll(
            "community",
            "Female",
            5,
            9,
            "biological_child",
            startDate,
            endDate,
            locationId
          ),
          await co.getAll(
            "facility",
            "Male",
            5,
            9,
            "non_biological_child",
            startDate,
            endDate,
            locationId
          ),
          await co.getAll(
            "facility",
            "Male",
            5,
            9,
            "biological_child",
            startDate,
            endDate,
            locationId
          ),
          await co.getAll(
            "community",
            "Male",
            5,
            9,
            "non_biological_child",
            startDate,
            endDate,
            locationId
          ),
          await co.getAll(
            "community",
            "Male",
            5,
            9,
            "biological_child",
            startDate,
            endDate,
            locationId
          ),

          // 10 - 14
          await co.getAll(
            "facility",
            "Female",
            10,
            14,
            "non_biological_child",
            startDate,
            endDate,
            locationId
          ),
          await co.getAll(
            "facility",
            "Female",
            10,
            14,
            "biological_child",
            startDate,
            endDate,
            locationId
          ),
          await co.getAll(
            "community",
            "Female",
            10,
            14,
            "non_biological_child",
            startDate,
            endDate,
            locationId
          ),
          await co.getAll(
            "community",
            "Female",
            10,
            14,
            "biological_child",
            startDate,
            endDate,
            locationId
          ),
          await co.getAll(
            "facility",
            "Male",
            10,
            14,
            "non_biological_child",
            startDate,
            endDate,
            locationId
          ),
          await co.getAll(
            "facility",
            "Male",
            10,
            14,
            "biological_child",
            startDate,
            endDate,
            locationId
          ),
          await co.getAll(
            "community",
            "Male",
            10,
            14,
            "non_biological_child",
            startDate,
            endDate,
            locationId
          ),
          await co.getAll(
            "community",
            "Male",
            10,
            14,
            "biological_child",
            startDate,
            endDate,
            locationId
          ),

          // 15 - 19
          await co.getAll(
            "facility",
            "Female",
            15,
            19,
            "non_biological_child",
            startDate,
            endDate,
            locationId
          ),
          await co.getAll(
            "facility",
            "Female",
            15,
            19,
            "biological_child",
            startDate,
            endDate,
            locationId
          ),
          await co.getAll(
            "community",
            "Female",
            15,
            19,
            "non_biological_child",
            startDate,
            endDate,
            locationId
          ),
          await co.getAll(
            "community",
            "Female",
            15,
            19,
            "biological_child",
            startDate,
            endDate,
            locationId
          ),
          await co.getAll(
            "facility",
            "Male",
            15,
            19,
            "non_biological_child",
            startDate,
            endDate,
            locationId
          ),
          await co.getAll(
            "facility",
            "Male",
            15,
            19,
            "biological_child",
            startDate,
            endDate,
            locationId
          ),
          await co.getAll(
            "community",
            "Male",
            15,
            19,
            "non_biological_child",
            startDate,
            endDate,
            locationId
          ),
          await co.getAll(
            "community",
            "Male",
            15,
            19,
            "biological_child",
            startDate,
            endDate,
            locationId
          )
        );
      }

      const results = {};
      results["date"] = formattedDate;
      results["outcomes"] = countsByDay;

      // Query goes here
      paediatricTestOutcomesArray.push(results);

      // Send the payload back
      return response.api(req, res, 200, [...payloadArray]);
    } catch (error) {
      console.error(error.message);
      next(error);
    }
  }

  async getElicitations(req, res, next) {
    try {
      const { startdate: startDate, enddate: endDate, locationid: locationId } = req.query;
      const payloadArray = [
        {
          submissionDate: new Date().toISOString().split("T", 1)[0],
          facilityHFRCode: locationId,
          paediatricContacts: [],
        },
      ];

      const paediatricContactsArray = payloadArray[0].paediatricContacts;

      // Calculate the total number of days in the date range
      const totalDays = Math.ceil(
        (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
      );

      // Limit search queries to 31 days to manage server resources
      if (totalDays > 31) {
        throw new Error("Date range too long, maximum 31 days allowed!");
      }

      // Loop through each day in the date range
      for (let i = 0; i < totalDays + 1; i++) {
        // Initialize an object to store counts for each day
        const countsByDay = [];

        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);

        const formattedDate = currentDate.toISOString().slice(0, 10);

        countsByDay.push(
          await ce.getAll(
            "Male",
            0,
            4,
            "biological_child",
            formattedDate,
            new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            locationId
          ),
          await ce.getAll(
            "Male",
            0,
            4,
            "non_biological_child",
            formattedDate,
            new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            locationId
          ),
          await ce.getAll(
            "Male",
            5,
            9,
            "biological_child",
            formattedDate,
            new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            locationId
          ),
          await ce.getAll(
            "Male",
            5,
            9,
            "non_biological_child",
            formattedDate,
            new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            locationId
          ),
          await ce.getAll(
            "Male",
            10,
            14,
            "biological_child",
            formattedDate,
            new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            locationId
          ),
          await ce.getAll(
            "Male",
            10,
            14,
            "non_biological_child",
            formattedDate,
            new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            locationId
          ),
          await ce.getAll(
            "Male",
            15,
            19,
            "biological_child",
            formattedDate,
            new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            locationId
          ),
          await ce.getAll(
            "Male",
            15,
            19,
            "non_biological_child",
            formattedDate,
            new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            locationId
          ),
          await ce.getAll(
            "Female",
            0,
            4,
            "biological_child",
            formattedDate,
            new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            locationId
          ),
          await ce.getAll(
            "Female",
            0,
            4,
            "non_biological_child",
            formattedDate,
            new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            locationId
          ),
          await ce.getAll(
            "Female",
            5,
            9,
            "biological_child",
            formattedDate,
            new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            locationId
          ),
          await ce.getAll(
            "Female",
            5,
            9,
            "non_biological_child",
            formattedDate,
            new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            locationId
          ),
          await ce.getAll(
            "Female",
            10,
            14,
            "biological_child",
            formattedDate,
            new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            locationId
          ),
          await ce.getAll(
            "Female",
            10,
            14,
            "non_biological_child",
            formattedDate,
            new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            locationId
          ),
          await ce.getAll(
            "Female",
            15,
            19,
            "biological_child",
            formattedDate,
            new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            locationId
          ),
          await ce.getAll(
            "Female",
            15,
            19,
            "non_biological_child",
            formattedDate,
            new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            locationId
          )
        );

        const results = {};
        results["date"] = formattedDate;
        results["elicitations"] = countsByDay;

        // Query goes here
        paediatricContactsArray.push(results);
      }

      // Send the payload back
      return response.api(req, res, 200, [...payloadArray]);
    } catch (error) {
      console.error(error.message);
      next(error);
    }
  }
}

export default new DashboardController();
