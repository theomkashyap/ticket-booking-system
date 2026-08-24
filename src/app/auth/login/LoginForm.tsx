'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingMessage from '@/app/components/LoadingMessage';
import Link from 'next/link';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl');
  const error = searchParams.get('error');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMessage('');
  };

  const getRedirectUrl = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return '/admin/venues';
      case 'ORGANISER':
        return '/organiser/events';
      case 'CUSTOMER':
      default:
        return '/events';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    const result = await signIn('credentials', {
      email: formData.email,
      password: formData.password,
      redirect: false,
    });

    if (result?.error) {
      setErrorMessage('Invalid email or password');
      setIsLoading(false);
    } else if (result?.ok) {
      const freshSession = await fetch('/api/auth/session').then(r => r.json());
      const role: string = freshSession?.user?.role ?? 'CUSTOMER';
      const redirectUrl = callbackUrl || getRedirectUrl(role);
      window.location.href = redirectUrl;
    } else {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-10">
        <Link href="/" className="font-serif text-3xl font-medium text-charcoal">
          Curtain
        </Link>
        <h1 className="mt-8 font-serif text-3xl text-charcoal">Welcome Back</h1>
        <p className="mt-3 text-charcoal/60">Sign in to your account</p>
      </div>

      <div className="card p-8">
        {error && (
          <div className="mb-6 p-4 bg-accent/10 border border-accent/20 rounded text-accent text-sm" role="alert">
            Invalid email or password
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 bg-accent/10 border border-accent/20 rounded text-accent text-sm" role="alert">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-charcoal/80 mb-2">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="input"
              required
              autoComplete="email"
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-charcoal/80 mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className="input"
              required
              autoComplete="current-password"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full py-3 mt-2"
            disabled={isLoading}
          >
            {isLoading ? (
                <LoadingMessage variant="inline" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-charcoal/60">
          <p>
            Don't have an account?{' '}
            <Link href="/auth/register" className="link font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}