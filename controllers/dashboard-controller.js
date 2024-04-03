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
import countElicitations from "../helpers/count-elicitations.js";

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

  async getIndexClients(req, res, next) {
    try {
      const indexClients = await prisma.index_client.findMany();
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

      const countAllIndexes = await prisma.index_client.count({
        where: {
          location_id: location.location_uuid,
          sex: "Female",
          date_of_birth: {
            lt: DateCalculator.calculateBirthDate(14),
          },
          hiv_registration_date: {
            gte: Date.parse(startdate).toString(),
            lte: enddate,
          },
        },
      });

      const countImportedIndexes = await prisma.index_client.count({
        where: {
          location_id: location.location_uuid,
          sex: "Female",
          date_of_birth: {
            lt: DateCalculator.calculateBirthDate(14),
          },
          hiv_registration_date: {
            gte: Date.parse(startdate).toString(),
            lte: enddate,
          },
          data_source: "ctc_import",
        },
      });

      // const countElicitedClients = await prisma.index_client.count({
      //   where: {
      //     location_id: location.location_uuid,
      //     sex: "Female",
      //     date_of_birth: {
      //       gt: DateCalculator.calculateBirthDate(19),
      //     },
      //     elicitation: {
      //       some: {
      //         elicitation_date: {
      //           gte: Date.parse(startdate).toString(),
      //           lte: Date.parse(enddate).toString(),
      //         },
      //       },
      //     },
      //   },
      // });

      const countElicitedContactsResult = await prisma.$queryRaw`
        SELECT COUNT(DISTINCT el.base_entity_id) FROM index_client ic
        INNER JOIN elicitation el ON ic.base_entity_id = el.index_client_base_entity_id
        INNER JOIN locations lc ON ic.location_id = lc.location_uuid
        WHERE lc.hfr_code = ${Prisma.sql`${locationid}`}
        AND ic.sex = 'Female'
        AND el.elicitation_date BETWEEN ${Prisma.sql`${startdate}`} AND ${Prisma.sql`${enddate}`}
        AND lc.region_name IN ('Dar es Salaam Region', 'Mwanza Region', 'Mbeya Region', 'Dodoma Region')
        AND EXTRACT(YEAR FROM AGE(NOW(), ic.date_of_birth::TIMESTAMP)) >= 14
      `;

      // const countReachedIndexClients = await prisma.index_client.count({
      //   where: {
      //     location_id: location.location_uuid,
      //     sex: "Female",
      //     date_of_birth: {
      //       lt: DateCalculator.calculateBirthDate(14),
      //     },
      //     elicitation: {
      //       some: {},
      //     },
      //   },
      // });

      const countReachedIndexClientsResult = await prisma.$queryRaw`
        SELECT COUNT(DISTINCT ic.base_entity_id) FROM index_client ic
        LEFT JOIN elicitation el ON ic.base_entity_id = el.index_client_base_entity_id
        INNER JOIN locations lc ON ic.location_id = lc.location_uuid
        WHERE lc.hfr_code = ${Prisma.sql`${locationid}`}
        AND el.base_entity_id IS NOT NULL
        AND ic.sex = 'Female'
        AND el.elicitation_date BETWEEN ${Prisma.sql`${startdate}`} AND ${Prisma.sql`${enddate}`}
        AND lc.region_name IN ('Dar es Salaam Region', 'Mwanza Region', 'Mbeya Region', 'Dodoma Region')
        AND EXTRACT(YEAR FROM AGE(NOW(), ic.date_of_birth::TIMESTAMP)) >= 14
      `;

      // const countUnreachedIndexClientsResult = await prisma.index_client.count({
      //   where: {
      //     location_id: location.location_uuid,
      //     sex: "Female",
      //     date_of_birth: {
      //       lt: DateCalculator.calculateBirthDate(14),
      //     },
      //     elicitation: {
      //       none: {},
      //     },
      //   },
      // });

      const countUnreachedIndexClientsResult = await prisma.$queryRaw`
        SELECT COUNT(DISTINCT ic.base_entity_id) FROM index_client ic
        LEFT JOIN elicitation el ON ic.base_entity_id = el.index_client_base_entity_id
        INNER JOIN locations lc ON ic.location_id = lc.location_uuid
        WHERE lc.hfr_code = ${Prisma.sql`${locationid}`}
        AND el.base_entity_id IS NULL
        AND ic.sex = 'Female'
        AND ucs_registration_date BETWEEN ${Prisma.sql`${startdate}`} AND ${Prisma.sql`${enddate}`}
        AND lc.region_name IN ('Dar es Salaam Region', 'Mwanza Region', 'Mbeya Region', 'Dodoma Region')
        AND EXTRACT(YEAR FROM AGE(NOW(), ic.date_of_birth::TIMESTAMP)) >= 14
      `;

      const payload = {
        ctcClients: countImportedIndexes,
        ucsClients: countAllIndexes - countImportedIndexes,
        totalClients: countAllIndexes,
        reachedClients: parseInt(countReachedIndexClientsResult[0].count, 10),
        unreachedClients: parseInt(countUnreachedIndexClientsResult[0].count, 10),
        elicitedContacts: parseInt(countElicitedContactsResult[0].count, 10),
      };

      return response.api(req, res, 200, payload);
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

      paediatricTestOutcomesArray.push(
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

      payloadArray[0].paediatricTestOutcomes = paediatricTestOutcomesArray;

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

      paediatricContactsArray.push(
        await ce.getAll("Male", 0, 4, "biological_child", startDate, endDate, locationId),
        await ce.getAll("Male", 0, 4, "non_biological_child", startDate, endDate, locationId),
        await ce.getAll("Male", 5, 9, "biological_child", startDate, endDate, locationId),
        await ce.getAll("Male", 5, 9, "non_biological_child", startDate, endDate, locationId),
        await ce.getAll("Male", 10, 14, "biological_child", startDate, endDate, locationId),
        await ce.getAll("Male", 10, 14, "non_biological_child", startDate, endDate, locationId),
        await ce.getAll("Male", 15, 19, "biological_child", startDate, endDate, locationId),
        await ce.getAll("Male", 15, 19, "non_biological_child", startDate, endDate, locationId),
        await ce.getAll("Female", 0, 4, "biological_child", startDate, endDate, locationId),
        await ce.getAll("Female", 0, 4, "non_biological_child", startDate, endDate, locationId),
        await ce.getAll("Female", 5, 9, "biological_child", startDate, endDate, locationId),
        await ce.getAll("Female", 5, 9, "non_biological_child", startDate, endDate, locationId),
        await ce.getAll("Female", 10, 14, "biological_child", startDate, endDate, locationId),
        await ce.getAll("Female", 10, 14, "non_biological_child", startDate, endDate, locationId),
        await ce.getAll("Female", 15, 19, "biological_child", startDate, endDate, locationId),
        await ce.getAll("Female", 15, 19, "non_biological_child", startDate, endDate, locationId)
      );

      payloadArray[0].paediatricContacts = paediatricContactsArray;

      // Send the payload back
      return response.api(req, res, 200, [...payloadArray]);
    } catch (error) {
      console.error(error.message);
      next(error);
    }
  }
}

export default new DashboardController();
