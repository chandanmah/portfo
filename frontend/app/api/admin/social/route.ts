import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';

interface SocialMediaData {
  instagram: string;
  facebook: string;
  twitter: string;
}

const SOCIAL_DATA_KEY = 'social-data.json';

async function readSocialData(): Promise<SocialMediaData> {
  try {
    // Try to fetch from Vercel Blob storage
    const response = await fetch(`${process.env.BLOB_READ_WRITE_TOKEN ? 'https://blob.vercel-storage.com' : ''}/social-data.json`, {
      headers: {
        'Authorization': `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
      }
    });
    
    if (response.ok) {
      return await response.json();
    }
    
    // If not found, return default structure
    return {
      instagram: 'https://instagram.com/mrmahanta',
      facebook: 'https://facebook.com/mrmahanta',
      twitter: 'https://twitter.com/mrmahanta'
    };
  } catch (error) {
    console.error('Error reading social data:', error);
    // Return default structure on error
    return {
      instagram: 'https://instagram.com/mrmahanta',
      facebook: 'https://facebook.com/mrmahanta',
      twitter: 'https://twitter.com/mrmahanta'
    };
  }
}

async function writeSocialData(data: SocialMediaData) {
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    await put(SOCIAL_DATA_KEY, blob, {
      access: 'public',
    });
  } catch (error) {
    console.error('Error writing social data:', error);
    throw error;
  }
}

// GET handler to retrieve social media data
export async function GET() {
  try {
    const data = await readSocialData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading social data:', error);
    return NextResponse.json({ message: 'Error reading social data' }, { status: 500 });
  }
}

// POST handler to update social media data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instagram, facebook, twitter } = body;

    if (!instagram || !facebook || !twitter) {
      return NextResponse.json({ message: 'All social media links are required' }, { status: 400 });
    }

    const socialData: SocialMediaData = {
      instagram,
      facebook,
      twitter
    };

    await writeSocialData(socialData);
    return NextResponse.json({ message: 'Social media links updated successfully', data: socialData });
  } catch (error) {
    console.error('Error updating social data:', error);
    return NextResponse.json({ message: 'Error updating social data' }, { status: 500 });
  }
}