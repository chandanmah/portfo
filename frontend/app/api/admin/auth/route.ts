import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

interface AuthData {
  hashedPassword?: string;
}

// Use environment variable for production or fallback to local file
const authDataPath = process.env.NODE_ENV === 'production' 
  ? '/tmp/authData.json' 
  : path.join(process.cwd(), 'data', 'authData.json');
const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key';

// For production, use environment variable for password
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

async function ensureDirectoryExists(directoryPath: string) {
  try {
    await fs.access(directoryPath);
  } catch (error) {
    await fs.mkdir(directoryPath, { recursive: true });
  }
}

async function readAuthData(): Promise<AuthData> {
  try {
    if (process.env.NODE_ENV === 'production' && ADMIN_PASSWORD_HASH) {
      return { hashedPassword: ADMIN_PASSWORD_HASH };
    }
    await ensureDirectoryExists(path.dirname(authDataPath));
    const data = await fs.promises.readFile(authDataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

async function writeAuthData(data: AuthData): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    // In production, we can't write to file system
    // Password should be set via environment variable
    return;
  }
  await ensureDirectoryExists(path.dirname(authDataPath));
  await fs.promises.writeFile(authDataPath, JSON.stringify(data, null, 2));
}

// POST handler for login and password setup
export async function POST(request: NextRequest) {
  try {
    const { action, password } = await request.json();
    
    if (!password) {
      return NextResponse.json({ message: 'Password is required' }, { status: 400 });
    }

    if (action === 'setup') {
      // In production, prevent password setup via API
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ message: 'Password setup not allowed in production. Use environment variables.' }, { status: 403 });
      }
      
      const authData = await readAuthData();
      if (authData.hashedPassword) {
        return NextResponse.json({ message: 'Password already exists' }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await writeAuthData({ hashedPassword });
      
      const token = jwt.sign({ authenticated: true }, JWT_SECRET, { expiresIn: '24h' });
      return NextResponse.json({
        message: 'Password set successfully',
        token
      });
    } else if (action === 'login') {
      const authData = await readAuthData();
      const isValid = authData.hashedPassword && await bcrypt.compare(password, authData.hashedPassword);
      
      if (!isValid) {
        return NextResponse.json({ message: 'Invalid password' }, { status: 401 });
      }

      const token = jwt.sign({ authenticated: true }, JWT_SECRET, { expiresIn: '24h' });
      return NextResponse.json({
        message: 'Login successful',
        token
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json({ message: 'Authentication error' }, { status: 500 });
  }
}

// GET handler to check auth status
export async function GET(request: NextRequest) {
  try {
    const authData = await readAuthData();
    
    return NextResponse.json({ 
      setupRequired: !authData.hashedPassword 
    });
  } catch (error) {
    console.error('Error checking auth status:', error);
    return NextResponse.json({ message: 'Error checking auth status' }, { status: 500 });
  }
}

// Utility function to verify JWT token
export function verifyToken(token: string): boolean {
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch (error) {
    return false;
  }
}