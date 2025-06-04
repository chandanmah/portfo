import { NextRequest, NextResponse } from 'next/server';
import { getAvatarData, saveAvatarData } from '@/lib/fileStorage';
import { getStorageService } from '@/lib/cloudStorage';
import jwt from 'jsonwebtoken';

// Verify JWT token
function verifyToken(token: string): boolean {
  try {
    jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    return true;
  } catch {
    return false;
  }
}

// GET handler to retrieve avatar data
export async function GET() {
  try {
    const data = await getAvatarData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching avatar data:', error);
    return NextResponse.json(
      { message: 'Failed to fetch avatar data' },
      { status: 500 }
    );
  }
}

// POST handler to upload a new avatar
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const avatarFile = formData.get('avatar') as File;

    if (!avatarFile) {
      return NextResponse.json(
        { message: 'No avatar file provided' },
        { status: 400 }
      );
    }

    const storageService = getStorageService();
    
    // Get current avatar data to delete old avatar if exists
    const currentData = await getAvatarData();
    
    // Upload new avatar
    const uploadResult = await storageService.upload(avatarFile, 'avatar');
    
    // Delete old avatar if it exists
    if (currentData.avatarUrl) {
      try {
        await storageService.delete(currentData.avatarUrl);
      } catch (deleteError) {
        console.warn('Could not delete old avatar:', deleteError);
        // Continue even if old avatar deletion fails
      }
    }
    
    // Save new avatar URL
    await saveAvatarData({ avatarUrl: uploadResult.url });

    return NextResponse.json({
      message: 'Avatar uploaded successfully',
      avatarUrl: uploadResult.url
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}