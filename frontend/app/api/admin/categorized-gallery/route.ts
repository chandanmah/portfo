import { NextRequest, NextResponse } from 'next/server';

export const config = {
  api: {
    bodyParser: false,
  },
};
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

// BULLETPROOF: Determine if file is media based on filename extension
function isMediaFile(pathname: string, contentType?: string): boolean {
  // First check content type if available
  if (contentType) {
    return contentType.startsWith('image/') || contentType.startsWith('video/');
  }
  
  // Fallback: check file extension
  const filename = pathname.toLowerCase();
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.wmv'];
  
  return [...imageExtensions, ...videoExtensions].some(ext => filename.endsWith(ext));
}

// BULLETPROOF: Determine media type from filename/content type
function getMediaType(pathname: string, contentType?: string): 'image' | 'video' {
  // First check content type if available
  if (contentType?.startsWith('video/')) {
    return 'video';
  }
  if (contentType?.startsWith('image/')) {
    return 'image';
  }
  
  // Fallback: check file extension
  const filename = pathname.toLowerCase();
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.wmv'];
  
  if (videoExtensions.some(ext => filename.endsWith(ext))) {
    return 'video';
  }
  
  return 'image'; // Default to image
}

// BULLETPROOF: Extract all info from filename - NO METADATA DEPENDENCIES
function parseMediaFromFilename(pathname: string, url: string, uploadedAt: string, size: number, contentType?: string): CategorizedMedia | null {
  console.log(`🔍 Parsing filename: ${pathname}`);
  console.log(`📊 Content type: ${contentType || 'undefined'}`);
  
  // Check if this is a media file using bulletproof detection
  if (!isMediaFile(pathname, contentType)) {
    console.log(`⏭️ Skipping non-media file based on filename/content type`);
    return null;
  }
  
  // Extract filename from path
  const filename = pathname.split('/').pop() || pathname;
  console.log(`📄 Filename: ${filename}`);
  
  // Pattern: categorized-gallery/category-name-timestamp-random.ext
  // OR: category-name-timestamp-random.ext (for old uploads)
  
  let category: string | undefined;
  let name: string | undefined;
  const type = getMediaType(pathname, contentType);
  
  // Method 1: Extract from categorized-gallery path
  if (pathname.includes('categorized-gallery/')) {
    const pathParts = pathname.split('/');
    if (pathParts.length >= 2) {
      const categoryFilename = pathParts[1];
      console.log(`📂 Category filename: ${categoryFilename}`);
      
      // Extract category (first part before first dash)
      const categoryMatch = categoryFilename.match(/^([a-z-]+)-/);
      if (categoryMatch) {
        const extractedCategory = categoryMatch[1];
        if (VALID_CATEGORIES.includes(extractedCategory)) {
          category = extractedCategory;
          console.log(`✅ Extracted category: ${category}`);
          
          // Extract name (everything between category and timestamp)
          const nameMatch = categoryFilename.match(/^[a-z-]+-(.+)-\d+-[a-z0-9]+\./);
          if (nameMatch) {
            name = nameMatch[1]
              .replace(/-/g, ' ')
              .replace(/\b\w/g, l => l.toUpperCase())
              .trim();
            console.log(`✅ Extracted name: ${name}`);
          }
        }
      }
    }
  }
  
  // Method 2: Try to extract from any filename pattern
  if (!category) {
    for (const validCategory of VALID_CATEGORIES) {
      if (filename.toLowerCase().includes(validCategory)) {
        category = validCategory;
        console.log(`✅ Found category in filename: ${category}`);
        break;
      }
    }
  }
  
  // Method 3: Default fallback based on content type or path
  if (!category) {
    // Default to architecture if we can't determine
    category = 'architecture';
    console.log(`⚠️ Using default category: ${category}`);
  }
  
  // Extract name if not found
  if (!name) {
    name = filename
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/^[a-z-]+-/, '') // Remove category prefix
      .replace(/-\d+-[a-z0-9]+$/, '') // Remove timestamp suffix
      .replace(/[-_]/g, ' ') // Replace dashes/underscores with spaces
      .replace(/\b\w/g, l => l.toUpperCase()) // Capitalize words
      .trim();
    
    if (!name || name === '') {
      name = 'Untitled';
    }
    console.log(`✅ Generated name: ${name}`);
  }
  
  console.log(`✅ Determined type: ${type}`);
  
  const mediaItem: CategorizedMedia = {
    id: filename,
    url,
    name,
    subtitle: '', // Always empty for filename-based parsing
    category,
    type,
    uploadedAt,
    size
  };
  
  console.log(`✅ Successfully parsed media item:`, mediaItem);
  return mediaItem;
}

// BULLETPROOF: Get all categorized media from blob storage using ONLY filenames
async function readCategorizedDataFromBlobs(): Promise<CategoryData> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.warn('BLOB_READ_WRITE_TOKEN is not set.');
    return {};
  }

  try {
    return await retryOperation(async () => {
      console.log('🚀 BULLETPROOF: Reading categorized data using filename parsing...');
      
      // List ALL blobs to catch everything
      const { blobs } = await list({
        token,
        limit: 1000
      });

      console.log(`📁 Found ${blobs.length} total blobs`);

      const categoryData: CategoryData = {};
      const processedIds = new Set<string>();
      let validItems = 0;
      let skippedItems = 0;

      for (const blob of blobs) {
        try {
          console.log(`\n🔍 Processing blob: ${blob.pathname}`);
          console.log(`📊 Blob details:`, {
            pathname: blob.pathname,
            contentType: blob.contentType || 'undefined',
            size: blob.size,
            uploadedAt: blob.uploadedAt
          });

          // Skip config files explicitly
          if (blob.pathname.includes('config.json') || blob.pathname.includes('avatar-')) {
            console.log(`⏭️ Skipping config/avatar file`);
            skippedItems++;
            continue;
          }

          // Parse media info from filename - NO METADATA DEPENDENCIES
          const mediaItem = parseMediaFromFilename(
            blob.pathname,
            blob.url,
            blob.uploadedAt,
            blob.size,
            blob.contentType
          );

          if (!mediaItem) {
            console.warn(`❌ Could not parse media from filename: ${blob.pathname}`);
            skippedItems++;
            continue;
          }

          // Skip duplicates
          if (processedIds.has(mediaItem.id)) {
            console.warn(`⚠️ Duplicate blob ID found: ${mediaItem.id}`);
            skippedItems++;
            continue;
          }
          processedIds.add(mediaItem.id);

          // Initialize category array if needed
          if (!categoryData[mediaItem.category]) {
            categoryData[mediaItem.category] = [];
            console.log(`📂 Created new category: ${mediaItem.category}`);
          }

          categoryData[mediaItem.category].push(mediaItem);
          validItems++;
          console.log(`✅ Successfully processed: ${mediaItem.name} in ${mediaItem.category}`);

        } catch (error) {
          console.warn(`❌ Error processing blob ${blob.pathname}:`, error);
          skippedItems++;
        }
      }

      // Sort items by upload date (newest first)
      Object.keys(categoryData).forEach(category => {
        categoryData[category].sort((a, b) => 
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        );
        console.log(`📂 Category ${category}: ${categoryData[category].length} items`);
      });

      console.log(`\n📊 BULLETPROOF PROCESSING SUMMARY:`);
      console.log(`✅ Valid items: ${validItems}`);
      console.log(`⏭️ Skipped items: ${skippedItems}`);
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
    
    // Add metadata
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

// Helper function to validate file - ENHANCED for video support
function validateFile(file: File): { isValid: boolean; error?: string } {
  const maxSize = 100 * 1024 * 1024; // Increased to 100MB for videos
  const allowedTypes = [
    // Images
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
    // Videos - EXPANDED support
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/avi', 
    'video/x-ms-wmv', 'video/wmv', 'video/x-flv', 'video/3gpp', 'video/ogg'
  ];

  console.log(`🔍 Validating file: ${file.name}`);
  console.log(`📏 Size: ${file.size} bytes (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`🎭 Type: ${file.type}`);

  if (file.size > maxSize) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    const maxSizeMB = (maxSize / 1024 / 1024).toFixed(0);
    return { isValid: false, error: `File size (${sizeMB}MB) exceeds ${maxSizeMB}MB limit` };
  }

  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: `Invalid file type: ${file.type}. Only images and videos are allowed.` };
  }

  console.log(`✅ File validation passed`);
  return { isValid: true };
}

// Helper function to generate filename with category prefix - BULLETPROOF NAMING
function generateCategorizedFileName(category: string, originalName: string, mediaType: string): string {
  const fileExtension = originalName.split('.').pop() || (mediaType === 'video' ? 'mp4' : 'jpg');
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  
  // Clean the original name for use in filename
  const cleanName = originalName
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[^a-zA-Z0-9-_\s]/g, '') // Remove special chars except dashes, underscores, spaces
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/-+/g, '-') // Replace multiple dashes with single dash
    .toLowerCase()
    .substring(0, 30); // Limit length
  
  // BULLETPROOF filename format: categorized-gallery/category-name-timestamp-random.ext
  return `categorized-gallery/${category}-${cleanName}-${timestamp}-${randomSuffix}.${fileExtension}`;
}

// BULLETPROOF POST handler - FIXED for video uploads
export async function POST(request: NextRequest) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json({ message: 'BLOB_READ_WRITE_TOKEN is not configured' }, { status: 500 });
  }

  try {
    console.log('\n🚀 BULLETPROOF UPLOAD PROCESS STARTED');

    // SAFE FormData parsing with error handling
    let formData: FormData;
    try {
      formData = await request.formData();
      console.log('✅ FormData parsed successfully');
    } catch (formDataError: any) {
      console.error('❌ FormData parsing failed:', formDataError);
      return NextResponse.json({ 
        message: 'Failed to parse form data',
        error: formDataError.message,
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }
    
    // Handle both single and multiple file uploads
    const mediaFiles = formData.getAll('media') as File[];
    const category = formData.get('category') as string;
    const name = formData.get('name') as string;
    const subtitle = formData.get('subtitle') as string;

    console.log('📁 Files:', mediaFiles.length);
    console.log('📂 Category:', category);

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

    // Process each file with BULLETPROOF filename-based approach
    for (let i = 0; i < mediaFiles.length; i++) {
      const file = mediaFiles[i];

      console.log(`\n📁 PROCESSING FILE ${i + 1}/${mediaFiles.length}`);
      console.log('📄 Original name:', file.name);
      console.log('📂 Category:', category);
      console.log('📏 Size:', file.size, 'bytes');
      console.log('🎭 Type:', file.type);

      try {
        // Validate file - ENHANCED for videos
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

        // Determine media type - ENHANCED for videos
        const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
        console.log(`🎬 Determined media type: ${mediaType}`);
        
        // Generate BULLETPROOF filename with category embedded
        const blobFileName = generateCategorizedFileName(category, file.name, mediaType);
        console.log('🏷️ Generated bulletproof filename:', blobFileName);

        // SAFE blob upload with enhanced error handling
        console.log('⬆️ Uploading to blob storage...');
        let blob;
        try {
          blob = await retryOperation(async () => {
            return await put(blobFileName, file, {
              access: 'public',
              contentType: file.type,
              token: token,
              addRandomSuffix: false,
              // Minimal metadata - not relied upon for functionality
              metadata: {
                category: category,
                originalName: file.name,
                uploadedAt: new Date().toISOString(),
                type: mediaType
              }
            });
          }, 3);
        } catch (uploadError: any) {
          console.error('❌ Blob upload failed:', uploadError);
          uploadResults.push({
            success: false,
            error: `Upload failed: ${uploadError.message}`,
            fileName: file.name,
            originalName: file.name
          });
          continue;
        }

        console.log('✅ Upload successful!');
        console.log('🔗 Blob URL:', blob.url);

        // Parse the uploaded file to create media object
        const mediaItem = parseMediaFromFilename(
          blobFileName,
          blob.url,
          new Date().toISOString(),
          file.size,
          file.type
        );

        if (!mediaItem) {
          throw new Error('Failed to parse uploaded file');
        }

        // Override name if provided
        if (name && name.trim()) {
          mediaItem.name = name.trim();
        }

        // Override subtitle if provided
        if (subtitle && subtitle.trim()) {
          mediaItem.subtitle = subtitle.trim();
        }

        uploadResults.push({
          success: true,
          media: mediaItem,
          originalName: file.name
        });

        console.log('✅ File processing complete for:', file.name);

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

    console.log('\n📊 BULLETPROOF UPLOAD PROCESS COMPLETE');
    console.log('✅ Success count:', successCount);
    console.log('❌ Failure count:', failureCount);

    // SAFE JSON response with proper error handling
    const responseData = { 
      message,
      results: uploadResults,
      successCount,
      failureCount,
      timestamp: new Date().toISOString()
    };

    console.log('📤 Sending response:', JSON.stringify(responseData, null, 2));

    return NextResponse.json(responseData, {
      status: successCount > 0 ? 200 : 400,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        'X-Timestamp': new Date().toISOString(),
        'Content-Type': 'application/json'
      }
    });

  } catch (error: any) {
    console.error('❌ Error in POST /api/admin/categorized-gallery:', error);
    
    // SAFE error response
    const errorResponse = { 
      message: 'Error uploading media', 
      error: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    };

    console.log('📤 Sending error response:', JSON.stringify(errorResponse, null, 2));

    return NextResponse.json(errorResponse, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        'X-Timestamp': new Date().toISOString(),
        'Content-Type': 'application/json'
      }
    });
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

    // Find the exact blob to delete
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json({ message: 'Storage token not configured' }, { status: 500 });
    }

    // List blobs to find the exact match
    const { blobs } = await list({
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