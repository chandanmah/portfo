import { NextRequest, NextResponse } from 'next/server';
import { put, del, list } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';

interface GalleryItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  year: number;
  medium: string;
  dimensions: string;
  price?: string;
  isAvailable: boolean;
}

const GALLERY_DATA_KEY = 'gallery-data.json';

async function readGalleryData(): Promise<GalleryItem[]> {
  try {
    // Try to fetch from Vercel Blob storage
    const response = await fetch(`${process.env.BLOB_READ_WRITE_TOKEN ? 'https://blob.vercel-storage.com' : ''}/gallery-data.json`, {
      headers: {
        'Authorization': `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
      }
    });
    
    if (response.ok) {
      return await response.json();
    }
    
    // If not found, return empty array
    return [];
  } catch (error) {
    console.error('Error reading gallery data:', error);
    return [];
  }
}

async function writeGalleryData(data: GalleryItem[]) {
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    await put(GALLERY_DATA_KEY, blob, {
      access: 'public',
    });
  } catch (error) {
    console.error('Error writing gallery data:', error);
    throw error;
  }
}

// GET handler to retrieve all gallery images
export async function GET() {
  try {
    const data = await readGalleryData();
    return NextResponse.json({ galleryImages: data });
  } catch (error) {
    return NextResponse.json({ message: 'Error reading gallery data' }, { status: 500 });
  }
}

// POST handler to upload a new gallery image
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('galleryImage') as File | null;
    const title = formData.get('title') as string || 'Untitled';
    const description = formData.get('description') as string || '';
    const category = formData.get('category') as string || 'Painting';
    const year = parseInt(formData.get('year') as string) || new Date().getFullYear();
    const medium = formData.get('medium') as string || 'Oil on Canvas';
    const dimensions = formData.get('dimensions') as string || '';
    const price = formData.get('price') as string || '';
    const isAvailable = formData.get('isAvailable') === 'true';

    if (!file) {
      return NextResponse.json({ message: 'No gallery image file provided' }, { status: 400 });
    }

    // Upload image to Vercel Blob
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const uniqueFileName = `gallery-${timestamp}-${uuidv4()}.${fileExtension}`;
    
    const blob = await put(uniqueFileName, file, {
      access: 'public',
    });

    const data = await readGalleryData();
    const newImage: GalleryItem = {
      id: uuidv4(),
      title,
      description,
      imageUrl: blob.url,
      category,
      year,
      medium,
      dimensions,
      price,
      isAvailable
    };
    
    data.push(newImage);
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
    const imageIndex = data.findIndex(img => img.id === imageId);

    if (imageIndex === -1) {
      return NextResponse.json({ message: 'Image not found' }, { status: 404 });
    }

    const imageToDelete = data[imageIndex];

    // Delete the image from Vercel Blob
    try {
      // Extract the blob key from the URL
      const urlParts = imageToDelete.imageUrl.split('/');
      const blobKey = urlParts[urlParts.length - 1];
      await del(blobKey);
    } catch (e) {
      console.warn(`Could not delete image file from blob storage:`, (e as Error).message);
      // Continue to remove from JSON even if blob deletion fails
    }

    data.splice(imageIndex, 1);
    await writeGalleryData(data);

    return NextResponse.json({ message: 'Gallery image deleted successfully' });
  } catch (error) {
    console.error('Error deleting gallery image:', error);
    return NextResponse.json({ 
      message: 'Error deleting gallery image', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}