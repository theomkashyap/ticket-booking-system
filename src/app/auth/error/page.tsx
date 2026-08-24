import Link from 'next/link';

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const error = searchParams?.error || 'Unknown error occurred.';

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-background text-charcoal">
      <div className="card max-w-md w-full text-center">
        <h1 className="font-serif text-3xl mb-4 text-accent">Authentication Error</h1>
        
        <div className="mb-6 p-4 bg-charcoal/5 rounded border border-charcoal/10 text-sm">
          <p className="font-medium mb-1">Error Code:</p>
          <code className="text-accent">{error}</code>
        </div>
        
        <p className="mb-8 text-charcoal/70 text-sm">
          There was a problem signing you in. Please check your credentials and try again.
        </p>

        <Link href="/auth/login" className="btn-primary w-full py-3 inline-block">
          Return to Login
        </Link>
      </div>
    </div>
  );
}
