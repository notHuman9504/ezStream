'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { setEmail } from '@/redux/user/userSlice';
import myRouter from '@/lib/route';

export default function SignUp() {
  const router = useRouter();
  const redirect = myRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const dispatch = useDispatch();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const email = formData.email;
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      // Store token in localStorage or other state management solution
      localStorage.setItem('token', data.token);
      dispatch(setEmail(email));
      redirect('/call');
    } catch (err) {
      setError('Failed to create account');
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] w-full flex">
      {/* Left side - White */}
      <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter text-black">
              Create Account
            </h2>
            <p className="text-zinc-600 text-sm">
              Start your streaming experience
            </p>
          </div>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg">
                {error}
              </div>
            )}
            
            <div className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="block w-full px-4 py-3 rounded-lg bg-white border border-zinc-200 text-black placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="block w-full px-4 py-3 rounded-lg bg-white border border-zinc-200 text-black placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-lg bg-black text-white font-medium hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition-all duration-200"
            >
              Create account
            </button>
          </form>

          <p className="text-center text-sm text-zinc-600">
            Already have an account?{' '}
            <button 
              onClick={() => redirect('/signin')}
              className="text-black hover:text-zinc-600 transition-colors font-medium"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>

      {/* Right side - Black */}
      <div className="hidden lg:flex w-1/2 bg-black items-center justify-center p-6">
        <div className="max-w-lg">
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">Join ezStream Today</h1>
          <p className="text-zinc-400 text-lg">
            Start broadcasting to multiple platforms with just a few clicks. Experience the future of streaming.
          </p>
        </div>
      </div>
    </div>
  );
}