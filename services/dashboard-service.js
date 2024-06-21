import { PrismaClient } from "@prisma/client";
// import response from "../helpers/response-handler";

class DashboardService {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async getIndexClients(locationArray, startDate, endDate) {
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

    // Group the data by hfr_code
    // const groupedData = indexClients.reduce((acc, client) => {
    //   const { hfr_code } = client;
    //   if (!acc[hfr_code]) {
    //     acc[hfr_code] = [];
    //   }
    //   acc[hfr_code].push(client);
    //   return acc;
    // }, {});

    // return groupedData;

    // Group the data by hfr_code and transform it
    const groupedData = indexClients.reduce((acc, client) => {
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

    return groupedData;
  }
}

export default new DashboardService();
