import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs'; // Add this import

export async function POST(req: Request) {
    try {
        // Verify JWT_SECRET exists
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not configured');
        }
    
        const { email, password } = await req.json();
     
        await connectDB();
       
        const user = await User.findOne({ email });
       
        
        // Check if user exists
        if (!user) {
            return new Response('Invalid credentials', { status: 401 });
        }

        // Verify password using bcrypt
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return new Response('Invalid credentials', { status: 401 });
        }

        
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET || 'your-fallback-secret',
            { expiresIn: '24h' }
        );

        return new Response(JSON.stringify({ token }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Signin error:', error); 
        return new Response('Authentication failed', { status: 500 });
    }
}