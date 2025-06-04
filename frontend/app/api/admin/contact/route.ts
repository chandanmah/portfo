import { NextRequest, NextResponse } from 'next/server';
import { getContactData, saveContactData } from '@/lib/fileStorage';

// Contact data interface
interface ContactFormData {
  email: string;
  phone: string;
  location: string;
  studioVisitsText: string;
  emailRouting: string;
}

// GET handler to retrieve contact data
export async function GET() {
  try {
    const data = await getContactData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching contact data:', error);
    return NextResponse.json(
      { message: 'Failed to fetch contact data' },
      { status: 500 }
    );
  }
}

// POST handler to update contact data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const { email, phone, location, studioVisitsText, emailRouting } = body;
    
    const contactFormData: ContactFormData = {
      email: email || '',
      phone: phone || '',
      location: location || '',
      studioVisitsText: studioVisitsText || '',
      emailRouting: emailRouting || ''
    };
    
    await saveContactData(contactFormData);
    
    return NextResponse.json({
      message: 'Contact data saved successfully',
      data: contactFormData
    });
  } catch (error) {
    console.error('Error saving contact data:', error);
    return NextResponse.json(
      { message: 'Failed to save contact data' },
      { status: 500 }
    );
  }
}