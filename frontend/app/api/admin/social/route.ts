import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

interface SocialMediaData {
  instagram: string;
  facebook: string;
  twitter: string;
}

const SOCIAL_KEY = 'social_media_data';

const defaultSocialData: SocialMediaData = {
  instagram: 'https://instagram.com/example',
  facebook: 'https://facebook.com/example',
  twitter: 'https://twitter.com/example'
};

async function readSocialData(): Promise<SocialMediaData> {
  const data = await kv.get<SocialMediaData>(SOCIAL_KEY);
  return data || defaultSocialData;
}

async function writeSocialData(data: SocialMediaData) {
  await kv.set(SOCIAL_KEY, data);
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