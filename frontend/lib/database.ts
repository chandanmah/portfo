import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable, text, timestamp, serial, varchar } from 'drizzle-orm/pg-core';

// Database connection
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql);

// Database schemas
export const galleryImages = pgTable('gallery_images', {
  id: serial('id').primaryKey(),
  url: text('url').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  subtitle: text('subtitle'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const adminData = pgTable('admin_data', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: text('value'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const contactData = pgTable('contact_data', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  location: text('location'),
  studioVisitsText: text('studio_visits_text'),
  emailRouting: varchar('email_routing', { length: 255 }),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const socialData = pgTable('social_data', {
  id: serial('id').primaryKey(),
  instagram: varchar('instagram', { length: 255 }),
  facebook: varchar('facebook', { length: 255 }),
  twitter: varchar('twitter', { length: 255 }),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const authData = pgTable('auth_data', {
  id: serial('id').primaryKey(),
  passwordHash: text('password_hash'),
  isSetup: text('is_setup').default('false'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Helper functions for database operations
export async function initializeDatabase() {
  try {
    // Create tables if they don't exist
    await sql`
      CREATE TABLE IF NOT EXISTS gallery_images (
        id SERIAL PRIMARY KEY,
        url TEXT NOT NULL,
        name VARCHAR(255) NOT NULL,
        subtitle TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS admin_data (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) NOT NULL UNIQUE,
        value TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS contact_data (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255),
        phone VARCHAR(50),
        location TEXT,
        studio_visits_text TEXT,
        email_routing VARCHAR(255),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS social_data (
        id SERIAL PRIMARY KEY,
        instagram VARCHAR(255),
        facebook VARCHAR(255),
        twitter VARCHAR(255),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS auth_data (
        id SERIAL PRIMARY KEY,
        password_hash TEXT,
        is_setup TEXT DEFAULT 'false',
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Utility functions for data operations
export async function getAdminDataByKey(key: string) {
  const result = await sql`SELECT value FROM admin_data WHERE key = ${key} LIMIT 1`;
  return result[0]?.value || null;
}

export async function setAdminData(key: string, value: string) {
  await sql`
    INSERT INTO admin_data (key, value, updated_at) 
    VALUES (${key}, ${value}, NOW())
    ON CONFLICT (key) 
    DO UPDATE SET value = ${value}, updated_at = NOW()
  `;
}

export async function getContactData() {
  const result = await sql`SELECT * FROM contact_data ORDER BY id DESC LIMIT 1`;
  return result[0] || null;
}

export async function getSocialData() {
  const result = await sql`SELECT * FROM social_data ORDER BY id DESC LIMIT 1`;
  return result[0] || null;
}

export async function getAuthData() {
  const result = await sql`SELECT * FROM auth_data ORDER BY id DESC LIMIT 1`;
  return result[0] || null;
}