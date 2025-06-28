import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';

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
  uploadedAt: string;
  size?: number;
}

interface CategoryData {
  [key: string]: CategorizedMedia[];
}

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

// GET handler for real-time sync - returns only the latest changes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lastSync = searchParams.get('lastSync');
    const lastSyncDate = lastSync ? new Date(lastSync) : new Date(0);

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN is not set' }, { status: 500 });
    }

    // List all blobs with categorized-gallery prefix
    const { blobs } = await list({
      prefix: 'categorized-gallery/',
      token,
      limit: 1000
    });

    const categoryData: CategoryData = {};
    const changes: Array<{
      action: 'added' | 'updated';
      media: CategorizedMedia;
    }> = [];

    for (const blob of blobs) {
      try {
        const blobDate = new Date(blob.uploadedAt);
        
        // Extract media info from blob metadata
        const metadata = blob.metadata || {};
        const category = metadata.category as string;
        const name = metadata.name as string;
        const subtitle = metadata.subtitle as string;
        const type = metadata.type as 'image' | 'video';
        const width = metadata.width ? parseInt(metadata.width as string) : undefined;
        const height = metadata.height ? parseInt(metadata.height as string) : undefined;

        if (category && VALID_CATEGORIES.includes(category)) {
          if (!categoryData[category]) {
            categoryData[category] = [];
          }

          const mediaItem: CategorizedMedia = {
            id: blob.pathname.split('/').pop() || blob.pathname,
            url: blob.url,
            name: name || blob.pathname.split('/').pop() || 'Untitled',
            subtitle: subtitle || '',
            category,
            type: type || (blob.contentType?.startsWith('video/') ? 'video' : 'image'),
            width,
            height,
            uploadedAt: blob.uploadedAt,
            size: blob.size
          };

          categoryData[category].push(mediaItem);

          // Track changes since last sync
          if (blobDate > lastSyncDate) {
            changes.push({
              action: 'added', // We can't easily distinguish between added/updated without more metadata
              media: mediaItem
            });
          }
        }
      } catch (error) {
        console.warn(`Error processing blob ${blob.pathname}:`, error);
      }
    }

    // Sort items by upload date (newest first)
    Object.keys(categoryData).forEach(category => {
      categoryData[category].sort((a, b) => 
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );
    });

    return NextResponse.json({
      data: categoryData,
      changes,
      lastSync: new Date().toISOString(),
      hasChanges: changes.length > 0
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    });

  } catch (error: any) {
    console.error('Error in sync endpoint:', error);
    return NextResponse.json({ 
      error: 'Error syncing data',
      message: error.message 
    }, { status: 500 });
  }
}