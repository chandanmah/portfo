import { NextRequest, NextResponse } from 'next/server';
import { put, list, del } from '@vercel/blob';

// Vercel-optimized configuration
export const runtime = 'nodejs';
export const maxDuration = 300;

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

// CHUNKED UPLOAD: Handle file chunks under Vercel's 4.5MB limit
export async function POST(request: NextRequest) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json({ 
      error: 'Storage not configured',
      message: 'BLOB_READ_WRITE_TOKEN is missing'
    }, { status: 500 });
  }

  try {
    console.log('🧩 CHUNKED UPLOAD HANDLER STARTED');

    // Parse form data (should be small chunks now)
    const formData = await request.formData();
    
    const chunk = formData.get('chunk') as File;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string);
    const totalChunks = parseInt(formData.get('totalChunks') as string);
    const fileId = formData.get('fileId') as string;
    const originalName = formData.get('originalName') as string;
    const category = formData.get('category') as string;
    const name = formData.get('name') as string;
    const subtitle = formData.get('subtitle') as string;
    const contentType = formData.get('contentType') as string;

    if (!chunk || !fileId || !originalName || !category) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        message: 'chunk, fileId, originalName, and category are required'
      }, { status: 400 });
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ 
        error: 'Invalid category',
        message: `Category must be one of: ${VALID_CATEGORIES.join(', ')}`
      }, { status: 400 });
    }

    console.log(`🧩 Processing chunk ${chunkIndex + 1}/${totalChunks} for ${originalName}`);
    console.log(`📦 Chunk size: ${(chunk.size / 1024).toFixed(2)} KB`);

    // Store chunk temporarily
    const chunkFileName = `temp-chunks/${fileId}/chunk-${chunkIndex.toString().padStart(4, '0')}`;
    
    try {
      const chunkBlob = await put(chunkFileName, chunk, {
        access: 'public',
        contentType: 'application/octet-stream',
        token: token,
        addRandomSuffix: false
      });

      console.log(`✅ Chunk ${chunkIndex + 1} stored: ${chunkBlob.url}`);

      // If this is the last chunk, reassemble the file
      if (chunkIndex === totalChunks - 1) {
        console.log('🔄 Last chunk received, starting reassembly...');
        
        try {
          // List all chunks for this file
          const { blobs } = await list({
            prefix: `temp-chunks/${fileId}/`,
            token,
            limit: 1000
          });

          // Sort chunks by index
          const sortedChunks = blobs
            .filter(blob => blob.pathname.includes('chunk-'))
            .sort((a, b) => {
              const aIndex = parseInt(a.pathname.split('chunk-')[1]);
              const bIndex = parseInt(b.pathname.split('chunk-')[1]);
              return aIndex - bIndex;
            });

          console.log(`📋 Found ${sortedChunks.length} chunks to reassemble`);

          if (sortedChunks.length !== totalChunks) {
            throw new Error(`Expected ${totalChunks} chunks, found ${sortedChunks.length}`);
          }

          // Download and combine all chunks
          const chunkBuffers: ArrayBuffer[] = [];
          for (const chunkBlob of sortedChunks) {
            const response = await fetch(chunkBlob.url);
            if (!response.ok) {
              throw new Error(`Failed to download chunk: ${chunkBlob.pathname}`);
            }
            const buffer = await response.arrayBuffer();
            chunkBuffers.push(buffer);
          }

          // Combine all chunks into one buffer
          const totalSize = chunkBuffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
          const combinedBuffer = new Uint8Array(totalSize);
          let offset = 0;
          
          for (const buffer of chunkBuffers) {
            combinedBuffer.set(new Uint8Array(buffer), offset);
            offset += buffer.byteLength;
          }

          console.log(`🔗 Combined file size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

          // Generate final filename
          const mediaType = contentType?.startsWith('video/') ? 'video' : 'image';
          const fileExtension = originalName.split('.').pop()?.toLowerCase() || (mediaType === 'video' ? 'mp4' : 'jpg');
          const timestamp = Date.now();
          const randomSuffix = Math.random().toString(36).substring(2, 8);
          
          const cleanName = (name || originalName.replace(/\.[^/.]+$/, ''))
            .replace(/[^a-zA-Z0-9-_\s]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .toLowerCase()
            .substring(0, 30);
          
          const finalFileName = `categorized-gallery/${category}-${cleanName}-${timestamp}-${randomSuffix}.${fileExtension}`;

          // Upload the combined file
          const finalBlob = await put(finalFileName, combinedBuffer, {
            access: 'public',
            contentType: contentType || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg'),
            token: token,
            addRandomSuffix: false,
            metadata: {
              category: category,
              originalName: originalName,
              uploadedAt: new Date().toISOString(),
              type: mediaType,
              size: totalSize.toString(),
              name: name || originalName.replace(/\.[^/.]+$/, ''),
              subtitle: subtitle || ''
            }
          });

          console.log(`✅ Final file uploaded: ${finalBlob.url}`);

          // Clean up temporary chunks
          for (const chunkBlob of sortedChunks) {
            try {
              await del(chunkBlob.url, { token });
            } catch (cleanupError) {
              console.warn(`⚠️ Failed to cleanup chunk: ${chunkBlob.pathname}`);
            }
          }

          console.log('🧹 Temporary chunks cleaned up');

          // Create media object
          const mediaItem = {
            id: finalFileName.split('/').pop() || finalFileName,
            url: finalBlob.url,
            name: name || originalName.replace(/\.[^/.]+$/, ''),
            subtitle: subtitle || '',
            category: category,
            type: mediaType as 'image' | 'video',
            uploadedAt: new Date().toISOString(),
            size: totalSize
          };

          return NextResponse.json({ 
            success: true,
            complete: true,
            message: 'File uploaded successfully',
            media: mediaItem,
            timestamp: new Date().toISOString()
          });

        } catch (assemblyError: any) {
          console.error('❌ File assembly failed:', assemblyError);
          
          // Clean up chunks on error
          try {
            const { blobs } = await list({
              prefix: `temp-chunks/${fileId}/`,
              token,
              limit: 1000
            });
            
            for (const blob of blobs) {
              await del(blob.url, { token });
            }
          } catch (cleanupError) {
            console.warn('⚠️ Failed to cleanup chunks after error');
          }

          return NextResponse.json({ 
            error: 'Assembly failed',
            message: assemblyError.message || 'Failed to reassemble file chunks',
            complete: false
          }, { status: 500 });
        }
      } else {
        // Not the last chunk, just confirm receipt
        return NextResponse.json({ 
          success: true,
          complete: false,
          message: `Chunk ${chunkIndex + 1}/${totalChunks} uploaded`,
          chunkIndex: chunkIndex,
          totalChunks: totalChunks
        });
      }

    } catch (chunkError: any) {
      console.error(`❌ Chunk ${chunkIndex + 1} upload failed:`, chunkError);
      return NextResponse.json({ 
        error: 'Chunk upload failed',
        message: chunkError.message || 'Failed to store chunk',
        chunkIndex: chunkIndex
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ Error in chunked upload:', error);
    return NextResponse.json({ 
      error: 'Server error',
      message: error.message || 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}