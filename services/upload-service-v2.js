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
