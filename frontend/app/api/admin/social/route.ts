import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface SocialMediaData {
  instagram: string;
  facebook: string;
  twitter: string;
}

const dataFilePath = path.join(process.cwd(), 'data', 'socialData.json');

async function ensureDirectoryExists(directoryPath: string) {
  try {
    await fs.access(directoryPath);
  } catch (error) {
    await fs.mkdir(directoryPath, { recursive: true });
  }
}

async function readSocialData(): Promise<SocialMediaData> {
  try {
    await ensureDirectoryExists(path.join(process.cwd(), 'data'));
    const jsonData = await fs.readFile(dataFilePath, 'utf-8');
    return JSON.parse(jsonData);
  } catch (error) {
    // If file doesn't exist, return default structure
    if (error.code === 'ENOENT') {
      return {
        instagram: 'https://instagram.com/mrmahanta',
        facebook: 'https://facebook.com/mrmahanta',
        twitter: 'https://twitter.com/mrmahanta'
      };
    }
    console.error('Error reading social data:', error);
    throw error;
  }
}

async function writeSocialData(data: SocialMediaData) {
  await ensureDirectoryExists(path.join(process.cwd(), 'data'));
  await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2));
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