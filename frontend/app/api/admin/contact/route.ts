import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

interface ContactData {
  email: string;
  phone: string;
  location: string;
  studioVisitsText: string;
  emailRouting: string; // Where contact form emails should be sent
}

const CONTACT_KEY = 'contact_data';

const defaultContactData: ContactData = {
  email: 'contact@example.com',
  phone: '(000) 000-0000',
  location: 'City, Country',
  studioVisitsText: 'Studio visits are available by appointment.',
  emailRouting: 'contact@example.com'
};

async function readContactData(): Promise<ContactData> {
  const data = await kv.get<ContactData>(CONTACT_KEY);
  return data || defaultContactData;
}

async function writeContactData(data: ContactData) {
  await kv.set(CONTACT_KEY, data);
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