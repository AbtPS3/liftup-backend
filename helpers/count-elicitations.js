import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class CountElicitations {
  constructor() {}

  async getAll(sex, minAge, maxAge, relationship, startDate, endDate, locationid) {
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
        (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
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

        // Query goes here
        const count = await prisma.elicitation.count({
          where: {
            sex: this.sex,
            age_at_elicitation: {
              gte: minAge,
              lte: maxAge,
            },
            relationship: relationship,
            elicitation_date: {
              gte: startDate,
              lte: endDate,
            },
            locations: {
              hfr_code: location.location_uuid,
            },
          },
        });

        const relation = relationship === "biological_child" ? "biological" : "non-biological";

        console.log(`Total elicitations for ${sex}, ${relation}, ${minAge}-${maxAge}:`, count);

        // const response = {
        //   sex: sex,
        //   ageGroup: `${minAge}-${maxAge}`,
        //   relationship: relation,
        //   contactCount: count,
        // };

        countsByDay[formattedDate] = {
          sex: sex,
          ageGroup: `${minAge}-${maxAge}`,
          relationship: relation,
          contactCount: count,
        };
      }
      // Return chunk
      return countsByDay;
    } catch (error) {
      console.log(error);
    }
  }
}

export default new CountElicitations();
