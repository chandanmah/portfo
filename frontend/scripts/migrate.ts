#!/usr/bin/env tsx

/**
 * Database Migration Script
 * 
 * This script initializes the database tables for the portfolio website.
 * Run this script after setting up your Neon database and environment variables.
 * 
 * Usage:
 * npm run migrate
 */

import { initializeDatabase } from '../lib/database';

async function migrate() {
  try {
    console.log('🚀 Starting database migration...');
    
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable is not set');
      console.log('Please set your DATABASE_URL in .env.local file');
      console.log('Example: DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require');
      process.exit(1);
    }
    
    console.log('📊 Initializing database tables...');
    await initializeDatabase();
    
    console.log('✅ Database migration completed successfully!');
    console.log('🎉 Your portfolio website is ready to use!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrate();
}

export { migrate };