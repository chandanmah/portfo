import { NextRequest, NextResponse } from 'next/server';
import { list, del, put } from '@vercel/blob';

export const dynamic = 'force-dynamic';

interface BlobInfo {
  pathname: string;
  url: string;
  size: number;
  uploadedAt: string;
  metadata?: Record<string, string>;
  contentType?: string;
}

interface DiagnosticResult {
  totalBlobs: number;
  categorizedBlobs: number;
  orphanedBlobs: number;
  metadataIssues: Array<{
    pathname: string;
    issue: string;
    metadata?: Record<string, string>;
  }>;
  blobsByCategory: Record<string, number>;
  sampleBlobs: BlobInfo[];
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

// GET handler for diagnostics
export async function GET() {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN is not set' }, { status: 500 });
    }

    // List all blobs
    const { blobs } = await list({
      token,
      limit: 1000
    });

    const diagnostics: DiagnosticResult = {
      totalBlobs: blobs.length,
      categorizedBlobs: 0,
      orphanedBlobs: 0,
      metadataIssues: [],
      blobsByCategory: {},
      sampleBlobs: []
    };

    // Analyze each blob
    for (const blob of blobs) {
      const blobInfo: BlobInfo = {
        pathname: blob.pathname,
        url: blob.url,
        size: blob.size,
        uploadedAt: blob.uploadedAt,
        metadata: blob.metadata,
        contentType: blob.contentType
      };

      // Add to sample (first 10 blobs)
      if (diagnostics.sampleBlobs.length < 10) {
        diagnostics.sampleBlobs.push(blobInfo);
      }

      // Check if it's a categorized gallery blob
      if (blob.pathname.startsWith('categorized-gallery/')) {
        const metadata = blob.metadata || {};
        const category = metadata.category;

        if (!category) {
          diagnostics.metadataIssues.push({
            pathname: blob.pathname,
            issue: 'Missing category metadata',
            metadata: blob.metadata
          });
          diagnostics.orphanedBlobs++;
        } else if (!VALID_CATEGORIES.includes(category)) {
          diagnostics.metadataIssues.push({
            pathname: blob.pathname,
            issue: `Invalid category: ${category}`,
            metadata: blob.metadata
          });
          diagnostics.orphanedBlobs++;
        } else {
          diagnostics.categorizedBlobs++;
          diagnostics.blobsByCategory[category] = (diagnostics.blobsByCategory[category] || 0) + 1;

          // Check for other metadata issues
          if (!metadata.name) {
            diagnostics.metadataIssues.push({
              pathname: blob.pathname,
              issue: 'Missing name metadata',
              metadata: blob.metadata
            });
          }
          if (!metadata.type) {
            diagnostics.metadataIssues.push({
              pathname: blob.pathname,
              issue: 'Missing type metadata',
              metadata: blob.metadata
            });
          }
        }
      } else {
        // Check if it's an old-style blob that should be categorized
        if (blob.contentType?.startsWith('image/') || blob.contentType?.startsWith('video/')) {
          // This might be an old upload that needs to be migrated
          diagnostics.metadataIssues.push({
            pathname: blob.pathname,
            issue: 'Uncategorized media file - needs migration',
            metadata: blob.metadata
          });
          diagnostics.orphanedBlobs++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      diagnostics,
      recommendations: generateRecommendations(diagnostics)
    });

  } catch (error: any) {
    console.error('Error in diagnostics:', error);
    return NextResponse.json({ 
      error: 'Error running diagnostics',
      message: error.message 
    }, { status: 500 });
  }
}

// POST handler for fixing issues
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action !== 'fix-metadata') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN is not set' }, { status: 500 });
    }

    // List all blobs (not just categorized-gallery ones)
    const { blobs } = await list({
      token,
      limit: 1000
    });

    let fixed = 0;
    const errors: string[] = [];
    const migrated: string[] = [];

    for (const blob of blobs) {
      try {
        // Skip non-media files
        if (!blob.contentType?.startsWith('image/') && !blob.contentType?.startsWith('video/')) {
          continue;
        }

        const metadata = blob.metadata || {};
        let needsUpdate = false;
        let needsMigration = false;
        const updatedMetadata = { ...metadata };

        // Check if this is an old-style upload that needs migration
        if (!blob.pathname.startsWith('categorized-gallery/')) {
          needsMigration = true;
          needsUpdate = true;
        }

        // Extract info from filename if metadata is missing
        const filename = blob.pathname.split('/').pop() || '';
        const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

        // Fix missing category
        if (!metadata.category) {
          // Try to extract category from filename
          const categoryMatch = filename.match(/^([a-z-]+)-/);
          if (categoryMatch && VALID_CATEGORIES.includes(categoryMatch[1])) {
            updatedMetadata.category = categoryMatch[1];
          } else {
            // Default to architecture if we can't determine
            updatedMetadata.category = 'architecture';
          }
          needsUpdate = true;
        }

        // Fix missing name
        if (!metadata.name) {
          // Clean up the filename to create a nice name
          let cleanName = nameWithoutExt
            .replace(/^[a-z-]+-/, '') // Remove category prefix
            .replace(/-\d+-[a-z0-9]+$/, '') // Remove timestamp suffix
            .replace(/[-_]/g, ' ') // Replace dashes/underscores with spaces
            .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize words
          
          if (!cleanName || cleanName.trim() === '') {
            cleanName = 'Untitled';
          }
          
          updatedMetadata.name = cleanName;
          needsUpdate = true;
        }

        // Fix missing type
        if (!metadata.type) {
          updatedMetadata.type = blob.contentType?.startsWith('video/') ? 'video' : 'image';
          needsUpdate = true;
        }

        // Fix missing subtitle
        if (!metadata.subtitle) {
          updatedMetadata.subtitle = '';
          needsUpdate = true;
        }

        // Fix missing uploadedAt
        if (!metadata.uploadedAt) {
          updatedMetadata.uploadedAt = blob.uploadedAt;
          needsUpdate = true;
        }

        // Fix missing originalName
        if (!metadata.originalName) {
          updatedMetadata.originalName = filename;
          needsUpdate = true;
        }

        if (needsUpdate) {
          // Download the blob content
          const response = await fetch(blob.url);
          if (!response.ok) {
            throw new Error(`Failed to fetch blob content: ${response.statusText}`);
          }
          const blobContent = await response.blob();

          let newPathname = blob.pathname;

          // If this needs migration, create a new categorized path
          if (needsMigration) {
            const category = updatedMetadata.category;
            const timestamp = Date.now();
            const randomSuffix = Math.random().toString(36).substring(2, 8);
            const fileExtension = filename.split('.').pop() || 'jpg';
            const cleanName = updatedMetadata.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
            
            newPathname = `categorized-gallery/${category}-${cleanName}-${timestamp}-${randomSuffix}.${fileExtension}`;
            
            // Upload to new location
            await put(newPathname, blobContent, {
              access: 'public',
              contentType: blob.contentType || 'application/octet-stream',
              token,
              addRandomSuffix: false,
              metadata: updatedMetadata
            });

            // Delete old blob
            try {
              await del(blob.pathname, { token });
              migrated.push(`${blob.pathname} → ${newPathname}`);
            } catch (deleteError) {
              console.warn(`Could not delete old blob ${blob.pathname}:`, deleteError);
            }
          } else {
            // Just update metadata for existing categorized blobs
            await put(blob.pathname, blobContent, {
              access: 'public',
              contentType: blob.contentType || 'application/octet-stream',
              token,
              addRandomSuffix: false,
              metadata: updatedMetadata
            });
          }

          fixed++;
        }

      } catch (error: any) {
        console.error(`Error fixing blob ${blob.pathname}:`, error);
        errors.push(`${blob.pathname}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      fixed,
      migrated: migrated.length,
      migratedFiles: migrated,
      errors: errors.length > 0 ? errors : undefined,
      message: `Fixed metadata for ${fixed} items${migrated.length > 0 ? ` (migrated ${migrated.length} files)` : ''}${errors.length > 0 ? ` (${errors.length} errors)` : ''}`
    });

  } catch (error: any) {
    console.error('Error fixing metadata:', error);
    return NextResponse.json({ 
      error: 'Error fixing metadata',
      message: error.message 
    }, { status: 500 });
  }
}

function generateRecommendations(diagnostics: DiagnosticResult): string[] {
  const recommendations: string[] = [];

  if (diagnostics.orphanedBlobs > 0) {
    recommendations.push(`Found ${diagnostics.orphanedBlobs} orphaned blobs without proper metadata. Click "Fix Issues" to repair them.`);
  }

  if (diagnostics.metadataIssues.length > 0) {
    recommendations.push(`Found ${diagnostics.metadataIssues.length} metadata issues that need fixing.`);
  }

  if (diagnostics.categorizedBlobs === 0 && diagnostics.totalBlobs > 0) {
    recommendations.push('No properly categorized media found. Your uploads might not have the correct metadata.');
  }

  if (diagnostics.totalBlobs === 0) {
    recommendations.push('No blobs found in storage. Try uploading some media first.');
  }

  if (diagnostics.totalBlobs > 100) {
    recommendations.push('Large number of blobs detected. Consider cleaning up unused files to improve performance.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Everything looks good! No issues found.');
  }

  return recommendations;
}