'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { setEmail } from '@/redux/user/userSlice';
import myRouter from '@/lib/route';

export default function SignIn() {
  const redirect = myRouter();
  const dispatch = useDispatch();
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      // call signin api
      const email = formData.email
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      dispatch(setEmail(email));
      
      redirect('/call');
    } catch (err) {
      setError('Failed to sign in. Please check your credentials.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Left side - White */}
      <div className="hidden lg:flex w-1/2 bg-white items-center justify-center p-6">
        <div className="max-w-lg">
          <h1 className="text-4xl lg:text-5xl font-bold text-black mb-4">Welcome to ezStream</h1>
          <p className="text-zinc-600 text-lg">
            Stream directly from your browser to multiple platforms simultaneously.
          </p>
        </div>
      </div>

      {/* Right side - Black */}
      <div className="w-full lg:w-1/2 bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter text-white">
              Welcome Back
            </h2>
            <p className="text-zinc-400 text-sm">
              Continue your streaming journey
            </p>
          </div>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="text-red-500 text-sm text-center bg-red-50/10 py-2 rounded-lg">
                {error}
              </div>
            )}
            
            <div className="space-y-5">
              <div className="space-y-1">
                <label className="text-sm font-medium text-white block">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-zinc-800 text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all duration-200"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-white block">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-zinc-800 text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all duration-200"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-lg bg-white text-black font-medium hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black transition-all duration-200"
            >
              Sign in
            </button>
          </form>

          <p className="text-center text-sm text-zinc-400">
            Don't have an account?{' '}
            <button 
              onClick={() => redirect('/signup')}
              className="text-white hover:text-zinc-300 transition-colors font-medium"
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}