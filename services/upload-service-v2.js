import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function uploadStats(stats) {
  try {
    const saveStats = await prisma.uploads.create({
      data: stats,
    });

    return saveStats;
  } catch (error) {
    console.error("Failed to save upload stats:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export async function getFileTypeCount(username, fileType) {
  try {
    const fileTypeCount = await prisma.uploads.count({
      where: {
        username: username,
        uploaded_file_type: fileType,
      },
    });
    return fileTypeCount;
  } catch (error) {
    console.error("Error fetching file type count:", error);
    throw error; // Rethrow the error to be handled by the calling function
  } finally {
    await prisma.$disconnect(); // Close the Prisma Client connection
  }
}

export async function getTotalImportedRecords(username) {
  try {
    const sumImportedRows = await prisma.uploads.aggregate({
      where: {
        username: username,
      },
      _sum: {
        imported_rows: true,
      },
    });
    return sumImportedRows._sum.imported_rows || 0;
  } catch (error) {
    console.error("Error fetching total imported records:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export async function getTotalRejectedRecords(username) {
  try {
    const sumRejectedRows = await prisma.uploads.aggregate({
      where: {
        username: username,
      },
      _sum: {
        rejected_rows: true,
      },
    });
    return sumRejectedRows._sum.rejected_rows || 0;
  } catch (error) {
    console.error("Error fetching total rejected records:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export async function getLastUploadDate(username) {
  try {
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
  } catch (error) {
    console.error("Error fetching last upload date:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
