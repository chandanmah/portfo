import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface GalleryImage {
  id: string;
  url: string;
  name: string;
  // Add other metadata like title, description if needed
}

const dataFilePath = path.join(process.cwd(), 'data', 'galleryData.json');
const publicUploadsGalleryDir = path.join(process.cwd(), 'public', 'uploads', 'gallery');

async function ensureDirectoryExists(directoryPath: string) {
  try {
    await fs.access(directoryPath);
  } catch (error) {
    await fs.mkdir(directoryPath, { recursive: true });
  }
}

async function readGalleryData(): Promise<{ galleryImages: GalleryImage[] }> {
  try {
    await ensureDirectoryExists(path.join(process.cwd(), 'data'));
    const jsonData = await fs.readFile(dataFilePath, 'utf-8');
    return JSON.parse(jsonData);
  } catch (error) {
    // If file doesn't exist or is empty, return a default structure
    if (error.code === 'ENOENT') {
      return { galleryImages: [] };
    }
    console.error('Error reading gallery data:', error);
    throw error; // Re-throw to be caught by the handler
  }
}

async function writeGalleryData(data: { galleryImages: GalleryImage[] }) {
  await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2));
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