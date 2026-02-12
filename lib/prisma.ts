// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient | null };

// Create a safe Prisma client that won't crash if DB doesn't exist
let prismaInstance: PrismaClient | null = null;

try {
  prismaInstance = globalForPrisma.prisma || new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prismaInstance;
  }
} catch (error) {
  console.warn("Prisma initialization failed - running in public mode without database");
  prismaInstance = null;
}

// Export a proxy that returns null queries if Prisma is unavailable
export const prisma = prismaInstance || createMockPrisma();

function createMockPrisma(): any {
  const mockQuery = {
    findUnique: async () => null,
    findMany: async () => [],
    create: async () => { throw new Error("Database not available in public mode"); },
    update: async () => { throw new Error("Database not available in public mode"); },
    delete: async () => { throw new Error("Database not available in public mode"); },
    count: async () => 0,
  };

  return {
    tenant: mockQuery,
    user: mockQuery,
    queryLog: mockQuery,
    $disconnect: async () => {},
  };
}
