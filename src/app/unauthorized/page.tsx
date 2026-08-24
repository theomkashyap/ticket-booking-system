import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-background">
      <div className="text-center">
        <h1 className="font-serif text-4xl mb-4 text-charcoal">Unauthorized</h1>
        <p className="text-charcoal/60 mb-8 max-w-md mx-auto">
          You don't have permission to access this page. Please log in with an account that has the required role.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/auth/login" className="btn-primary rounded shadow-none">
            Log In
          </Link>
          <Link href="/" className="btn-secondary">
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}