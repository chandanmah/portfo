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

const dataFilePath = path.join(process.cwd(), 'data', 'contactData.json');

async function ensureDirectoryExists(directoryPath: string) {
  try {
    await fs.access(directoryPath);
  } catch (error) {
    await fs.mkdir(directoryPath, { recursive: true });
  }
}

async function readContactData(): Promise<ContactData> {
  try {
    await ensureDirectoryExists(path.join(process.cwd(), 'data'));
    const jsonData = await fs.readFile(dataFilePath, 'utf-8');
    return JSON.parse(jsonData);
  } catch (error) {
    // If file doesn't exist, return default structure
    if (error.code === 'ENOENT') {
      return {
        email: 'contact@mrmahanta.com',
        phone: '(314) 555-1234',
        location: 'St. Louis, Missouri',
        studioVisitsText: 'Studio visits are available by appointment. Please contact me to arrange a visit to see my works in person and discuss potential commissions or acquisitions.',
        emailRouting: 'contact@mrmahanta.com'
      };
    }
    console.error('Error reading contact data:', error);
    throw error;
  }
}

async function writeContactData(data: ContactData) {
  await ensureDirectoryExists(path.join(process.cwd(), 'data'));
  await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2));
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
    const body = await request.json();
    const { email, phone, location, studioVisitsText, emailRouting } = body;

    if (!email || !phone || !location || !emailRouting) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const contactData: ContactData = {
      email,
      phone,
      location,
      studioVisitsText: studioVisitsText || '',
      emailRouting
    };

    await writeContactData(contactData);
    return NextResponse.json({ message: 'Contact information updated successfully', data: contactData });
  } catch (error) {
    console.error('Error updating contact data:', error);
    return NextResponse.json({ message: 'Error updating contact data' }, { status: 500 });
  }
}