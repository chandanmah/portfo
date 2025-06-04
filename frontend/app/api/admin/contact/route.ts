import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';

interface ContactData {
  email: string;
  phone: string;
  location: string;
  studioVisitsText: string;
  emailRouting: string; // Where contact form emails should be sent
}

const CONTACT_DATA_KEY = 'contact-data.json';

async function readContactData(): Promise<ContactData> {
  try {
    // Try to fetch from Vercel Blob storage
    const response = await fetch(`${process.env.BLOB_READ_WRITE_TOKEN ? 'https://blob.vercel-storage.com' : ''}/contact-data.json`, {
      headers: {
        'Authorization': `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
      }
    });
    
    if (response.ok) {
      return await response.json();
    }
    
    // If not found, return default structure
    return {
      email: 'contact@mrmahanta.com',
      phone: '(314) 555-1234',
      location: 'St. Louis, Missouri',
      studioVisitsText: 'Studio visits are available by appointment. Please contact me to arrange a visit to see my works in person and discuss potential commissions or acquisitions.',
      emailRouting: 'contact@mrmahanta.com'
    };
  } catch (error) {
    console.error('Error reading contact data:', error);
    // Return default structure on error
    return {
      email: 'contact@mrmahanta.com',
      phone: '(314) 555-1234',
      location: 'St. Louis, Missouri',
      studioVisitsText: 'Studio visits are available by appointment. Please contact me to arrange a visit to see my works in person and discuss potential commissions or acquisitions.',
      emailRouting: 'contact@mrmahanta.com'
    };
  }
}

async function writeContactData(data: ContactData) {
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    await put(CONTACT_DATA_KEY, blob, {
      access: 'public',
    });
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