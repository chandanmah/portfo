import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // List all blobs with their metadata
    const { blobs } = await list();
    
    // Return the blobs with their metadata
    return NextResponse.json({ blobs }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    });
  } catch (error: any) {
    console.error('Error listing blobs:', error);
    return NextResponse.json({ 
      error: 'Failed to list blobs', 
      message: error.message 
    }, { status: 500 });
  }
}