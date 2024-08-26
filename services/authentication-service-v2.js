import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function getFileTypeCount(username, fileType) {
  // Query the data from the DB
  const fileTypeCount = await prisma.uploads.count({
    where: {
      username: username,
      uploaded_file_type: fileType,
    },
  });

  return fileTypeCount;
}

export async function getSumImportedRecords(username) {
  const sumImportedRows = await prisma.uploads.aggregate({
    where: {
      username: username,
    },
    _sum: {
      imported_rows: true,
    },
  });

  return sumImportedRows._sum.imported_rows || 0;
}

export async function getSumRejectedRecords(username) {
  const sumRejectedRows = await prisma.uploads.aggregate({
    where: {
      username: username,
    },
    _sum: {
      rejected_rows: true,
    },
  });

  return sumRejectedRows._sum.rejected_rows || 0;
}

export async function getLastUploadDate(username) {
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

  return lastUploadDate?.upload_date || null;
}
