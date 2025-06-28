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

// Helper function to retry operations with exponential backoff
async function retryOperation<T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      if (attempt === maxRetries) break;
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Helper function to get all categorized media from blob metadata
async function readCategorizedDataFromBlobs(): Promise<CategoryData> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.warn('BLOB_READ_WRITE_TOKEN is not set.');
    return {};
  }

  try {
    return await retryOperation(async () => {
      // List all blobs with categorized-gallery prefix
      const { blobs } = await list({
        prefix: 'categorized-gallery/',
        token,
        limit: 1000 // Adjust based on your needs
      });

      const categoryData: CategoryData = {};

      for (const blob of blobs) {
        try {
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

      return categoryData;
    });
  } catch (error: any) {
    console.error('Error reading categorized data from blobs:', error);
    return {};
  }
}

// GET handler to retrieve all categorized gallery data
export async function GET() {
  try {
    const data = await readCategorizedDataFromBlobs();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('Error in GET /api/admin/categorized-gallery:', error);
    return NextResponse.json({ 
      message: 'Error reading categorized gallery data',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to validate file
function validateFile(file: File): { isValid: boolean; error?: string } {
  const maxSize = 50 * 1024 * 1024; // 50MB
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'
  ];

  if (file.size > maxSize) {
    return { isValid: false, error: 'File size exceeds 50MB limit' };
  }

  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Invalid file type. Only images and videos are allowed.' };
  }

  return { isValid: true };
}

// Helper function to generate unique filename
function generateUniqueFileName(category: string, originalName: string, mediaType: string): string {
  const fileExtension = originalName.split('.').pop() || (mediaType === 'video' ? 'mp4' : 'jpg');
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const cleanName = originalName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, '-');
  return `categorized-gallery/${category}-${cleanName}-${timestamp}-${randomSuffix}.${fileExtension}`;
}

// Helper function to get image dimensions
async function getImageDimensions(file: File): Promise<{ width?: number; height?: number }> {
  if (!file.type.startsWith('image/')) {
    return {};
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({});
    };
    
    img.src = url;
  });
}

// POST handler to upload new categorized media items
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('media') as File[];
    const category = formData.get('category') as string;
    const names = formData.getAll('name') as string[];
    const subtitles = formData.getAll('subtitle') as string[];

    if (!files || files.length === 0) {
      return NextResponse.json({ message: 'No media files provided' }, { status: 400 });
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ message: 'Invalid or missing category' }, { status: 400 });
    }

    const uploadResults: Array<{ success: boolean; media?: CategorizedMedia; error?: string; fileName?: string }> = [];

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const name = names[i] || file.name.replace(/\.[^/.]+$/, "");
      const subtitle = subtitles[i] || '';

      try {
        // Validate file
        const validation = validateFile(file);
        if (!validation.isValid) {
          uploadResults.push({
            success: false,
            error: validation.error,
            fileName: file.name
          });
          continue;
        }

        // Determine media type
        const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
        
        // Generate unique filename
        const fileName = generateUniqueFileName(category, file.name, mediaType);

        // Get image dimensions if it's an image
        const dimensions = await getImageDimensions(file);

        // Prepare metadata
        const metadata = {
          category,
          name,
          subtitle,
          type: mediaType,
          originalName: file.name,
          uploadedBy: 'admin', // You can enhance this with actual user info
          ...(dimensions.width && { width: dimensions.width.toString() }),
          ...(dimensions.height && { height: dimensions.height.toString() })
        };

        // Upload media to Vercel Blob with metadata
        const blob = await retryOperation(async () => {
          return await put(fileName, file, {
            access: 'public',
            contentType: file.type,
            token: process.env.BLOB_READ_WRITE_TOKEN,
            addRandomSuffix: false,
            metadata
          });
        }, 3);

        const newMedia: CategorizedMedia = {
          id: fileName.split('/').pop() || fileName,
          url: blob.url,
          name,
          subtitle,
          category,
          type: mediaType as 'image' | 'video',
          width: dimensions.width,
          height: dimensions.height,
          uploadedAt: new Date().toISOString(),
          size: file.size
        };

        uploadResults.push({
          success: true,
          media: newMedia
        });

      } catch (error: any) {
        console.error(`Error uploading file ${file.name}:`, error);
        uploadResults.push({
          success: false,
          error: error.message || 'Upload failed',
          fileName: file.name
        });
      }
    }

    const successCount = uploadResults.filter(r => r.success).length;
    const failureCount = uploadResults.filter(r => !r.success).length;

    let message = '';
    if (successCount > 0 && failureCount === 0) {
      message = `Successfully uploaded ${successCount} file(s)`;
    } else if (successCount > 0 && failureCount > 0) {
      message = `Uploaded ${successCount} file(s), ${failureCount} failed`;
    } else {
      message = `All ${failureCount} uploads failed`;
    }

    return NextResponse.json({ 
      message,
      results: uploadResults,
      successCount,
      failureCount
    }, {
      status: successCount > 0 ? 200 : 400,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    });

  } catch (error: any) {
    console.error('Error in POST /api/admin/categorized-gallery:', error);
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

    // Construct the blob path
    const blobPath = `categorized-gallery/${mediaId}`;

    // Delete the media from Vercel Blob
    try {
      await retryOperation(async () => {
        return await del(blobPath, { token: process.env.BLOB_READ_WRITE_TOKEN });
      }, 3);
    } catch (error: any) {
      console.error(`Error deleting blob ${blobPath}:`, error);
      // Continue even if blob deletion fails - it might already be deleted
    }

    return NextResponse.json({ message: 'Media deleted successfully' }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    });

  } catch (error: any) {
    console.error('Error in DELETE /api/admin/categorized-gallery:', error);
    return NextResponse.json({ 
      message: 'Error deleting media', 
      error: error.message 
    }, { status: 500 });
  }
}