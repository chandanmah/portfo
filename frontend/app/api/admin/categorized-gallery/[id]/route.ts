import { NextRequest, NextResponse } from 'next/server';
import { put, del, list } from '@vercel/blob';

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

// Helper function to find blob by ID
async function findBlobById(id: string): Promise<{ url: string; pathname: string; metadata?: Record<string, string> } | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not set.');
  }

  try {
    const { blobs } = await list({
      prefix: 'categorized-gallery/',
      token,
      limit: 1000
    });

    // Find blob by ID (which should be the filename part)
    const blob = blobs.find(b => {
      const fileName = b.pathname.split('/').pop();
      return fileName === id || b.pathname.endsWith(`/${id}`);
    });

    return blob || null;
  } catch (error) {
    console.error('Error finding blob:', error);
    return null;
  }
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

    // Find the existing blob
    const existingBlob = await findBlobById(id);
    if (!existingBlob) {
      return NextResponse.json({ message: 'Media not found' }, { status: 404 });
    }

    const currentMetadata = existingBlob.metadata || {};
    const oldCategory = currentMetadata.category;

    // If category is changing, we need to create a new blob with new path and delete the old one
    if (category && category !== oldCategory) {
      try {
        // Download the existing blob content
        const response = await fetch(existingBlob.url);
        if (!response.ok) {
          throw new Error('Failed to fetch existing blob content');
        }
        const blob = await response.blob();

        // Create new filename with new category
        const originalFileName = currentMetadata.originalName || id;
        const fileExtension = originalFileName.split('.').pop() || 'jpg';
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const cleanName = name.replace(/[^a-zA-Z0-9-_]/g, '-');
        const newFileName = `categorized-gallery/${category}-${cleanName}-${timestamp}-${randomSuffix}.${fileExtension}`;

        // Prepare updated metadata
        const updatedMetadata = {
          ...currentMetadata,
          name,
          subtitle: subtitle || '',
          category
        };

        // Upload new blob with updated metadata
        const newBlob = await retryOperation(async () => {
          return await put(newFileName, blob, {
            access: 'public',
            contentType: blob.type,
            token: process.env.BLOB_READ_WRITE_TOKEN,
            addRandomSuffix: false,
            metadata: updatedMetadata
          });
        });

        // Delete the old blob
        try {
          await retryOperation(async () => {
            return await del(existingBlob.pathname, { token: process.env.BLOB_READ_WRITE_TOKEN });
          });
        } catch (deleteError) {
          console.warn('Failed to delete old blob:', deleteError);
          // Continue even if deletion fails
        }

        const updatedMedia: CategorizedMedia = {
          id: newFileName.split('/').pop() || newFileName,
          url: newBlob.url,
          name,
          subtitle: subtitle || '',
          category,
          type: (currentMetadata.type as 'image' | 'video') || 'image',
          width: currentMetadata.width ? parseInt(currentMetadata.width) : undefined,
          height: currentMetadata.height ? parseInt(currentMetadata.height) : undefined,
          uploadedAt: currentMetadata.uploadedAt || new Date().toISOString(),
          size: blob.size
        };

        return NextResponse.json({ 
          message: 'Media updated successfully', 
          media: updatedMedia 
        }, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
          }
        });

      } catch (error: any) {
        console.error('Error updating media with category change:', error);
        return NextResponse.json({ 
          message: 'Error updating media', 
          error: error.message 
        }, { status: 500 });
      }
    } else {
      // Just update metadata without changing category
      try {
        // Download the existing blob content
        const response = await fetch(existingBlob.url);
        if (!response.ok) {
          throw new Error('Failed to fetch existing blob content');
        }
        const blob = await response.blob();

        // Prepare updated metadata
        const updatedMetadata = {
          ...currentMetadata,
          name,
          subtitle: subtitle || ''
        };

        // Re-upload with updated metadata (same path)
        const updatedBlob = await retryOperation(async () => {
          return await put(existingBlob.pathname, blob, {
            access: 'public',
            contentType: blob.type,
            token: process.env.BLOB_READ_WRITE_TOKEN,
            addRandomSuffix: false,
            metadata: updatedMetadata
          });
        });

        const updatedMedia: CategorizedMedia = {
          id,
          url: updatedBlob.url,
          name,
          subtitle: subtitle || '',
          category: currentMetadata.category || 'architecture',
          type: (currentMetadata.type as 'image' | 'video') || 'image',
          width: currentMetadata.width ? parseInt(currentMetadata.width) : undefined,
          height: currentMetadata.height ? parseInt(currentMetadata.height) : undefined,
          uploadedAt: currentMetadata.uploadedAt || new Date().toISOString(),
          size: blob.size
        };

        return NextResponse.json({ 
          message: 'Media updated successfully', 
          media: updatedMedia 
        }, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
          }
        });

      } catch (error: any) {
        console.error('Error updating media metadata:', error);
        return NextResponse.json({ 
          message: 'Error updating media', 
          error: error.message 
        }, { status: 500 });
      }
    }

  } catch (error: any) {
    console.error('Error in PUT /api/admin/categorized-gallery/[id]:', error);
    return NextResponse.json({ 
      message: 'Error updating media', 
      error: error.message 
    }, { status: 500 });
  }
}