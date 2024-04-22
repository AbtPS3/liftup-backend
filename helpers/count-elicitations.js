import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class CountElicitations {
  constructor() {}

  async getAll(sex, minAge, maxAge, relationship, startDate, endDate, locationId) {
    try {
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
            lt: endDate,
          },
          locations: {
            hfr_code: locationId,
            region_name: {
              in: ["Mbeya Region", "Mwanza Region", "Dodoma Region", "Dar es Salaam Region"],
            },
          },
        },
      });

      const relation = relationship === "biological_child" ? "biological" : "non-biological";

      console.log(`Total elicitations for ${sex}, ${relation}, ${minAge}-${maxAge}:`, count);

      const response = {
        sex: sex,
        ageGroup: `${minAge}-${maxAge}`,
        relationship: relation,
        contactCount: count,
      };

      // Return chunk
      return response;
    } catch (error) {
      console.log(error);
    }
  }
}

export default new CountElicitations();
