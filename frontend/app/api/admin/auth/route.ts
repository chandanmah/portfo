import { NextRequest, NextResponse } from 'next/server';
import { put, head } from '@vercel/blob';

const ADMIN_PASSWORD_KEY = 'admin-password';

// Helper function to get admin password from Vercel Blob
async function getAdminPassword(): Promise<string | null> {
  try {
    const response = await fetch(`${process.env.BLOB_READ_WRITE_TOKEN ? 'https://blob.vercel-storage.com' : 'http://localhost:3000'}/admin-config.json`);
    if (response.ok) {
      const data = await response.json();
      return data.adminPassword || null;
    }
  } catch (error) {
    console.log('No admin password set yet');
  }
  return null;
}

// Helper function to set admin password in Vercel Blob
async function setAdminPassword(password: string): Promise<void> {
  const config = { adminPassword: password };
  await put('admin-config.json', JSON.stringify(config), {
    access: 'public',
    contentType: 'application/json',
  });
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