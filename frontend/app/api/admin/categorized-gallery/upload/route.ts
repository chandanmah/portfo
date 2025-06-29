import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

// Vercel-specific configuration for streaming uploads
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

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

// Enhanced media type detection
function getMediaType(filename: string, contentType?: string): 'image' | 'video' {
  if (contentType?.startsWith('video/')) return 'video';
  if (contentType?.startsWith('image/')) return 'image';
  
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.wmv', '.m4v', '.3gp', '.flv'];
  return videoExtensions.some(ext => filename.toLowerCase().endsWith(ext)) ? 'video' : 'image';
}

// Generate categorized filename
function generateCategorizedFileName(category: string, originalName: string, mediaType: string): string {
  const fileExtension = originalName.split('.').pop()?.toLowerCase() || (mediaType === 'video' ? 'mp4' : 'jpg');
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  
  const cleanName = originalName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9-_\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
    .substring(0, 30);
  
  return `categorized-gallery/${category}-${cleanName}-${timestamp}-${randomSuffix}.${fileExtension}`;
}

// STREAMING UPLOAD: Single file upload endpoint
export async function POST(request: NextRequest) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json({ 
      error: 'Storage not configured',
      message: 'BLOB_READ_WRITE_TOKEN is missing'
    }, { status: 500 });
  }

  try {
    console.log('🚀 SINGLE FILE STREAMING UPLOAD STARTED');

    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const name = searchParams.get('name') || '';
    const subtitle = searchParams.get('subtitle') || '';

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ 
        error: 'Invalid category',
        message: `Category must be one of: ${VALID_CATEGORIES.join(', ')}`
      }, { status: 400 });
    }

    // Get content type and content length from headers
    const contentType = request.headers.get('content-type') || '';
    const contentLength = parseInt(request.headers.get('content-length') || '0');
    const filename = request.headers.get('x-filename') || 'upload';

    console.log(`📁 Processing: ${filename} (${(contentLength / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`🎭 Content-Type: ${contentType}`);

    // Validate file size (Vercel limit)
    const maxSize = 45 * 1024 * 1024; // 45MB to be safe with Vercel limits
    if (contentLength > maxSize) {
      return NextResponse.json({ 
        error: 'File too large',
        message: `File size (${(contentLength / 1024 / 1024).toFixed(2)}MB) exceeds 45MB Vercel limit`
      }, { status: 413 });
    }

    // Validate content type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml', 'image/avif',
      'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/avi', 
      'video/x-ms-wmv', 'video/wmv', 'video/x-flv', 'video/3gpp', 'video/ogg',
      'video/mp4v-es', 'video/x-m4v', 'video/x-matroska'
    ];

    if (!allowedTypes.includes(contentType)) {
      // Check by extension as fallback
      const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.wmv', '.m4v'];
      const hasVideoExtension = videoExtensions.some(ext => filename.toLowerCase().endsWith(ext));
      
      if (!hasVideoExtension && !contentType.startsWith('image/')) {
        return NextResponse.json({ 
          error: 'Invalid file type',
          message: `File type ${contentType} not supported`
        }, { status: 400 });
      }
    }

    // Determine media type
    const mediaType = getMediaType(filename, contentType);
    console.log(`🎬 Media type: ${mediaType}`);

    // Generate filename
    const blobFileName = generateCategorizedFileName(category, filename, mediaType);
    console.log(`🏷️ Generated filename: ${blobFileName}`);

    // STREAMING UPLOAD: Use request body directly
    console.log('⬆️ Starting direct stream upload...');
    
    try {
      // Get the request body as a stream
      const body = request.body;
      if (!body) {
        throw new Error('No request body');
      }

      // Upload directly from stream to Vercel Blob
      const blob = await put(blobFileName, body, {
        access: 'public',
        contentType: contentType || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg'),
        token: token,
        addRandomSuffix: false,
        metadata: {
          category: category,
          originalName: filename,
          uploadedAt: new Date().toISOString(),
          type: mediaType,
          size: contentLength.toString(),
          name: name || filename.replace(/\.[^/.]+$/, ''),
          subtitle: subtitle || ''
        }
      });

      console.log(`✅ Stream upload successful: ${blob.url}`);

      // Create media object
      const mediaItem = {
        id: blobFileName.split('/').pop() || blobFileName,
        url: blob.url,
        name: name || filename.replace(/\.[^/.]+$/, ''),
        subtitle: subtitle || '',
        category: category,
        type: mediaType,
        uploadedAt: new Date().toISOString(),
        size: contentLength
      };

      return NextResponse.json({ 
        success: true,
        message: 'File uploaded successfully',
        media: mediaItem,
        timestamp: new Date().toISOString()
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

    } catch (uploadError: any) {
      console.error('❌ Stream upload failed:', uploadError);
      return NextResponse.json({ 
        error: 'Upload failed',
        message: uploadError.message || 'Failed to upload to storage',
        details: uploadError.toString()
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ Error in streaming upload:', error);
    return NextResponse.json({ 
      error: 'Server error',
      message: error.message || 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}