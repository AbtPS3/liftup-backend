import { PrismaClient } from "@prisma/client";
// import response from "../helpers/response-handler";

class DashboardService {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async getIndexClients(location, startDate, endDate) {
    const indexClients = await this.prisma.indexClientsMV.findMany();
    return indexClients;
  }
}

export default new DashboardService();
