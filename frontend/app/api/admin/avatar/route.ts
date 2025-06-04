import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { kv } from '@vercel/kv';

const AVATAR_KEY = 'admin_avatar_url';

// GET handler to retrieve avatar data
export async function GET() {
  try {
    const avatarUrl = await kv.get<string>(AVATAR_KEY);
    return NextResponse.json({ avatarUrl: avatarUrl || '' });
  } catch (error) {
    console.error('Error reading avatar data:', error);
    return NextResponse.json({ message: 'Error reading avatar data' }, { status: 500 });
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
      const currentAvatarUrl = await kv.get<string>(AVATAR_KEY);
      if (currentAvatarUrl) {
        await del(currentAvatarUrl);
      }
    } catch (e) {
      console.warn('Could not delete old avatar from Vercel Blob:', (e as Error).message);
    }

    const blob = await put(file.name, file, {
      access: 'public',
    });

    await kv.set(AVATAR_KEY, blob.url);

    return NextResponse.json({ message: 'Avatar uploaded successfully', avatarUrl: blob.url });

  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json({ message: 'Error uploading avatar', error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}