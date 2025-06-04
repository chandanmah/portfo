import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

interface AuthData {
  hashedPassword?: string;
}

const AUTH_KEY = 'admin_auth_data';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

async function readAuthData(): Promise<AuthData> {
  const data = await kv.get<AuthData>(AUTH_KEY);
  return data || {};
}

async function writeAuthData(data: AuthData) {
  await kv.set(AUTH_KEY, data);
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