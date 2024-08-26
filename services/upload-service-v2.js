import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function upload(uploadStats) {
  try {
    const save = await prisma.uploads.create({
      data: uploadStats,
    });

    return save;
  } catch (error) {
    console.error("Failed to save upload stats:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
