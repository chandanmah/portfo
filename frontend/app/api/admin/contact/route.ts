import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface ContactData {
  email: string;
  phone: string;
  location: string;
  studioVisitsText: string;
  emailRouting: string; // Where contact form emails should be sent
}

// Use environment variables for production or fallback to local file
const dataFilePath = process.env.NODE_ENV === 'production' 
  ? '/tmp/contactData.json' 
  : path.join(process.cwd(), 'data', 'contactData.json');

// Default contact data for production
const defaultContactData: ContactData = {
  email: process.env.CONTACT_EMAIL || 'contact@mrmahanta.com',
  phone: process.env.CONTACT_PHONE || '(314) 555-1234',
  location: process.env.CONTACT_LOCATION || 'St. Louis, Missouri',
  studioVisitsText: process.env.CONTACT_STUDIO_VISITS || 'Studio visits are available by appointment. Please contact me to arrange a visit to see my works in person and discuss potential commissions or acquisitions.',
  emailRouting: process.env.CONTACT_EMAIL_ROUTING || 'contact@mrmahanta.com'
};

async function ensureDirectoryExists(directoryPath: string) {
  try {
    await fs.access(directoryPath);
  } catch (error) {
    await fs.mkdir(directoryPath, { recursive: true });
  }
}

async function readContactData(): Promise<ContactData> {
  try {
    if (process.env.NODE_ENV === 'production') {
      // In production, try to read from temp file or return default data
      try {
        const data = await fs.readFile(dataFilePath, 'utf8');
        return JSON.parse(data);
      } catch {
        return defaultContactData;
      }
    }
    await ensureDirectoryExists(path.dirname(dataFilePath));
    const data = await fs.readFile(dataFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return defaultContactData;
  }
}

async function writeContactData(data: ContactData): Promise<void> {
  try {
    if (process.env.NODE_ENV === 'production') {
      // In production, write to temp directory
      await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2));
      return;
    }
    await ensureDirectoryExists(path.dirname(dataFilePath));
    await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing contact data:', error);
    throw error;
  }
}

// GET handler to retrieve contact data
export async function GET() {
  try {
    const data = await readContactData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading contact data:', error);
    return NextResponse.json({ message: 'Error reading contact data' }, { status: 500 });
  }
}

// POST handler to update contact data
export async function POST(request: NextRequest) {
  try {
    const { email, phone, location, studioVisitsText, emailRouting } = await request.json();
    
    if (!email || !phone || !location || !studioVisitsText || !emailRouting) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const contactData: ContactData = {
      email,
      phone,
      location,
      studioVisitsText,
      emailRouting
    };

    await writeContactData(contactData);
    return NextResponse.json({ message: 'Contact information updated successfully', data: contactData });
  } catch (error) {
    console.error('Error updating contact data:', error);
    return NextResponse.json({ 
      message: 'Error updating contact data', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}