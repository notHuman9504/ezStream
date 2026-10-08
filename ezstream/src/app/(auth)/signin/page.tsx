'use client';

import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setEmail } from '@/redux/user/userSlice';
import myRouter from '@/lib/route';
import { Button } from '@/components/ui/button';
import { AuthShell } from '../_components/AuthShell';
import { AuthField, FormError } from '../_components/AuthField';

export default function SignIn() {
  const redirect = myRouter();
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPending(true);

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

      // Stays pending while the transition plays and the studio loads.
      redirect('/call');
    } catch (err) {
      setError("Couldn't sign you in. Check your email and password and try again.");
      setPending(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <AuthShell
      title="welcome back"
      lede="Sign in to open the studio, bring guests into a room and go live."
      switchTo={{ prompt: 'new here?', action: 'create an account', onSelect: () => redirect('/signup') }}
    >
      <form onSubmit={handleSubmit} aria-busy={pending}>
        <div className="space-y-4">
          <AuthField
            id="email"
            label="email"
            type="email"
            name="email"
            autoComplete="email"
            spellCheck={false}
            required
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? ERROR_ID : undefined}
          />
          <AuthField
            id="password"
            label="password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            placeholder="your password"
            value={formData.password}
            onChange={handleChange}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? ERROR_ID : undefined}
          />
        </div>

        <FormError id={ERROR_ID} message={error} />

        <Button type="submit" size="lg" className="mt-6 w-full" disabled={pending}>
          {pending ? 'signing in…' : 'sign in'}
        </Button>
      </form>
    </AuthShell>
  );
}

const ERROR_ID = 'signin-error';
