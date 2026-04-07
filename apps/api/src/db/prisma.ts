// =============================================================================
// Prisma Client Singleton
// =============================================================================

import { PrismaClient } from '@prisma/client';

declare global {
  // Prevent multiple instances during hot reload in development
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export { prisma };
