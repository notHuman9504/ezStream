import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function GET() {
  try {
    const headersList = await headers()
    const authorization = headersList.get('authorization')

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      )
    }

    const token = authorization.split(' ')[1]
    
    // Update the type to match what we store in the token
    const decoded = jwt.verify(token, JWT_SECRET) as { 
      userId: string;
      email: string;
    }
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }


    return NextResponse.json({
      email: decoded.email,
      userId: decoded.userId  // Optionally return userId as well
    })

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}