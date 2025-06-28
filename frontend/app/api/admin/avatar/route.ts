import { NextRequest, NextResponse } from 'next/server';
import { put, del, list } from '@vercel/blob';

const AVATAR_CONFIG_KEY = 'avatar-config.json';

// Helper function to get current avatar data from Vercel Blob
async function getAvatarData(): Promise<{ avatarUrl: string } | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.warn('BLOB_READ_WRITE_TOKEN is not set. Avatar functionality might be limited.');
    return null;
  }

  try {
    // List all blobs to find avatar files
    const { blobs } = await list({
      prefix: 'avatar-',
      token,
      limit: 10
    });

    // Find the most recent avatar
    const avatarBlobs = blobs
      .filter(blob => blob.pathname.startsWith('avatar-'))
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    if (avatarBlobs.length > 0) {
      return { avatarUrl: avatarBlobs[0].url };
    }

    // Fallback: try to get from config file
    try {
      const configBlobs = await list({
        prefix: AVATAR_CONFIG_KEY,
        token,
        limit: 1
      });

      if (configBlobs.blobs.length > 0) {
        const response = await fetch(configBlobs.blobs[0].url);
        if (response.ok) {
          return await response.json();
        }
      }
    } catch (configError) {
      console.warn('Could not read avatar config:', configError);
    }

    return null;
  } catch (error) {
    console.error('Error in getAvatarData:', error);
    return null;
  }
}

// Helper function to save avatar data to Vercel Blob
async function saveAvatarData(data: { avatarUrl: string }): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error('BLOB_READ_WRITE_TOKEN is not set. Cannot save avatar data.');
    return;
  }
  
  try {
    await put(AVATAR_CONFIG_KEY, JSON.stringify(data), {
      access: 'public',
      contentType: 'application/json',
      token: token,
      allowOverwrite: true,
    });
  } catch (error) {
    console.error('Error saving avatar config:', error);
  }
}

// GET handler to retrieve avatar data
export async function GET() {
  try {
    const data = await getAvatarData();
    return NextResponse.json(data || { avatarUrl: '' }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    });
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

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json({ message: 'Storage not configured' }, { status: 500 });
    }

    // Clean up old avatars
    try {
      const { blobs } = await list({
        prefix: 'avatar-',
        token,
        limit: 100
      });

      // Delete all existing avatar files
      for (const blob of blobs) {
        try {
          await del(blob.url, { token });
          console.log(`Deleted old avatar: ${blob.pathname}`);
        } catch (deleteError) {
          console.warn(`Could not delete old avatar ${blob.pathname}:`, deleteError);
        }
      }
    } catch (cleanupError) {
      console.warn('Could not clean up old avatars:', cleanupError);
    }

    // Upload new avatar to Vercel Blob
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const fileName = `avatar-${timestamp}.${fileExtension}`;

    console.log(`Uploading new avatar: ${fileName}`);

    const blob = await put(fileName, file, {
      access: 'public',
      contentType: file.type,
      allowOverwrite: true,
      token: token,
      metadata: {
        type: 'avatar',
        originalName: file.name,
        uploadedAt: new Date().toISOString()
      }
    });

    console.log(`Avatar uploaded successfully: ${blob.url}`);

    // Save avatar data to config
    const newData = { avatarUrl: blob.url };
    await saveAvatarData(newData);

    return NextResponse.json({ 
      message: 'Avatar uploaded successfully', 
      avatarUrl: blob.url 
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    });
  } catch (error: any) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json({ 
      message: 'Error uploading avatar', 
      error: error.message 
    }, { status: 500 });
  }
}