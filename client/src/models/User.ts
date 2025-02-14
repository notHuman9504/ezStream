//create user model with email and password and i will use mongo db to store it
import mongoose from 'mongoose';
// ... existing User model code ...
import bcrypt from 'bcryptjs';

// Define the schema first
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}, { 
    timestamps: true // Optional: adds createdAt and updatedAt fields
});

// Add middleware
userSchema.pre('save', async function(next) {
    console.log('Pre-save middleware triggered');
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) {
        console.log('Password not modified, skipping hashing');
        return next();
    }
    
    try {
        console.log('Hashing password...');
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        console.log('Password hashed successfully');
        next();
    } catch (error:any) {
        console.error('Error hashing password:', error);
        next(error);
    }
});


export const User = mongoose.models.User || mongoose.model('User', userSchema);