import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface SocialMediaData {
  instagram: string;
  facebook: string;
  twitter: string;
}

// Use environment variables for production or fallback to local file
const socialDataPath = process.env.NODE_ENV === 'production' 
  ? '/tmp/socialData.json' 
  : path.join(process.cwd(), 'data', 'socialData.json');

// Default social media data for production
const defaultSocialData: SocialMediaData = {
  instagram: process.env.SOCIAL_INSTAGRAM || 'https://instagram.com/yourprofile',
  facebook: process.env.SOCIAL_FACEBOOK || 'https://facebook.com/yourprofile',
  twitter: process.env.SOCIAL_TWITTER || 'https://twitter.com/yourprofile'
};

async function ensureDirectoryExists(directoryPath: string) {
  try {
    await fs.access(directoryPath);
  } catch (error) {
    await fs.mkdir(directoryPath, { recursive: true });
  }
}

async function readSocialData(): Promise<SocialMediaData> {
  try {
    if (process.env.NODE_ENV === 'production') {
      // In production, try to read from temp file or return default data
      try {
        const data = await fs.promises.readFile(socialDataPath, 'utf8');
        return JSON.parse(data);
      } catch {
        return defaultSocialData;
      }
    }
    await ensureDirectoryExists(path.dirname(socialDataPath));
    const data = await fs.promises.readFile(socialDataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return defaultSocialData;
  }
}

async function writeSocialData(data: SocialMediaData): Promise<void> {
  try {
    if (process.env.NODE_ENV === 'production') {
      // In production, write to temp directory
      await fs.promises.writeFile(socialDataPath, JSON.stringify(data, null, 2));
      return;
    }
    await ensureDirectoryExists(path.dirname(socialDataPath));
    await fs.promises.writeFile(socialDataPath, JSON.stringify(data, null, 2));
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
    const { instagram, facebook, twitter } = await request.json();
    
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
    return NextResponse.json({ 
      message: 'Error updating social data', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}