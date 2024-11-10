import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Save upload stats in uploads table
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

// Get the number of file upload attempts per user and filetype
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

// Get the number of imported records per specific user
export async function getImportedRecords(username) {
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

// Get number of rejected records per specific user
export async function getRejectedRecords(username) {
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

// Get last uploading date for a specific user
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

// Get total file count per filetype and region
export async function getTotalFileTypeCount(fileType, region) {
  try {
    const totalFileTypeCount = await prisma.uploads.count({
      where: {
        uploaded_file_type: fileType,
        team_member: {
          is: {
            locations: {
              is: {
                region_name: region,
              },
            },
          },
        },
      },
    });
    return totalFileTypeCount;
  } catch (error) {
    console.error("Error fetching file type count:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get all accepted 'imported' rows per region
export async function getTotalAcceptedRecords(region) {
  try {
    const totalFileTypeCount = await prisma.uploads.aggregate({
      _sum: {
        imported_rows: true,
      },
      where: {
        team_member: {
          is: {
            locations: {
              is: {
                region_name: region, // Filter by region name in `location`
              },
            },
          },
        },
      },
    });
    return totalFileTypeCount;
  } catch (error) {
    console.error("Error fetching file type count:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get all rejected rows per region
export async function getTotalRejectedRecords(region) {
  try {
    const totalFileTypeCount = await prisma.uploads.aggregate({
      _sum: {
        rejected_rows: true,
      },
      where: {
        team_member: {
          locations: {
            region_name: region,
          },
        },
      },
    });
    return totalFileTypeCount;
  } catch (error) {
    console.error("Error fetching file type count:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
