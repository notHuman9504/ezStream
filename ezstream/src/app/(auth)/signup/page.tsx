'use client';

import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setEmail } from '@/redux/user/userSlice';
import myRouter from '@/lib/route';
import { Button } from '@/components/ui/button';
import { AuthShell } from '../_components/AuthShell';
import { AuthField, FormError } from '../_components/AuthField';

export default function SignUp() {
  const redirect = myRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const dispatch = useDispatch();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPending(true);

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
      // Stays pending while the transition plays and the studio loads.
      redirect('/call');
    } catch (err) {
      setError("Couldn't create your account. Try a different email, or try again in a moment.");
      setPending(false);
    }
  };

  return (
    <AuthShell
      title="create your account"
      lede="Start a room, compose the shot with overlays and stream it to any RTMP destination."
      switchTo={{ prompt: 'have an account?', action: 'sign in', onSelect: () => redirect('/signin') }}
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
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? ERROR_ID : undefined}
          />
          <AuthField
            id="password"
            label="password"
            type="password"
            name="password"
            autoComplete="new-password"
            required
            placeholder="choose a password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? ERROR_ID : undefined}
          />
        </div>

        <FormError id={ERROR_ID} message={error} />

        <Button type="submit" size="lg" className="mt-6 w-full" disabled={pending}>
          {pending ? 'creating account…' : 'create account'}
        </Button>
      </form>
    </AuthShell>
  );
}

const ERROR_ID = 'signup-error';
