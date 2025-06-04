import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

interface GalleryImage {
  id: string;
  url: string;
  name: string;
  subtitle?: string;
}

const GALLERY_CONFIG_KEY = 'gallery-config.json';

// Helper function to get gallery data from Vercel Blob
async function readGalleryData(): Promise<{ galleryImages: GalleryImage[] }> {
  try {
    const response = await fetch(`${process.env.BLOB_READ_WRITE_TOKEN ? 'https://blob.vercel-storage.com' : 'http://localhost:3000'}/${GALLERY_CONFIG_KEY}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.log('No gallery data found');
  }
  return { galleryImages: [] };
}

// Helper function to save gallery data to Vercel Blob
async function writeGalleryData(data: { galleryImages: GalleryImage[] }): Promise<void> {
  await put(GALLERY_CONFIG_KEY, JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
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
    });
  } catch (error) {
    console.error('Error updating gallery image:', error);
    return NextResponse.json({ 
      message: 'Error updating gallery image', 
      error: error.message 
    }, { status: 500 });
  }
}