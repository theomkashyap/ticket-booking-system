'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LoadingMessage from '@/app/components/LoadingMessage';

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'CUSTOMER',
    organiserKey: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setErrorMessage('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          organiserKey: formData.role === 'ORGANISER' ? formData.organiserKey : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'Registration failed');
        return;
      }

      router.push('/auth/login?registered=true');
    } catch {
      setErrorMessage('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 sm:py-16 px-4 sm:px-6 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" className="font-serif text-3xl font-medium text-charcoal">
            Curtain
          </Link>
          <h1 className="mt-8 font-serif text-3xl text-charcoal">Create Account</h1>
          <p className="mt-3 text-charcoal/60">Join as a customer or organiser</p>
        </div>

        <div className="card p-8">
          {errorMessage && (
            <div className="mb-6 p-4 bg-accent/10 border border-accent/20 rounded text-accent text-sm" role="alert">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-charcoal/80 mb-2">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                className="input"
                required
                autoComplete="name"
                disabled={isLoading}
                autoFocus
              />
            </div>

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
                autoComplete="new-password"
                minLength={8}
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-charcoal/80 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="input"
                required
                autoComplete="new-password"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-charcoal/80 mb-2">
                Register As
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="input"
                disabled={isLoading}
              >
                <option value="CUSTOMER">Customer</option>
                <option value="ORGANISER">Organiser</option>
              </select>
              <p className="mt-2 text-xs text-charcoal/50">
                Admins are created directly in the database
              </p>
            </div>

            {formData.role === 'ORGANISER' && (
              <div>
                <label htmlFor="organiserKey" className="block text-sm font-medium text-charcoal/80 mb-2">
                  Organiser Key
                </label>
                <input
                  id="organiserKey"
                  name="organiserKey"
                  type="password"
                  value={formData.organiserKey}
                  onChange={handleChange}
                  className="input"
                  required
                  disabled={isLoading}
                />
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full py-3 mt-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <LoadingMessage variant="inline" />
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-charcoal/60">
            <p>
              Already have an account?{' '}
              <Link href="/auth/login" className="link font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}