// Vercel Blob storage service for handling image uploads
// This replaces local file system operations for production deployment

import { put, del, type PutBlobResult } from '@vercel/blob';

export interface UploadResult {
  url: string;
  publicId: string;
  originalName: string;
}

export class BlobStorageService {
  async uploadImage(file: File, folder: string = 'portfolio'): Promise<UploadResult> {
    try {
      const filename = `${folder}/${Date.now()}-${file.name}`;
      
      const blob = await put(filename, file, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      return {
        url: blob.url,
        publicId: blob.pathname,
        originalName: file.name,
      };
    } catch (error) {
      console.error('Error uploading to Vercel Blob:', error);
      throw new Error('Failed to upload image to Vercel Blob');
    }
  }

  async deleteImage(url: string): Promise<boolean> {
    try {
      await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN });
      return true;
    } catch (error) {
      console.error('Error deleting from Vercel Blob:', error);
      return false;
    }
  }
}

// Singleton instance
export const blobStorage = new BlobStorageService();

// Helper function to get storage service
export function getStorageService() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN environment variable is required for Vercel Blob storage.');
  }
  
  return {
    upload: (file: File, folder: string) => blobStorage.uploadImage(file, folder),
    delete: (url: string) => blobStorage.deleteImage(url),
  };
}