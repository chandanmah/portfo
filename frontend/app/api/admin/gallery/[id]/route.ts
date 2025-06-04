import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface GalleryImage {
  id: string;
  url: string;
  name: string;
  subtitle?: string; // Added subtitle to match frontend
}

const dataFilePath = path.join(process.cwd(), 'data', 'galleryData.json');

async function readGalleryData(): Promise<{ galleryImages: GalleryImage[] }> {
  try {
    // Ensure the data directory exists (it should, if POST works)
    await fs.access(path.dirname(dataFilePath));
    const jsonData = await fs.readFile(dataFilePath, 'utf-8');
    return JSON.parse(jsonData);
  } catch (error) {
    if ((error as { code: string }).code === 'ENOENT') {
      // If galleryData.json doesn't exist, create it with an empty array
      await fs.writeFile(dataFilePath, JSON.stringify({ galleryImages: [] }, null, 2));
      return { galleryImages: [] };
    }
    console.error('Error reading gallery data:', error);
    throw error;
  }
}

async function writeGalleryData(data: { galleryImages: GalleryImage[] }) {
  await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2));
}

// PUT handler to update an existing gallery image's details
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const imageId = params.id;
    const { name, subtitle } = await request.json();

    if (!imageId) {
      return NextResponse.json({ message: 'Image ID is required' }, { status: 400 });
    }

    if (!name && typeof subtitle === 'undefined') {
        return NextResponse.json({ message: 'Name or subtitle is required for update' }, { status: 400 });
    }

    const data = await readGalleryData();
    const imageIndex = data.galleryImages.findIndex(img => img.id === imageId);

    if (imageIndex === -1) {
      return NextResponse.json({ message: 'Image not found' }, { status: 404 });
    }

    // Update image details
    if (name) {
        data.galleryImages[imageIndex].name = name;
    }
    if (typeof subtitle !== 'undefined') {
        data.galleryImages[imageIndex].subtitle = subtitle;
    }

    await writeGalleryData(data);

    return NextResponse.json({ message: 'Image details updated successfully', image: data.galleryImages[imageIndex] });
  } catch (error) {
    console.error('Error updating gallery image details:', error);
    return NextResponse.json({ message: 'Error updating gallery image details', error: (error as Error).message }, { status: 500 });
  }
}