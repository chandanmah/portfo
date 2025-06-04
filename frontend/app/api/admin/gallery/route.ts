import { NextRequest, NextResponse } from 'next/server';
import { put, del, list } from '@vercel/blob';
import { kv } from '@vercel/kv';

interface GalleryImage {
  id: string;
  url: string;
  name: string;
  // Add other metadata like title, description if needed
}

const GALLERY_KEY = 'gallery_images';

async function readGalleryData(): Promise<{ galleryImages: GalleryImage[] }> {
  const data = await kv.get<{ galleryImages: GalleryImage[] }>(GALLERY_KEY);
  return data || { galleryImages: [] };
}

async function writeGalleryData(data: { galleryImages: GalleryImage[] }) {
  await kv.set(GALLERY_KEY, data);
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

    const blob = await put(file.name, file, {
      access: 'public',
    });

    const data = await readGalleryData();
    const newImage: GalleryImage = {
      id: blob.pathname.split('/').pop() || blob.pathname, // Use the filename from the blob path as ID
      url: blob.url,
      name: file.name,
    };
    data.galleryImages.push(newImage);
    await writeGalleryData(data);

    return NextResponse.json({ message: 'Gallery image uploaded successfully', image: newImage });
  } catch (error) {
    console.error('Error uploading gallery image:', error);
    return NextResponse.json({ message: 'Error uploading gallery image', error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
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

    // Delete the physical file from Vercel Blob
    try {
      await del(imageToDelete.url);
    } catch (e) {
      console.warn(`Could not delete image from Vercel Blob ${imageToDelete.url}:`, (e as Error).message);
      // Continue to remove from KV even if blob deletion fails
    }

    data.galleryImages.splice(imageIndex, 1);
    await writeGalleryData(data);

    return NextResponse.json({ message: 'Gallery image deleted successfully' });
  } catch (error) {
    console.error('Error deleting gallery image:', error);
    return NextResponse.json({ message: 'Error deleting gallery image', error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}