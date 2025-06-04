// File-based storage system for portfolio data
// This replaces database operations for simpler deployment

import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

// Ensure data directory exists
export async function ensureDataDirectory() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Generic file operations
export async function readJsonFile<T>(filename: string, defaultValue: T): Promise<T> {
  try {
    await ensureDataDirectory();
    const filePath = path.join(DATA_DIR, filename);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Return default value if file doesn't exist or is invalid
    return defaultValue;
  }
}

export async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  try {
    await ensureDataDirectory();
    const filePath = path.join(DATA_DIR, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing to ${filename}:`, error);
    throw new Error(`Failed to write data to ${filename}`);
  }
}

// Specific data operations
export interface GalleryImage {
  id: string;
  url: string;
  name: string;
  subtitle?: string;
}

export interface GalleryData {
  galleryImages: GalleryImage[];
}

export interface ContactData {
  email: string;
  phone: string;
  location: string;
  studioVisitsText: string;
  emailRouting: string;
}

export interface SocialMediaData {
  instagram: string;
  facebook: string;
  twitter: string;
}

export interface AvatarData {
  avatarUrl: string;
}

export interface AuthData {
  hashedPassword?: string;
  setupComplete: boolean;
}

// Gallery operations
export async function getGalleryData(): Promise<GalleryData> {
  return readJsonFile('galleryData.json', { galleryImages: [] });
}

export async function saveGalleryData(data: GalleryData): Promise<void> {
  return writeJsonFile('galleryData.json', data);
}

export async function addGalleryImage(image: GalleryImage): Promise<void> {
  const galleryData = await getGalleryData();
  galleryData.galleryImages.push(image);
  await saveGalleryData(galleryData);
}

export async function removeGalleryImage(imageId: string): Promise<void> {
  const galleryData = await getGalleryData();
  galleryData.galleryImages = galleryData.galleryImages.filter(img => img.id !== imageId);
  await saveGalleryData(galleryData);
}

// Contact operations
export async function getContactData(): Promise<ContactData> {
  return readJsonFile('contactData.json', {
    email: '',
    phone: '',
    location: '',
    studioVisitsText: '',
    emailRouting: ''
  });
}

export async function saveContactData(data: ContactData): Promise<void> {
  return writeJsonFile('contactData.json', data);
}

// Social media operations
export async function getSocialData(): Promise<SocialMediaData> {
  return readJsonFile('socialData.json', {
    instagram: '',
    facebook: '',
    twitter: ''
  });
}

export async function saveSocialData(data: SocialMediaData): Promise<void> {
  return writeJsonFile('socialData.json', data);
}

// Avatar operations
export async function getAvatarData(): Promise<AvatarData> {
  return readJsonFile('avatarData.json', { avatarUrl: '' });
}

export async function saveAvatarData(data: AvatarData): Promise<void> {
  return writeJsonFile('avatarData.json', data);
}

// Auth operations
export async function getAuthData(): Promise<AuthData> {
  return readJsonFile('authData.json', { setupComplete: false });
}

export async function saveAuthData(data: AuthData): Promise<void> {
  return writeJsonFile('authData.json', data);
}