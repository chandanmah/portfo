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

// Helper function to get all categorized media from blob metadata with improved error handling
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
        limit: 1000
      });

      console.log(`Found ${blobs.length} categorized gallery blobs`);

      const categoryData: CategoryData = {};
      const processedIds = new Set<string>();

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

          // Generate unique ID from pathname
          const id = blob.pathname.split('/').pop() || blob.pathname;
          
          // Skip duplicates
          if (processedIds.has(id)) {
            console.warn(`Duplicate blob ID found: ${id}`);
            continue;
          }
          processedIds.add(id);

          // Validate category
          if (!category || !VALID_CATEGORIES.includes(category)) {
            console.warn(`Invalid or missing category for blob ${blob.pathname}: ${category}`, metadata);
            continue;
          }

          if (!categoryData[category]) {
            categoryData[category] = [];
          }

          const mediaItem: CategorizedMedia = {
            id,
            url: blob.url,
            name: name || id.replace(/\.[^/.]+$/, '') || 'Untitled',
            subtitle: subtitle || '',
            category,
            type: type || (blob.contentType?.startsWith('video/') ? 'video' : 'image'),
            width,
            height,
            uploadedAt: blob.uploadedAt,
            size: blob.size
          };

          categoryData[category].push(mediaItem);
          console.log(`Processed media item: ${mediaItem.name} in ${category}`);
        } catch (error) {
          console.warn(`Error processing blob ${blob.pathname}:`, error);
        }
      }

      // Sort items by upload date (newest first) and ensure consistency
      Object.keys(categoryData).forEach(category => {
        categoryData[category].sort((a, b) => 
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        );
      });

      console.log('Final category data:', Object.keys(categoryData).map(cat => `${cat}: ${categoryData[cat].length} items`));

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
    
    // Add cache-busting timestamp
    const timestamp = new Date().toISOString();
    
    return NextResponse.json({
      ...data,
      _metadata: {
        lastUpdated: timestamp,
        totalItems: Object.values(data).reduce((sum, items) => sum + items.length, 0)
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        'X-Timestamp': timestamp
      }
    });
  } catch (error) {
    console.error('Error in GET /api/admin/categorized-gallery:', error);
    return NextResponse.json({ 
      message: 'Error reading categorized gallery data',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
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

// Helper function to generate unique filename with better collision avoidance
function generateUniqueFileName(category: string, originalName: string, mediaType: string): string {
  const fileExtension = originalName.split('.').pop() || (mediaType === 'video' ? 'mp4' : 'jpg');
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const cleanName = originalName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, '-').substring(0, 30);
  return `categorized-gallery/${category}-${cleanName}-${timestamp}-${randomSuffix}.${fileExtension}`;
}

// Helper function to verify blob metadata after upload
async function verifyBlobMetadata(pathname: string, expectedMetadata: Record<string, string>): Promise<boolean> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return false;

  try {
    const { blobs } = await list({
      prefix: pathname,
      token,
      limit: 1
    });

    if (blobs.length === 0) {
      console.error(`Verification failed: Blob not found at ${pathname}`);
      return false;
    }

    const blob = blobs[0];
    const metadata = blob.metadata || {};

    // Check critical metadata fields
    const criticalFields = ['category', 'name', 'type'];
    for (const field of criticalFields) {
      if (!metadata[field] || metadata[field] !== expectedMetadata[field]) {
        console.error(`Verification failed: Missing or incorrect ${field}. Expected: ${expectedMetadata[field]}, Got: ${metadata[field]}`);
        return false;
      }
    }

    console.log(`Verification successful for ${pathname}:`, metadata);
    return true;
  } catch (error) {
    console.error(`Verification error for ${pathname}:`, error);
    return false;
  }
}

// POST handler to upload new categorized media items with GUARANTEED metadata
export async function POST(request: NextRequest) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json({ message: 'BLOB_READ_WRITE_TOKEN is not configured' }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    
    // Handle both single and multiple file uploads
    const mediaFiles = formData.getAll('media') as File[];
    const category = formData.get('category') as string;
    const name = formData.get('name') as string;
    const subtitle = formData.get('subtitle') as string;

    console.log('=== UPLOAD REQUEST RECEIVED ===');
    console.log('Files:', mediaFiles.length);
    console.log('Category:', category);
    console.log('Name:', name);
    console.log('Subtitle:', subtitle);

    if (!mediaFiles || mediaFiles.length === 0) {
      return NextResponse.json({ message: 'No media files provided' }, { status: 400 });
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ 
        message: `Invalid or missing category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
        receivedCategory: category
      }, { status: 400 });
    }

    const uploadResults: Array<{ 
      success: boolean; 
      media?: CategorizedMedia; 
      error?: string; 
      fileName?: string;
      originalName?: string;
    }> = [];

    // Process each file with GUARANTEED metadata attachment
    for (let i = 0; i < mediaFiles.length; i++) {
      const file = mediaFiles[i];
      const fileName = name || file.name.replace(/\.[^/.]+$/, "");
      const fileSubtitle = subtitle || '';

      console.log(`\n=== PROCESSING FILE ${i + 1}/${mediaFiles.length} ===`);
      console.log('Original name:', file.name);
      console.log('File size:', file.size);
      console.log('File type:', file.type);
      console.log('Display name:', fileName);
      console.log('Subtitle:', fileSubtitle);
      console.log('Category:', category);

      try {
        // Validate file
        const validation = validateFile(file);
        if (!validation.isValid) {
          console.error('File validation failed:', validation.error);
          uploadResults.push({
            success: false,
            error: validation.error,
            fileName: file.name,
            originalName: file.name
          });
          continue;
        }

        // Determine media type
        const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
        
        // Generate unique filename
        const blobFileName = generateUniqueFileName(category, file.name, mediaType);
        console.log('Generated blob filename:', blobFileName);

        // Prepare COMPREHENSIVE metadata - THIS IS THE CRITICAL FIX
        const metadata = {
          // REQUIRED FIELDS - These MUST be present for the gallery to work
          category: category,
          name: fileName,
          subtitle: fileSubtitle,
          type: mediaType,
          
          // ADDITIONAL METADATA for completeness
          originalName: file.name,
          uploadedBy: 'admin',
          uploadedAt: new Date().toISOString(),
          fileSize: file.size.toString(),
          contentType: file.type,
          
          // VERSION for tracking
          metadataVersion: '2.0'
        };

        console.log('Metadata to attach:', metadata);

        // STEP 1: Upload to blob storage with metadata
        console.log('Step 1: Uploading to blob storage...');
        const blob = await retryOperation(async () => {
          return await put(blobFileName, file, {
            access: 'public',
            contentType: file.type,
            token: token,
            addRandomSuffix: false,
            metadata: metadata // CRITICAL: Attach metadata
          });
        }, 3);

        console.log('Blob upload result:', {
          url: blob.url,
          pathname: blob.pathname
        });

        // STEP 2: VERIFY metadata was attached correctly
        console.log('Step 2: Verifying metadata...');
        const verificationPassed = await verifyBlobMetadata(blobFileName, metadata);
        
        if (!verificationPassed) {
          // If verification fails, try to re-upload with metadata
          console.warn('Metadata verification failed, attempting re-upload...');
          
          try {
            // Delete the failed upload
            await del(blob.url, { token });
            
            // Re-upload with metadata
            const retryBlob = await put(blobFileName, file, {
              access: 'public',
              contentType: file.type,
              token: token,
              addRandomSuffix: false,
              metadata: metadata
            });
            
            // Verify again
            const retryVerification = await verifyBlobMetadata(blobFileName, metadata);
            if (!retryVerification) {
              throw new Error('Metadata verification failed after retry');
            }
            
            console.log('Re-upload successful with verified metadata');
          } catch (retryError) {
            console.error('Re-upload failed:', retryError);
            throw new Error(`Metadata attachment failed: ${retryError.message}`);
          }
        }

        // STEP 3: Create media object
        const newMedia: CategorizedMedia = {
          id: blobFileName.split('/').pop() || blobFileName,
          url: blob.url,
          name: fileName,
          subtitle: fileSubtitle,
          category: category,
          type: mediaType as 'image' | 'video',
          uploadedAt: new Date().toISOString(),
          size: file.size
        };

        console.log('✅ Upload successful! Created media object:', newMedia);

        uploadResults.push({
          success: true,
          media: newMedia,
          originalName: file.name
        });

      } catch (error: any) {
        console.error(`❌ Error uploading file ${file.name}:`, error);
        uploadResults.push({
          success: false,
          error: error.message || 'Upload failed',
          fileName: file.name,
          originalName: file.name
        });
      }
    }

    const successCount = uploadResults.filter(r => r.success).length;
    const failureCount = uploadResults.filter(r => !r.success).length;

    let message = '';
    if (successCount > 0 && failureCount === 0) {
      message = `Successfully uploaded ${successCount} file(s) to category "${category}"`;
    } else if (successCount > 0 && failureCount > 0) {
      message = `Uploaded ${successCount} file(s), ${failureCount} failed`;
    } else {
      message = `All ${failureCount} uploads failed`;
    }

    console.log('\n=== UPLOAD PROCESS COMPLETE ===');
    console.log('Success count:', successCount);
    console.log('Failure count:', failureCount);
    console.log('Message:', message);

    return NextResponse.json({ 
      message,
      results: uploadResults,
      successCount,
      failureCount,
      timestamp: new Date().toISOString()
    }, {
      status: successCount > 0 ? 200 : 400,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        'X-Timestamp': new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Error in POST /api/admin/categorized-gallery:', error);
    return NextResponse.json({ 
      message: 'Error uploading media', 
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// DELETE handler to remove a categorized media item with improved error handling
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

    // Find the exact blob to delete
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json({ message: 'Storage token not configured' }, { status: 500 });
    }

    // List blobs to find the exact match
    const { blobs } = await list({
      prefix: 'categorized-gallery/',
      token,
      limit: 1000
    });

    const blobToDelete = blobs.find(blob => {
      const id = blob.pathname.split('/').pop();
      return id === mediaId;
    });

    if (!blobToDelete) {
      return NextResponse.json({ message: 'Media not found' }, { status: 404 });
    }

    // Delete the media from Vercel Blob
    try {
      await retryOperation(async () => {
        return await del(blobToDelete.url, { token });
      }, 3);
    } catch (error: any) {
      console.error(`Error deleting blob ${blobToDelete.pathname}:`, error);
      return NextResponse.json({ 
        message: 'Error deleting media from storage',
        error: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Media deleted successfully',
      deletedId: mediaId,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        'X-Timestamp': new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error in DELETE /api/admin/categorized-gallery:', error);
    return NextResponse.json({ 
      message: 'Error deleting media', 
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}