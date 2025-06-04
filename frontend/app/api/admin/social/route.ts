import { NextRequest, NextResponse } from 'next/server';
import { getSocialData, saveSocialData } from '@/lib/fileStorage';

interface SocialFormData {
  instagram: string;
  facebook: string;
  twitter: string;
}

// GET handler to retrieve social media data
export async function GET() {
  try {
    const data = await getSocialData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching social data:', error);
    return NextResponse.json(
      { message: 'Failed to fetch social data' },
      { status: 500 }
    );
  }
}

// POST handler to update social media data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instagram, facebook, twitter } = body;

    const socialFormData: SocialFormData = {
      instagram: instagram || '',
      facebook: facebook || '',
      twitter: twitter || ''
    };

    await saveSocialData(socialFormData);
    
    return NextResponse.json({
      message: 'Social media links saved successfully',
      data: socialFormData
    });
  } catch (error) {
    console.error('Error saving social data:', error);
    return NextResponse.json(
      { message: 'Failed to save social data' },
      { status: 500 }
    );
  }
}