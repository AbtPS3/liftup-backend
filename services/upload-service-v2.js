import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function uploadStats(stats) {
  try {
    const save = await prisma.uploads.create({
      data: stats,
    });

    return save;
  } catch (error) {
    console.error("Failed to save upload stats:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
