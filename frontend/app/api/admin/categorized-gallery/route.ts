import { NextRequest, NextResponse } from 'next/server';
import { put, del, head } from '@vercel/blob';

export const dynamic = 'force-dynamic';

interface CategorizedMedia {
  id: string;
  url: string;
  name: string;
  subtitle?: string;
  category: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
}

interface CategoryData {
  [key: string]: CategorizedMedia[];
}

const CATEGORIZED_CONFIG_KEY = 'categorized-gallery-config.json';

const VALID_CATEGORIES = [
  'architecture',
  'watercolors', 
  'sketches',
  'native-plants',
  'vegetables',
  'beekeeping',
  'mead-making',
  'furniture'
];

// Helper function to get categorized gallery data from Vercel Blob
async function readCategorizedData(): Promise<CategoryData> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.warn('BLOB_READ_WRITE_TOKEN is not set. Categorized gallery functionality might be limited.');
    return {};
  }

  try {
    const headResult = await head(CATEGORIZED_CONFIG_KEY, { token });
    const response = await fetch(headResult.url, { cache: 'no-store' });

    if (response.ok) {
      return await response.json();
    }
    if (response.status === 404) {
      console.log(`Categorized gallery config file '${CATEGORIZED_CONFIG_KEY}' not found.`);
      return {};
    }
    console.error(`Error fetching categorized gallery config: ${response.status} ${response.statusText}`);
    return {};
  } catch (error: any) {
    if ((error.status && error.status === 404) || (error.message && error.message.toLowerCase().includes('does not exist'))) {
        console.log(`Categorized gallery config file '${CATEGORIZED_CONFIG_KEY}' not found in blob storage.`);
        return {};
    }
    console.error('Error in readCategorizedData:', error);
    return {};
  }
}

// Helper function to save categorized gallery data to Vercel Blob
async function writeCategorizedData(data: CategoryData): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error('BLOB_READ_WRITE_TOKEN is not set. Cannot save categorized gallery data.');
    return;
  }
  await put(CATEGORIZED_CONFIG_KEY, JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
    token: token,
    allowOverwrite: true,
  });
}

// GET handler to retrieve all categorized gallery data
export async function GET() {
  try {
    const data = await readCategorizedData();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    });
  } catch (error) {
    return NextResponse.json({ message: 'Error reading categorized gallery data' }, { status: 500 });
  }
}

// POST handler to upload a new categorized media item
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('media') as File | null;
    const category = formData.get('category') as string;
    const name = formData.get('name') as string;
    const subtitle = formData.get('subtitle') as string;

    if (!file) {
      return NextResponse.json({ message: 'No media file provided' }, { status: 400 });
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ message: 'Invalid or missing category' }, { status: 400 });
    }

    // Determine media type
    const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
    
    // Upload media to Vercel Blob
    const fileExtension = file.name.split('.').pop() || (mediaType === 'video' ? 'mp4' : 'jpg');
    const timestamp = Date.now();
    const fileName = `${category}-${timestamp}.${fileExtension}`;

    const blob = await put(fileName, file, {
      access: 'public',
      contentType: file.type,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      allowOverwrite: true,
    });

    const data = await readCategorizedData();
    const newMedia: CategorizedMedia = {
      id: fileName,
      url: blob.url,
      name: name || file.name,
      subtitle: subtitle || '',
      category,
      type: mediaType,
    };

    // Initialize category array if it doesn't exist
    if (!data[category]) {
      data[category] = [];
    }
    
    data[category].push(newMedia);
    await writeCategorizedData(data);

    return NextResponse.json({ 
      message: 'Media uploaded successfully', 
      media: newMedia 
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    });
  } catch (error: any) {
    console.error('Error uploading categorized media:', error);
    return NextResponse.json({ 
      message: 'Error uploading media', 
      error: error.message 
    }, { status: 500 });
  }
}

// DELETE handler to remove a categorized media item
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get('id');
    const category = searchParams.get('category');

    if (!mediaId) {
      return NextResponse.json({ message: 'Media ID is required' }, { status: 400 });
    }

    if (!category) {
      return NextResponse.json({ message: 'Category is required' }, { status: 400 });
    }

    const data = await readCategorizedData();
    
    if (!data[category]) {
      return NextResponse.json({ message: 'Category not found' }, { status: 404 });
    }

    const mediaIndex = data[category].findIndex(item => item.id === mediaId);

    if (mediaIndex === -1) {
      return NextResponse.json({ message: 'Media not found' }, { status: 404 });
    }

    const mediaToDelete = data[category][mediaIndex];

    // Delete the media from Vercel Blob
    try {
      if (mediaToDelete.url.includes('.public.blob.vercel-storage.com/')) {
        await del(mediaToDelete.url, { token: process.env.BLOB_READ_WRITE_TOKEN });
      }
    } catch (e) {
      console.warn(`Could not delete media file from blob storage:`, e);
    }

    data[category].splice(mediaIndex, 1);
    await writeCategorizedData(data);

    return NextResponse.json({ message: 'Media deleted successfully' }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    });
  } catch (error: any) {
    console.error('Error deleting categorized media:', error);
    return NextResponse.json({ 
      message: 'Error deleting media', 
      error: error.message 
    }, { status: 500 });
  }
}