import { NextRequest, NextResponse } from 'next/server';
import { put, del, head } from '@vercel/blob';

const AVATAR_CONFIG_KEY = 'avatar-config.json';

// Helper function to get current avatar data from Vercel Blob
async function getAvatarData(): Promise<{ avatarUrl: string } | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.warn('BLOB_READ_WRITE_TOKEN is not set. Avatar functionality might be limited.');
    // Optional: Add local fallback logic here if needed for development without a token
    // For now, we'll assume Vercel environment or token is available for core functionality.
    return null;
  }

  try {
    const headResult = await head(AVATAR_CONFIG_KEY, { token });
    const response = await fetch(headResult.url); // Fetch content from the URL provided by head

    if (response.ok) {
      return await response.json();
    }
    if (response.status === 404) {
      console.log(`Avatar config file '${AVATAR_CONFIG_KEY}' not found.`);
      return null;
    }
    console.error(`Error fetching avatar config: ${response.status} ${response.statusText}`);
    return null;
  } catch (error) {
    // Handle cases where head throws a 404 or other errors
    if ((error.status && error.status === 404) || (error.message && error.message.toLowerCase().includes('does not exist'))) {
        console.log(`Avatar config file '${AVATAR_CONFIG_KEY}' not found in blob storage.`);
        return null;
    }
    console.error('Error in getAvatarData:', error);
    return null;
  }
}

// Helper function to save avatar data to Vercel Blob
async function saveAvatarData(data: { avatarUrl: string }): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error('BLOB_READ_WRITE_TOKEN is not set. Cannot save avatar data.');
    return; // Or throw an error
  }
  await put(AVATAR_CONFIG_KEY, JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
    token: token, // Explicitly pass token
    allowOverwrite: true, // Allow overwriting the config file
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
        if (oldAvatarUrl.includes('.public.blob.vercel-storage.com/')) { // More specific check for Vercel Blob URL structure
          await del(oldAvatarUrl, { token: process.env.BLOB_READ_WRITE_TOKEN });
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
      allowOverwrite: true, // Allow overwriting existing avatar
      token: process.env.BLOB_READ_WRITE_TOKEN, // Ensure token is passed for avatar image upload
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