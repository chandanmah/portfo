import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface AvatarData {
  avatarUrl: string;
}

// Use environment variables for production or fallback to local file
const dataFilePath = process.env.NODE_ENV === 'production' 
  ? '/tmp/avatarData.json' 
  : path.join(process.cwd(), 'data', 'adminData.json');
const publicUploadsAvatarDir = process.env.NODE_ENV === 'production'
  ? '/tmp/uploads'
  : path.join(process.cwd(), 'public', 'uploads', 'avatar');

// Default avatar data for production
const defaultAvatarData: AvatarData = {
  avatarUrl: process.env.DEFAULT_AVATAR_URL || ''
};

async function ensureDirectoryExists(directoryPath: string) {
  try {
    await fs.access(directoryPath);
  } catch (error) {
    await fs.mkdir(directoryPath, { recursive: true });
  }
}

// GET handler to retrieve avatar data
export async function GET() {
  try {
    if (process.env.NODE_ENV === 'production') {
      // In production, try to read from temp file or return default data
      try {
        const data = await fs.promises.readFile(dataFilePath, 'utf8');
        return NextResponse.json(JSON.parse(data));
      } catch {
        return NextResponse.json(defaultAvatarData);
      }
    }
    await ensureDirectoryExists(path.dirname(dataFilePath));
    const data = await fs.promises.readFile(dataFilePath, 'utf8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading avatar data:', error);
    return NextResponse.json(defaultAvatarData);
  }
}

// POST handler to upload a new avatar
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return NextResponse.json({ message: 'No avatar file provided' }, { status: 400 });
    }

    await ensureDirectoryExists(publicUploadsAvatarDir);

    // Clean up old avatar if it exists
    try {
      const currentDataJson = await fs.readFile(dataFilePath, 'utf-8');
      const currentData = JSON.parse(currentDataJson);
      if (currentData.avatarUrl) {
        const oldAvatarFileName = path.basename(currentData.avatarUrl);
        const oldAvatarPath = path.join(publicUploadsAvatarDir, oldAvatarFileName);
        try {
            await fs.access(oldAvatarPath);
            await fs.unlink(oldAvatarPath);
        } catch (e) {
            // Old file might not exist, or other error, log it but continue
            console.warn(`Could not delete old avatar ${oldAvatarPath}:`, e.message);
        }
      }
    } catch (e) {
        // adminData.json might not exist yet, or other error, log it but continue
        console.warn('Could not read adminData.json for old avatar cleanup:', e.message);
    }

    const fileExtension = path.extname(file.name);
    const timestamp = Date.now();
    const uniqueFileName = `avatar-${timestamp}${fileExtension}`;
    const filePath = path.join(publicUploadsAvatarDir, uniqueFileName);
    const publicPath = `/uploads/avatar/${uniqueFileName}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filePath, buffer);

    const newData = { avatarUrl: publicPath };
    await fs.writeFile(dataFilePath, JSON.stringify(newData, null, 2));

    return NextResponse.json({ message: 'Avatar uploaded successfully', avatarUrl: publicPath });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json({ message: 'Error uploading avatar', error: error.message }, { status: 500 });
  }
}