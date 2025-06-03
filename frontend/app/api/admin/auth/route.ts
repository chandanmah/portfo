import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

interface AuthData {
  hashedPassword?: string;
}

const dataFilePath = path.join(process.cwd(), 'data', 'authData.json');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

async function ensureDirectoryExists(directoryPath: string) {
  try {
    await fs.access(directoryPath);
  } catch (error) {
    await fs.mkdir(directoryPath, { recursive: true });
  }
}

async function readAuthData(): Promise<AuthData> {
  try {
    await ensureDirectoryExists(path.join(process.cwd(), 'data'));
    const jsonData = await fs.readFile(dataFilePath, 'utf-8');
    return JSON.parse(jsonData);
  } catch (error) {
    // If file doesn't exist, return empty structure
    if ((error as { code?: string }).code === 'ENOENT') {
      return {};
    }
    console.error('Error reading auth data:', error);
    throw error;
  }
}

async function writeAuthData(data: AuthData) {
  await ensureDirectoryExists(path.join(process.cwd(), 'data'));
  await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2));
}

// POST handler for login and password setup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, action } = body;

    if (!password) {
      return NextResponse.json({ message: 'Password is required' }, { status: 400 });
    }

    const authData = await readAuthData();

    if (action === 'setup') {
      // Setup password (only if no password exists)
      if (authData.hashedPassword) {
        return NextResponse.json({ message: 'Password already exists' }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      await writeAuthData({ hashedPassword });
      
      const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '24h' });
      
      return NextResponse.json({ 
        message: 'Password setup successful', 
        token,
        setupComplete: true 
      });
    } else {
      // Login
      if (!authData.hashedPassword) {
        return NextResponse.json({ 
          message: 'Password not set up yet', 
          setupRequired: true 
        }, { status: 401 });
      }

      const isValid = await bcrypt.compare(password, authData.hashedPassword);
      
      if (!isValid) {
        return NextResponse.json({ message: 'Invalid password' }, { status: 401 });
      }

      const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '24h' });
      
      return NextResponse.json({ 
        message: 'Login successful', 
        token 
      });
    }
  } catch (error) {
    console.error('Error in auth:', error);
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