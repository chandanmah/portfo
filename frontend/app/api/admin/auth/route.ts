import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getAuthData, saveAuthData } from '@/lib/fileStorage';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// POST - Handle login or setup
export async function POST(request: NextRequest) {
  try {
    const { password, action } = await request.json();
    
    if (!password) {
      return NextResponse.json({ message: 'Password is required' }, { status: 400 });
    }

    const authDataResult = await getAuthData();
    
    if (action === 'setup') {
      // Setup new password
      if (authDataResult.isSetup) {
        return NextResponse.json({ message: 'Password already set up' }, { status: 400 });
      }
      
      const hashedPassword = await bcrypt.hash(password, 12);
      await saveAuthData({ passwordHash: hashedPassword, isSetup: true });
      
      const token = jwt.sign({ authenticated: true }, JWT_SECRET, { expiresIn: '24h' });
      
      return NextResponse.json({ 
        message: 'Password set up successfully', 
        token,
        success: true 
      });
    } else {
      // Login
      if (!authDataResult.isSetup || !authDataResult.passwordHash) {
        return NextResponse.json({ message: 'Password not set up' }, { status: 400 });
      }
      
      const isValid = await bcrypt.compare(password, authDataResult.passwordHash);
      
      if (!isValid) {
        return NextResponse.json({ message: 'Invalid password' }, { status: 401 });
      }
      
      const token = jwt.sign({ authenticated: true }, JWT_SECRET, { expiresIn: '24h' });
      
      return NextResponse.json({ 
        message: 'Login successful', 
        token,
        success: true 
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
    const authDataResult = await getAuthData();
    
    return NextResponse.json({ 
      setupRequired: !authDataResult.isSetup 
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