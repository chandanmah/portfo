import { NextRequest, NextResponse } from 'next/server';
import { put, head } from '@vercel/blob';

const ADMIN_PASSWORD_KEY = 'admin-password';

// Helper function to get admin password from Vercel Blob
async function getAdminPassword(): Promise<string | null> {
  const configPathname = 'admin-config.json';
  try {
    // Check if the config file exists using head(). The SDK handles the base URL.
    const blobHead = await head(configPathname, { token: process.env.BLOB_READ_WRITE_TOKEN });

    // If it exists, fetch its content using its direct URL from the head result
    const response = await fetch(blobHead.url, { // Use blobHead.url which is the direct, token-less URL
      // No explicit Authorization header needed here if blobHead.url is already the public (or signed) URL
    });

    if (response.ok) {
      const data = await response.json();
      return data.adminPassword || null;
    }
    console.error('Failed to fetch admin password, status:', response.status, 'URL:', blobHead.url);
  } catch (error) {
    // head() throws an error if the blob doesn't exist (typically a 404-like error)
    // Or if there's a network/auth issue with the head request itself.
    if (error && error.message && error.message.includes('404')) { // More robust check for 404 from head
      console.log('Admin config file not found (admin-config.json). Password not set.');
    } else {
      console.error('Error getting admin password (head or fetch):', error);
    }
  }
  return null;
}

// Helper function to set admin password in Vercel Blob
async function setAdminPassword(password: string): Promise<void> {
  const config = { adminPassword: password };
  const configPathname = 'admin-config.json';
  try {
    await put(configPathname, JSON.stringify(config), {
      access: 'public',
      contentType: 'application/json',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      allowOverwrite: true, // Allow overwriting the existing config file
    });
  } catch (error) {
    console.error('Error setting admin password in Vercel Blob:', error);
    throw error; // Re-throw to be caught by the POST handler
  }
}

// POST handler for login and initial password setup
export async function POST(request: NextRequest) {
  try {
    const { password, isSetup } = await request.json();

    if (!password) {
      return NextResponse.json({ message: 'Password is required' }, { status: 400 });
    }

    const existingPassword = await getAdminPassword();

    // If this is initial setup and no password exists
    if (isSetup && !existingPassword) {
      await setAdminPassword(password);
      return NextResponse.json({ message: 'Admin password set successfully', isSetup: true });
    }

    // If no password is set yet, require setup
    if (!existingPassword) {
      return NextResponse.json({ message: 'Admin password not set. Please set up your password first.', requiresSetup: true }, { status: 401 });
    }

    // Verify password
    if (password === existingPassword) {
      return NextResponse.json({ message: 'Login successful' });
    } else {
      return NextResponse.json({ message: 'Invalid password' }, { status: 401 });
    }
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ message: 'Authentication failed' }, { status: 500 });
  }
}

// GET handler to check if admin password is set
export async function GET() {
  try {
    const existingPassword = await getAdminPassword();
    return NextResponse.json({ isSetup: !!existingPassword });
  } catch (error) {
    return NextResponse.json({ isSetup: false });
  }
}