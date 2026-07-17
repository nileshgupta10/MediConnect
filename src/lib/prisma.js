// src/lib/prisma.js
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

if (!global.prisma) {
  global.pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(global.pool);
  global.prisma = new PrismaClient({ adapter });
}

const prisma = global.prisma;

export { prisma };
