import { NextRequest, NextResponse } from 'next/server';
import { list, del } from '@vercel/blob';

export const dynamic = 'force-dynamic';

// POST handler to clear all blobs
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action !== 'clear-all-blobs') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN is not set' }, { status: 500 });
    }

    console.log('Starting blob cleanup process...');

    // List all blobs
    const { blobs } = await list({
      token,
      limit: 1000
    });

    console.log(`Found ${blobs.length} blobs to delete`);

    let deleted = 0;
    const errors: string[] = [];

    // Delete all blobs
    for (const blob of blobs) {
      try {
        await del(blob.url, { token });
        deleted++;
        console.log(`Deleted: ${blob.pathname}`);
      } catch (error: any) {
        console.error(`Error deleting blob ${blob.pathname}:`, error);
        errors.push(`${blob.pathname}: ${error.message}`);
      }
    }

    console.log(`Cleanup complete. Deleted ${deleted} blobs.`);

    return NextResponse.json({
      success: true,
      deleted,
      totalFound: blobs.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully deleted ${deleted} blob(s)${errors.length > 0 ? ` (${errors.length} errors)` : ''}`
    });

  } catch (error: any) {
    console.error('Error clearing blobs:', error);
    return NextResponse.json({ 
      error: 'Error clearing blobs',
      message: error.message 
    }, { status: 500 });
  }
}