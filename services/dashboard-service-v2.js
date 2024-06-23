/**
 * @file dashboard-service-v2.js
 * @module dashboard-service
 * @description Version 2 Dashboard Service class for handling TEPI dashboard logic.
 * @version 1.0.2
 * @author Kizito S.M.
 */

import { PrismaClient } from "@prisma/client";

/**
 * Version 2 Service class for handling export of data to LIFT UP Dashboard.
 * @class
 */
class DashboardServiceV2 {
  /**
   * Constructor for DashboardServiceV2.
   * @constructor
   */
  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Retrieves and counts index clients, grouping the results by location.
   * @async
   * @param {string[]} locationArray - Array of location codes to filter the results.
   * @param {string} startDate - Start date for filtering the results (ISO 8601 format).
   * @param {string} endDate - End date for filtering the results (ISO 8601 format).
   * @returns {Promise<Object>} - A promise that resolves to an object grouped by `hfr_code` with transformed data.
   */
  async countIndexClients(locationArray, startDate, endDate) {
    // Query the data from the DB
    const indexClients = await this.prisma.indexClientsMV.findMany({
      where: {
        hfr_code: {
          in: locationArray,
        },
        ucs_registration_date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    });

    // Group the data by hfr_code and transform it
    const groupedIndexClients = indexClients.reduce((acc, client) => {
      const { hfr_code, ...rest } = client;

      // Remove the id field and rename keys
      const transformedClient = {
        ...rest,
        registrationDate: rest.ucs_registration_date,
        totalCTCClients: rest.ctcclients,
        totalUCSClients: rest.ucsclients,
        totalReachedClients: rest.reachedclients,
        totalUnreachedClients: rest.unreachedclients,
        totalElicitations: rest.totalelicitations,
      };

      // Delete the original keys to clean up the object
      delete transformedClient.id;
      delete transformedClient.hfr_code;
      delete transformedClient.ucs_registration_date;
      delete transformedClient.ctcclients;
      delete transformedClient.ucsclients;
      delete transformedClient.reachedclients;
      delete transformedClient.unreachedclients;
      delete transformedClient.totalelicitations;

      if (!acc[hfr_code]) {
        acc[hfr_code] = [];
      }
      acc[hfr_code].push(transformedClient);
      return acc;
    }, {});

    return groupedIndexClients;
  }

  /**
   * Retrieves and counts elicitations, grouping the results by location.
   * @async
   * @param {string[]} locationArray - Array of location codes to filter the results.
   * @param {string} startDate - Start date for filtering the results (ISO 8601 format).
   * @param {string} endDate - End date for filtering the results (ISO 8601 format).
   * @returns {Promise<Object>} - A promise that resolves to an object grouped by `hfr_code` with transformed data.
   */
  async countElicitations(locationArray, startDate, endDate) {
    // Query the data from the DB
    const elicitations = await this.prisma.elicitationsMV.findMany({
      where: {
        hfr_code: {
          in: locationArray,
        },
        relationship: {
          in: ["biological_child", "non_biological_child", "sibling"],
        },
        elicitation_date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    });

    // Group the data by hfr_code and transform it
    const groupedElicitations = elicitations.reduce((acc, elicitation) => {
      const { hfr_code, ...rest } = elicitation;

      // Remove the id field and rename keys
      const transformedElicitation = {
        ...rest,
        elicitationDate: rest.elicitation_date,
        ageGroup: rest.age_group,
        relationship: rest.relationship,
        sex: rest.sex,
        totalElicitations: rest.totalelicitations,
      };

      // Delete the original keys to clean up the object
      delete transformedElicitation.id;
      delete transformedElicitation.hfr_code;
      delete transformedElicitation.elicitation_date;
      delete transformedElicitation.age_group;
      delete transformedElicitation.totalelicitations;

      if (!acc[hfr_code]) {
        acc[hfr_code] = [];
      }
      acc[hfr_code].push(transformedElicitation);
      return acc;
    }, {});

    return groupedElicitations;
  }

  /**
   * Retrieves and counts outcomes, grouping the results by location.
   * @async
   * @param {string[]} locationArray - Array of location codes to filter the results.
   * @param {string} startDate - Start date for filtering the results (ISO 8601 format).
   * @param {string} endDate - End date for filtering the results (ISO 8601 format).
   * @returns {Promise<Object>} - A promise that resolves to an object grouped by `hfr_code` with transformed data.
   */
  async countOutcomes(locationArray, startDate, endDate) {
    // Query the data from the DB
    const outcomes = await this.prisma.outcomesMV.findMany({
      where: {
        hfr_code: {
          in: locationArray,
        },
        relationship: {
          in: ["biological_child", "non_biological_child", "sibling"],
        },
        outcome_date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    });

    // Group the data by hfr_code and transform it
    const groupedOutcomes = outcomes.reduce((acc, outcome) => {
      const { hfr_code, ...rest } = outcome;

      // Remove the id field and rename keys
      const transformedOutcome = {
        ...rest,
        outcomeDate: rest.outcome_date,
        ageGroup: rest.age_group,
        relationship: rest.relationship,
        sex: rest.sex,
        testingPoint: rest.testingpoint,
        testResults: rest.test_results,
        count: rest.count,
      };

      // Delete the original keys to clean up the object
      delete transformedOutcome.id;
      delete transformedOutcome.hfr_code;
      delete transformedOutcome.outcome_date;
      delete transformedOutcome.age_group;
      delete transformedOutcome.testingpoint;
      delete transformedOutcome.test_results;

      if (!acc[hfr_code]) {
        acc[hfr_code] = [];
      }
      acc[hfr_code].push(transformedOutcome);
      return acc;
    }, {});

    return groupedOutcomes;
  }
}

export default DashboardServiceV2;
