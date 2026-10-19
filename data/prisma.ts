import { PrismaClient } from "@prisma/client";
const globalForPrisma = globalThis as unknown as { biotestPrisma?: PrismaClient };
const prisma = globalForPrisma.biotestPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.biotestPrisma = prisma;
export default prisma;
