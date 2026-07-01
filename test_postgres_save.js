const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const prisma = new PrismaClient({});

async function run() {
  try {
    console.log('1. Fetching first store owner profile...');
    const owner = await prisma.store_profiles.findFirst();
    console.log('Selected owner:', owner);
  } catch (error) {
    console.error('DATABASE ERROR DETECTED:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
