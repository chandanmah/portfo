import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface GalleryImage {
  id: string;
  name: string;
  subtitle: string;
  imageUrl: string;
}

interface GalleryData {
  galleryImages: GalleryImage[];
}

// Use environment variables for production or fallback to local file
const dataFilePath = process.env.NODE_ENV === 'production' 
  ? '/tmp/galleryData.json' 
  : path.join(process.cwd(), 'data', 'galleryData.json');
const publicUploadsGalleryDir = process.env.NODE_ENV === 'production'
  ? '/tmp/uploads'
  : path.join(process.cwd(), 'public', 'uploads', 'gallery');

// Default gallery data for production
const defaultGalleryData: GalleryData = {
  galleryImages: []
};

async function ensureDirectoryExists(directoryPath: string) {
  try {
    await fs.access(directoryPath);
  } catch (error) {
    await fs.mkdir(directoryPath, { recursive: true });
  }
}

async function readGalleryData(): Promise<GalleryData> {
  try {
    if (process.env.NODE_ENV === 'production') {
      // In production, try to read from temp file or return default data
      try {
        const data = await fs.promises.readFile(dataFilePath, 'utf8');
        return JSON.parse(data);
      } catch {
        return defaultGalleryData;
      }
    }
    await ensureDirectoryExists(path.dirname(dataFilePath));
    const data = await fs.promises.readFile(dataFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return defaultGalleryData;
  }
}

async function writeGalleryData(data: GalleryData): Promise<void> {
  try {
    if (process.env.NODE_ENV === 'production') {
      // In production, write to temp directory
      await fs.promises.writeFile(dataFilePath, JSON.stringify(data, null, 2));
      return;
    }
    await ensureDirectoryExists(path.dirname(dataFilePath));
    await fs.promises.writeFile(dataFilePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing gallery data:', error);
    throw error;
  }
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
    // const title = formData.get('title') as string | null;
    // const description = formData.get('description') as string | null;

    if (!file) {
      return NextResponse.json({ message: 'No gallery image file provided' }, { status: 400 });
    }

    await ensureDirectoryExists(publicUploadsGalleryDir);

    const fileExtension = path.extname(file.name);
    const timestamp = Date.now();
    const uniqueFileName = `gallery-${timestamp}${fileExtension}`;
    const filePath = path.join(publicUploadsGalleryDir, uniqueFileName);
    const publicPath = `/uploads/gallery/${uniqueFileName}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filePath, buffer);

    const data = await readGalleryData();
    const newImage: GalleryImage = {
      id: uniqueFileName, // Using filename as ID for simplicity
      url: publicPath,
      name: file.name,
      // title: title || '',
      // description: description || '',
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

    // Delete the physical file
    const imagePath = path.join(process.cwd(), 'public', imageToDelete.url);
    try {
        await fs.access(imagePath);
        await fs.unlink(imagePath);
    } catch (e) {
        console.warn(`Could not delete image file ${imagePath}:`, e.message);
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