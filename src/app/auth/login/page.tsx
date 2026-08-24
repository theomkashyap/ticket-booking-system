import { Suspense } from 'react';
import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 sm:py-16 px-4 sm:px-6 bg-background">
      <Suspense fallback={<div className="w-full max-w-md card animate-pulse">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}