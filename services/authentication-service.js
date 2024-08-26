/**
 * @file authentication-service-v2.js
 * @module authentication-service
 * @description Version 2 Dashboard Service class for handling TEPI authentication logic.
 * @version 1.0.0
 * @author Kizito S.M.
 */

import { PrismaClient } from "@prisma/client";

class AuthenticationService {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async getFileTypeCount(username, fileType) {
    // Query the data from the DB
    const fileTypeCount = await this.prisma.uploads.count({
      where: {
        username: username,
        uploaded_file_type: fileType,
      },
    });

    return fileTypeCount;
  }

  async getSumImportedRecords(username) {
    const sumImportedRows = await prisma.uploads.aggregate({
      where: {
        username: username,
      },
      _sum: {
        imported_rows: true,
      },
    });

    return sumImportedRows;
  }

  async getSumRejectedRecords(username) {
    const sumRejectedRows = await prisma.uploads.aggregate({
      where: {
        username: username,
      },
      _sum: {
        rejected_rows: true,
      },
    });

    return sumRejectedRows;
  }

  async getLastUploadDate(username) {
    const lastUploadDate = await prisma.uploads.findFirst({
      where: {
        username: username,
      },
      orderBy: {
        upload_date: "desc",
      },
      select: {
        upload_date: true,
      },
    });

    return lastUploadDate?.upload_date;
  }
}

export default AuthenticationService;
