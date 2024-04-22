import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class CountOutcomes {
  constructor() {}

  async getAll(testingPoint, sex, minAge, maxAge, relationship, startDate, endDate, locationId) {
    const testingPointArray =
      testingPoint == "facility"
        ? ["outpatient_department", "inpatient_department", "ctc", "other"]
        : ["community_based_hiv_testing_service", "outreach_services"];

    try {
      const countKnownPositive = await prisma.test_outcome.count({
        where: {
          event_date: {
            gte: startDate,
            lt: endDate,
          },
          sex: sex,
          age_at_outcome: {
            gte: minAge,
            lte: maxAge,
          },
          elicitation: {
            relationship: relationship,
          },
          locations: {
            hfr_code: locationId,
            region_name: {
              in: ["Mbeya Region", "Mwanza Region", "Dodoma Region"],
            },
          },
          place_where_test_was_conducted: null,
          is_known_positive: true,
        },
      });
      console.log(
        `Known Positive for ${testingPoint} ${sex} ${relationship} ${minAge}-${maxAge}:`,
        countKnownPositive
      );

      const countNewlyTestedNegative = await prisma.test_outcome.count({
        where: {
          event_date: {
            gte: startDate,
            lte: endDate,
          },
          sex: sex,
          age_at_outcome: {
            gte: minAge,
            lte: maxAge,
          },
          elicitation: {
            relationship: relationship,
          },
          locations: {
            hfr_code: locationId,
          },
          place_where_test_was_conducted: {
            in: testingPointArray,
          },
          test_results: "negative",
        },
      });
      console.log(
        `Newly Tested Negative for ${testingPoint} ${sex} ${relationship} ${minAge}-${maxAge}:`,
        countNewlyTestedNegative
      );

      const countNewlyTestedPositive = await prisma.test_outcome.count({
        where: {
          event_date: {
            gte: startDate,
            lte: endDate,
          },
          sex: sex,
          age_at_outcome: {
            gte: minAge,
            lte: maxAge,
          },
          elicitation: {
            relationship: relationship,
          },
          locations: {
            hfr_code: locationId,
          },
          place_where_test_was_conducted: {
            in: testingPointArray,
          },
          test_results: "positive",
        },
      });
      console.log(
        `Newly Tested Positive for ${testingPoint} ${sex} ${relationship} ${minAge}-${maxAge}:`,
        countNewlyTestedPositive
      );

      const countNotTested = await prisma.test_outcome.count({
        where: {
          event_date: {
            gte: startDate,
            lte: endDate,
          },
          sex: sex,
          age_at_outcome: {
            gte: minAge,
            lte: maxAge,
          },
          elicitation: {
            relationship: relationship,
          },
          locations: {
            hfr_code: locationId,
          },
          place_where_test_was_conducted: null,
          has_the_contact_client_been_tested: "no",
        },
      });
      console.log(
        `Not Tested for ${testingPoint} ${sex} ${relationship} ${minAge}-${maxAge}:`,
        countNotTested
      );

      const knownPositive = testingPoint !== "facility" ? 0 : countKnownPositive;
      const notTested = testingPoint !== "facility" ? 0 : countNotTested;
      const relation = relationship === "biological_child" ? "biological" : "non-biological";

      const chunk = {
        sex: sex,
        ageGroup: `${minAge}-${maxAge}`,
        relationship: relation,
        testingPoint: testingPoint,
        knownPositive: knownPositive,
        newlyTestedNegative: countNewlyTestedNegative,
        newlyTestedPositive: countNewlyTestedPositive,
        notTested: notTested,
      };

      return chunk;
    } catch (error) {
      console.log(error);
    }
  }
}

export default new CountOutcomes();
