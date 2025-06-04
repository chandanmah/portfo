import { NextRequest, NextResponse } from 'next/server';
import { put, del, head } from '@vercel/blob';

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
    const response = await fetch(headResult.url);

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
      token: process.env.BLOB_READ_WRITE_TOKEN, // Ensure token is passed
      allowOverwrite: true, // Allow overwriting if same filename (though timestamp makes it unlikely)
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
      if (imageToDelete.url.includes('.public.blob.vercel-storage.com/')) { // More specific check
        await del(imageToDelete.url, { token: process.env.BLOB_READ_WRITE_TOKEN });
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