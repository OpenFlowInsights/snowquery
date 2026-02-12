// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient | null };

// Check if we're in public mode (no database needed)
const isPublicMode = !process.env.DATABASE_URL ||
                     process.env.DATABASE_URL.includes("file:./dev.db");

function createMockPrisma(): any {
  const mockQuery = {
    findUnique: async () => null,
    findMany: async () => [],
    create: async () => { throw new Error("Database not available in public mode"); },
    update: async () => { throw new Error("Database not available in public mode"); },
    delete: async () => { throw new Error("Database not available in public mode"); },
    count: async () => 0,
    upsert: async () => { throw new Error("Database not available in public mode"); },
  };

  return {
    tenant: mockQuery,
    user: mockQuery,
    queryLog: mockQuery,
    $connect: async () => {},
    $disconnect: async () => {},
    $on: () => {},
  };
}

// Only initialize real Prisma if we have a proper database URL
let prismaInstance: PrismaClient | any = null;

if (isPublicMode) {
  console.log("Running in public mode - database disabled");
  prismaInstance = createMockPrisma();
} else {
  try {
    prismaInstance = globalForPrisma.prisma || new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query"] : [],
    });

    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prisma = prismaInstance;
    }
  } catch (error) {
    console.warn("Prisma initialization failed - falling back to mock");
    prismaInstance = createMockPrisma();
  }
}

export const prisma = prismaInstance;
