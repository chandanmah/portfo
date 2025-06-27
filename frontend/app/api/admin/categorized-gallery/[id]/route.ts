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

// Helper function for retrying operations with exponential backoff
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      if (i === maxRetries - 1) throw error;
      console.warn(`Operation failed. Retrying in ${delay / 1000}s... (Attempt ${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
  throw new Error('Operation failed after maximum retries');
}

// Helper function to get categorized gallery data from Vercel Blob
async function readCategorizedData(): Promise<CategoryData> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.warn('BLOB_READ_WRITE_TOKEN is not set. Categorized gallery functionality might be limited.');
    return {};
  }

  return retryOperation(async () => {
    try {
      const headResult = await head(CATEGORIZED_CONFIG_KEY, { token });
      const response = await fetch(headResult.url, { cache: 'no-store' });

      if (response.ok) {
        const data = await response.json();
        return data || {};
      }
      if (response.status === 404) {
        console.log(`Config file not found, returning empty object.`);
        return {};
      }
      throw new Error(`Failed to fetch config: ${response.statusText}`);
    } catch (error: any) {
      if (error.message.includes('does not exist')) {
        console.log(`Config file not found, returning empty object.`);
        return {};
      }
      throw error;
    }
  });
}

// Helper function to save categorized gallery data to Vercel Blob
async function writeCategorizedData(data: CategoryData): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not set.');
  }

  await retryOperation(async () => {
    await put(CATEGORIZED_CONFIG_KEY, JSON.stringify(data), {
      access: 'public',
      contentType: 'application/json',
      token: token,
      addRandomSuffix: false,
    });
  });
}

// PUT handler to update a categorized media item
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, subtitle, category } = body;

    if (!name) {
      return NextResponse.json({ message: 'Name is required' }, { status: 400 });
    }

    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ message: 'Invalid category' }, { status: 400 });
    }

    const data = await readCategorizedData();
    let mediaItem: CategorizedMedia | null = null;
    let oldCategory: string | null = null;

    // Find the media item across all categories
    for (const [cat, items] of Object.entries(data)) {
      const foundItem = items.find(item => item.id === id);
      if (foundItem) {
        mediaItem = foundItem;
        oldCategory = cat;
        break;
      }
    }

    if (!mediaItem || !oldCategory) {
      return NextResponse.json({ message: 'Media not found' }, { status: 404 });
    }

    // Update the media item
    mediaItem.name = name;
    if (subtitle !== undefined) {
      mediaItem.subtitle = subtitle;
    }

    // If category is being changed, move the item
    if (category && category !== oldCategory) {
      // Remove from old category
      const oldCategoryIndex = data[oldCategory].findIndex(item => item.id === id);
      if (oldCategoryIndex !== -1) {
        data[oldCategory].splice(oldCategoryIndex, 1);
      }

      // Update category in media item
      mediaItem.category = category;

      // Add to new category
      if (!data[category]) {
        data[category] = [];
      }
      data[category].push(mediaItem);
    }

    await writeCategorizedData(data);

    return NextResponse.json({ 
      message: 'Media updated successfully', 
      media: mediaItem 
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    });
  } catch (error: any) {
    console.error('Error updating categorized media:', error);
    return NextResponse.json({ 
      message: 'Error updating media', 
      error: error.message 
    }, { status: 500 });
  }
}