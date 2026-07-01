const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  try {
    console.log('Connecting to database using DATABASE_URL...');
    const res = await prisma.store_profiles.findFirst();
    console.log('Successfully connected and queried database! Store name:', res?.store_name);
  } catch (error) {
    console.error('DATABASE ERROR:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
run();
