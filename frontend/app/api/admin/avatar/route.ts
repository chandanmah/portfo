import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';

const AVATAR_CONFIG_KEY = 'avatar-config.json';

// Helper function to get current avatar data from Vercel Blob
async function getAvatarData(): Promise<{ avatarUrl: string } | null> {
  try {
    const response = await fetch(`${process.env.BLOB_READ_WRITE_TOKEN ? 'https://blob.vercel-storage.com' : 'http://localhost:3000'}/${AVATAR_CONFIG_KEY}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.log('No avatar data found');
  }
  return null;
}

// Helper function to save avatar data to Vercel Blob
async function saveAvatarData(data: { avatarUrl: string }): Promise<void> {
  await put(AVATAR_CONFIG_KEY, JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
  });
}

// GET handler to retrieve avatar data
export async function GET() {
  try {
    const data = await getAvatarData();
    return NextResponse.json(data || { avatarUrl: '' });
  } catch (error) {
    console.error('Error reading avatar data:', error);
    return NextResponse.json({ avatarUrl: '' });
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

    // Clean up old avatar if it exists
    try {
      const currentData = await getAvatarData();
      if (currentData?.avatarUrl) {
        // Extract the blob URL and delete the old avatar
        const oldAvatarUrl = currentData.avatarUrl;
        if (oldAvatarUrl.includes('blob.vercel-storage.com')) {
          await del(oldAvatarUrl);
        }
      }
    } catch (e) {
      console.warn('Could not delete old avatar:', e);
    }

    // Upload new avatar to Vercel Blob
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const fileName = `avatar-${timestamp}.${fileExtension}`;

    const blob = await put(fileName, file, {
      access: 'public',
      contentType: file.type,
    });

    // Save avatar data
    const newData = { avatarUrl: blob.url };
    await saveAvatarData(newData);

    return NextResponse.json({ message: 'Avatar uploaded successfully', avatarUrl: blob.url });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json({ message: 'Error uploading avatar', error: error.message }, { status: 500 });
  }
}