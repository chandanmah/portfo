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

// FIXED: Get all categorized media from blob metadata with better error handling
async function readCategorizedDataFromBlobs(): Promise<CategoryData> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.warn('BLOB_READ_WRITE_TOKEN is not set.');
    return {};
  }

  try {
    return await retryOperation(async () => {
      console.log('🔍 Reading categorized data from blobs...');
      
      // List all blobs with categorized-gallery prefix
      const { blobs } = await list({
        prefix: 'categorized-gallery/',
        token,
        limit: 1000
      });

      console.log(`📁 Found ${blobs.length} categorized gallery blobs`);

      const categoryData: CategoryData = {};
      const processedIds = new Set<string>();
      let validItems = 0;
      let invalidItems = 0;

      for (const blob of blobs) {
        try {
          console.log(`\n🔍 Processing blob: ${blob.pathname}`);
          console.log(`📊 Blob metadata:`, blob.metadata);
          console.log(`📅 Upload date: ${blob.uploadedAt}`);
          console.log(`📏 Size: ${blob.size} bytes`);
          console.log(`🎭 Content type: ${blob.contentType}`);

          // Extract media info from blob metadata
          const metadata = blob.metadata || {};
          
          // CRITICAL FIX: Handle both string and direct metadata access
          let category: string;
          let name: string;
          let subtitle: string;
          let type: 'image' | 'video';
          
          // Try different ways to access metadata (Vercel Blob sometimes stores it differently)
          if (typeof metadata === 'string') {
            try {
              const parsedMetadata = JSON.parse(metadata);
              category = parsedMetadata.category;
              name = parsedMetadata.name;
              subtitle = parsedMetadata.subtitle || '';
              type = parsedMetadata.type;
            } catch (parseError) {
              console.warn(`❌ Could not parse metadata string for ${blob.pathname}:`, metadata);
              invalidItems++;
              continue;
            }
          } else {
            category = metadata.category as string;
            name = metadata.name as string;
            subtitle = (metadata.subtitle as string) || '';
            type = metadata.type as 'image' | 'video';
          }

          console.log(`📝 Extracted metadata:`, { category, name, subtitle, type });

          // Generate unique ID from pathname
          const id = blob.pathname.split('/').pop() || blob.pathname;
          
          // Skip duplicates
          if (processedIds.has(id)) {
            console.warn(`⚠️ Duplicate blob ID found: ${id}`);
            continue;
          }
          processedIds.add(id);

          // Validate category
          if (!category) {
            console.warn(`❌ Missing category for blob ${blob.pathname}`);
            invalidItems++;
            continue;
          }
          
          if (!VALID_CATEGORIES.includes(category)) {
            console.warn(`❌ Invalid category for blob ${blob.pathname}: ${category}`);
            invalidItems++;
            continue;
          }

          // Initialize category array if needed
          if (!categoryData[category]) {
            categoryData[category] = [];
            console.log(`📂 Created new category: ${category}`);
          }

          // Determine type from content type if not in metadata
          if (!type) {
            type = blob.contentType?.startsWith('video/') ? 'video' : 'image';
            console.log(`🎭 Inferred type from content-type: ${type}`);
          }

          const mediaItem: CategorizedMedia = {
            id,
            url: blob.url,
            name: name || id.replace(/\.[^/.]+$/, '') || 'Untitled',
            subtitle: subtitle || '',
            category,
            type,
            width: metadata.width ? parseInt(metadata.width as string) : undefined,
            height: metadata.height ? parseInt(metadata.height as string) : undefined,
            uploadedAt: blob.uploadedAt,
            size: blob.size
          };

          categoryData[category].push(mediaItem);
          validItems++;
          console.log(`✅ Successfully processed: ${mediaItem.name} in ${category}`);
        } catch (error) {
          console.warn(`❌ Error processing blob ${blob.pathname}:`, error);
          invalidItems++;
        }
      }

      // Sort items by upload date (newest first) and ensure consistency
      Object.keys(categoryData).forEach(category => {
        categoryData[category].sort((a, b) => 
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        );
        console.log(`📂 Category ${category}: ${categoryData[category].length} items`);
      });

      console.log(`\n📊 PROCESSING SUMMARY:`);
      console.log(`✅ Valid items: ${validItems}`);
      console.log(`❌ Invalid items: ${invalidItems}`);
      console.log(`📂 Categories found: ${Object.keys(categoryData).length}`);
      console.log(`📁 Categories:`, Object.keys(categoryData).map(cat => `${cat}: ${categoryData[cat].length} items`));

      return categoryData;
    });
  } catch (error: any) {
    console.error('❌ Error reading categorized data from blobs:', error);
    return {};
  }
}

// GET handler to retrieve all categorized gallery data
export async function GET() {
  try {
    console.log('\n🚀 GET /api/admin/categorized-gallery called');
    
    const data = await readCategorizedDataFromBlobs();
    
    // Add cache-busting timestamp
    const timestamp = new Date().toISOString();
    const totalItems = Object.values(data).reduce((sum, items) => sum + items.length, 0);
    
    console.log(`📊 Returning data: ${totalItems} total items across ${Object.keys(data).length} categories`);
    
    return NextResponse.json({
      ...data,
      _metadata: {
        lastUpdated: timestamp,
        totalItems: totalItems,
        categories: Object.keys(data).length
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
    console.error('❌ Error in GET /api/admin/categorized-gallery:', error);
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

// FIXED POST handler with better metadata handling
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

    console.log('\n🚀 UPLOAD REQUEST RECEIVED');
    console.log('📁 Files:', mediaFiles.length);
    console.log('📂 Category:', category);
    console.log('📝 Name:', name);
    console.log('📄 Subtitle:', subtitle);

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

    // Process each file with EXPLICIT metadata handling
    for (let i = 0; i < mediaFiles.length; i++) {
      const file = mediaFiles[i];
      const fileName = name || file.name.replace(/\.[^/.]+$/, "");
      const fileSubtitle = subtitle || '';

      console.log(`\n📁 PROCESSING FILE ${i + 1}/${mediaFiles.length}`);
      console.log('📄 Original name:', file.name);
      console.log('📝 Display name:', fileName);
      console.log('📂 Category:', category);
      console.log('📏 Size:', file.size, 'bytes');
      console.log('🎭 Type:', file.type);

      try {
        // Validate file
        const validation = validateFile(file);
        if (!validation.isValid) {
          console.error('❌ File validation failed:', validation.error);
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
        console.log('🏷️ Generated blob filename:', blobFileName);

        // EXPLICIT metadata object with string values only
        const metadata = {
          category: String(category),
          name: String(fileName),
          subtitle: String(fileSubtitle),
          type: String(mediaType),
          originalName: String(file.name),
          uploadedAt: String(new Date().toISOString())
        };

        console.log('📊 Metadata to attach:', metadata);

        // Upload with explicit metadata
        console.log('⬆️ Uploading to blob storage...');
        const blob = await put(blobFileName, file, {
          access: 'public',
          contentType: file.type,
          token: token,
          addRandomSuffix: false,
          metadata: metadata
        });

        console.log('✅ Upload successful!');
        console.log('🔗 Blob URL:', blob.url);
        console.log('📊 Returned metadata:', blob.metadata);

        // Verify metadata was attached by listing the blob
        console.log('🔍 Verifying metadata attachment...');
        try {
          const { blobs } = await list({
            prefix: blobFileName,
            token,
            limit: 1
          });
          
          if (blobs.length > 0) {
            console.log('✅ Verification successful!');
            console.log('📊 Verified metadata:', blobs[0].metadata);
          } else {
            console.warn('⚠️ Could not find uploaded blob for verification');
          }
        } catch (verifyError) {
          console.warn('⚠️ Could not verify metadata:', verifyError);
        }

        // Create media object
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

    console.log('\n📊 UPLOAD PROCESS COMPLETE');
    console.log('✅ Success count:', successCount);
    console.log('❌ Failure count:', failureCount);

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