import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
    try {
        console.log("signup route called");
        const { email, password } = await req.json();
        await connectDB();
        
        console.log("Checking for existing user...");
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return new Response('User already exists', { status: 409 });
        }

        console.log("Creating new user...");
        // Create new user explicitly
        const user = new User({
            email,
            password: password.toString() // Ensure password is a string
        });

        // Save the user and await the result
        const savedUser = await user.save();
        console.log("User saved:", savedUser._id);

        // Generate JWT token
        const token = jwt.sign(
            { userId: savedUser._id, email: savedUser.email },
            process.env.JWT_SECRET || 'your-fallback-secret',
            { expiresIn: '24h' }
        );

        return new Response(JSON.stringify({ token }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Signup error:', error);
        return new Response(JSON.stringify({ error: 'Error creating user' }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}