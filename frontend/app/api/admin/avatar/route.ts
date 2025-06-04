import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';

interface AdminData {
  avatarUrl: string;
  name: string;
  title: string;
  bio: string;
}

const ADMIN_DATA_KEY = 'admin-data.json';

async function readAdminData(): Promise<AdminData> {
  try {
    // Try to fetch from Vercel Blob storage
    const response = await fetch(`${process.env.BLOB_READ_WRITE_TOKEN ? 'https://blob.vercel-storage.com' : ''}/admin-data.json`, {
      headers: {
        'Authorization': `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
      }
    });
    
    if (response.ok) {
      return await response.json();
    }
    
    // If not found, return default structure
    return {
      avatarUrl: '/default-avatar.jpg',
      name: 'Mr. Mahanta',
      title: 'Artist & Painter',
      bio: 'A passionate artist creating beautiful works of art.'
    };
  } catch (error) {
    console.error('Error reading admin data:', error);
    // Return default structure on error
    return {
      avatarUrl: '/default-avatar.jpg',
      name: 'Mr. Mahanta',
      title: 'Artist & Painter',
      bio: 'A passionate artist creating beautiful works of art.'
    };
  }
}

async function writeAdminData(data: AdminData) {
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    await put(ADMIN_DATA_KEY, blob, {
      access: 'public',
    });
  } catch (error) {
    console.error('Error writing admin data:', error);
    throw error;
  }
}

// GET handler to retrieve avatar data
export async function GET() {
  try {
    const data = await readAdminData();
    return NextResponse.json(data);
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
    const name = formData.get('name') as string;
    const title = formData.get('title') as string;
    const bio = formData.get('bio') as string;

    if (!file) {
      return NextResponse.json({ message: 'No avatar file provided' }, { status: 400 });
    }

    // Get current data to preserve existing values and clean up old avatar
    const currentData = await readAdminData();
    
    // Clean up old avatar if it exists and is stored in blob storage
    if (currentData.avatarUrl && currentData.avatarUrl.includes('blob.vercel-storage.com')) {
      try {
        const urlParts = currentData.avatarUrl.split('/');
        const oldBlobKey = urlParts[urlParts.length - 1];
        await del(oldBlobKey);
      } catch (e) {
        console.warn(`Could not delete old avatar from blob storage:`, e.message);
      }
    }

    // Upload new avatar to Vercel Blob
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const uniqueFileName = `avatar-${timestamp}.${fileExtension}`;
    
    const blob = await put(uniqueFileName, file, {
      access: 'public',
    });

    // Update admin data with new avatar URL and other fields
    const newData: AdminData = {
      avatarUrl: blob.url,
      name: name || currentData.name,
      title: title || currentData.title,
      bio: bio || currentData.bio
    };
    
    await writeAdminData(newData);

    return NextResponse.json({ message: 'Avatar uploaded successfully', data: newData });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json({ message: 'Error uploading avatar', error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}