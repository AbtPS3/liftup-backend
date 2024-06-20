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
    return indexClients;
  }
}

export default new DashboardService();
