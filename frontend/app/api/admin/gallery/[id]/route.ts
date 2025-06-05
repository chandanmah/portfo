import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Prevent caching of this route
import { put, head } from '@vercel/blob';

interface GalleryImage {
  id: string;
  url: string;
  name: string;
  subtitle?: string;
}

const GALLERY_CONFIG_KEY = 'gallery-config.json';

// Helper function to get gallery data from Vercel Blob
async function readGalleryData(): Promise<{ galleryImages: GalleryImage[] }> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.warn('BLOB_READ_WRITE_TOKEN is not set. Gallery functionality might be limited.');
    return { galleryImages: [] };
  }

  try {
    const headResult = await head(GALLERY_CONFIG_KEY, { token });
    const response = await fetch(headResult.url, { cache: 'no-store' });

    if (response.ok) {
      return await response.json();
    }
    if (response.status === 404) {
      console.log(`Gallery config file '${GALLERY_CONFIG_KEY}' not found.`);
      return { galleryImages: [] };
    }
    console.error(`Error fetching gallery config: ${response.status} ${response.statusText}`);
    return { galleryImages: [] };
  } catch (error) {
    if ((error.status && error.status === 404) || (error.message && error.message.toLowerCase().includes('does not exist'))) {
        console.log(`Gallery config file '${GALLERY_CONFIG_KEY}' not found in blob storage.`);
        return { galleryImages: [] };
    }
    console.error('Error in readGalleryData:', error);
    return { galleryImages: [] };
  }
}

// Helper function to save gallery data to Vercel Blob
async function writeGalleryData(data: { galleryImages: GalleryImage[] }): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error('BLOB_READ_WRITE_TOKEN is not set. Cannot save gallery data.');
    return;
  }
  await put(GALLERY_CONFIG_KEY, JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
    token: token,
    allowOverwrite: true, // Allow overwriting the config file
  });
}

// PUT handler to update gallery image details
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { name, subtitle } = await request.json();

    if (!id) {
      return NextResponse.json({ message: 'Image ID is required' }, { status: 400 });
    }

    const data = await readGalleryData();
    const imageIndex = data.galleryImages.findIndex(img => img.id === id);

    if (imageIndex === -1) {
      return NextResponse.json({ message: 'Image not found' }, { status: 404 });
    }

    // Update the image details
    data.galleryImages[imageIndex] = {
      ...data.galleryImages[imageIndex],
      name: name || data.galleryImages[imageIndex].name,
      subtitle: subtitle !== undefined ? subtitle : data.galleryImages[imageIndex].subtitle,
    };

    await writeGalleryData(data);

    return NextResponse.json({ 
      message: 'Image updated successfully', 
      image: data.galleryImages[imageIndex] 
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('Error updating gallery image:', error);
    return NextResponse.json({ 
      message: 'Error updating gallery image', 
      error: error.message 
    }, { status: 500 });
  }
}