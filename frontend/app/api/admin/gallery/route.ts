import { NextRequest, NextResponse } from 'next/server';
import { getGalleryData, saveGalleryData, addGalleryImage, removeGalleryImage, type GalleryImage } from '@/lib/fileStorage';
import { getStorageService } from '@/lib/cloudStorage';
import jwt from 'jsonwebtoken';

// Generate unique ID for gallery images
function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

async function getGalleryData(): Promise<GalleryImage[]> {
  try {
    await ensureDatabaseInitialized();
    const images = await db.select().from(galleryImages).orderBy(galleryImages.createdAt);
    return images;
  } catch (error) {
    console.error('Error reading gallery data:', error);
    return [];
  }
}

async function addGalleryImage(imageData: Omit<GalleryImage, 'id'>): Promise<GalleryImage> {
  try {
    await ensureDatabaseInitialized();
    const [newImage] = await db.insert(galleryImages)
      .values({
        url: imageData.url,
        name: imageData.name,
        subtitle: imageData.subtitle || null,
      })
      .returning();
    return newImage;
  } catch (error) {
    console.error('Error adding gallery image:', error);
    throw error;
  }
}

// GET handler to retrieve all gallery images
export async function GET() {
  try {
    const data = await getGalleryData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching gallery data:', error);
    return NextResponse.json(
      { message: 'Failed to fetch gallery data' },
      { status: 500 }
    );
  }
}

// POST handler to upload new gallery images
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('images') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { message: 'No files provided' },
        { status: 400 }
      );
    }

    const storageService = getStorageService();
    const uploadedImages: GalleryImage[] = [];

    for (const file of files) {
      try {
        const uploadResult = await storageService.upload(file, 'gallery');
        
        const newImage: GalleryImage = {
          id: generateId(),
          url: uploadResult.url,
          name: uploadResult.originalName,
          subtitle: ''
        };

        await addGalleryImage(newImage);
        uploadedImages.push(newImage);
      } catch (uploadError) {
        console.error('Error uploading file:', uploadError);
        // Continue with other files even if one fails
      }
    }

    if (uploadedImages.length === 0) {
      return NextResponse.json(
        { message: 'Failed to upload any images' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Successfully uploaded ${uploadedImages.length} image(s)`,
      images: uploadedImages
    });
  } catch (error) {
    console.error('Error in gallery POST:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE handler to remove a gallery image
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('id');

    if (!imageId) {
      return NextResponse.json(
        { message: 'Image ID is required' },
        { status: 400 }
      );
    }

    // Get image data before deletion
    const galleryData = await getGalleryData();
    const imageToDelete = galleryData.galleryImages.find(img => img.id === imageId);

    if (!imageToDelete) {
      return NextResponse.json(
        { message: 'Image not found' },
        { status: 404 }
      );
    }

    // Delete from cloud storage
    const storageService = getStorageService();
    try {
      await storageService.delete(imageToDelete.url);
    } catch (storageError) {
      console.error('Error deleting from cloud storage:', storageError);
      // Continue with file deletion even if cloud storage fails
    }

    // Delete from file storage
    await removeGalleryImage(imageId);

    return NextResponse.json({
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting gallery image:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}