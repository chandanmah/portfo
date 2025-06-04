import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';

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

// GET handler to retrieve all gallery images
export async function GET() {
  try {
    const data = await readGalleryData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ message: 'Error reading gallery data' }, { status: 500 });
  }
}

// POST handler to upload a new gallery image
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('galleryImage') as File | null;

    if (!file) {
      return NextResponse.json({ message: 'No gallery image file provided' }, { status: 400 });
    }

    // Upload image to Vercel Blob
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const fileName = `gallery-${timestamp}.${fileExtension}`;

    const blob = await put(fileName, file, {
      access: 'public',
      contentType: file.type,
    });

    const data = await readGalleryData();
    const newImage: GalleryImage = {
      id: fileName, // Using filename as ID for simplicity
      url: blob.url,
      name: file.name,
      subtitle: '',
    };
    data.galleryImages.push(newImage);
    await writeGalleryData(data);

    return NextResponse.json({ message: 'Gallery image uploaded successfully', image: newImage });
  } catch (error) {
    console.error('Error uploading gallery image:', error);
    return NextResponse.json({ message: 'Error uploading gallery image', error: error.message }, { status: 500 });
  }
}

// DELETE handler to remove a gallery image
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('id');

    if (!imageId) {
      return NextResponse.json({ message: 'Image ID is required' }, { status: 400 });
    }

    const data = await readGalleryData();
    const imageIndex = data.galleryImages.findIndex(img => img.id === imageId);

    if (imageIndex === -1) {
      return NextResponse.json({ message: 'Image not found' }, { status: 404 });
    }

    const imageToDelete = data.galleryImages[imageIndex];

    // Delete the image from Vercel Blob
    try {
      if (imageToDelete.url.includes('blob.vercel-storage.com')) {
        await del(imageToDelete.url);
      }
    } catch (e) {
      console.warn(`Could not delete image file from blob storage:`, e);
      // Continue to remove from JSON even if file deletion fails
    }

    data.galleryImages.splice(imageIndex, 1);
    await writeGalleryData(data);

    return NextResponse.json({ message: 'Gallery image deleted successfully' });
  } catch (error) {
    console.error('Error deleting gallery image:', error);
    return NextResponse.json({ message: 'Error deleting gallery image', error: error.message }, { status: 500 });
  }
}