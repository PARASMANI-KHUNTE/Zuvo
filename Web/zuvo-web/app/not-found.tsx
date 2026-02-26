import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] text-center px-4">
      <p className="font-mono text-sm text-muted mb-4">404</p>
      <h1 className="font-display text-4xl font-bold mb-3">Page not found</h1>
      <p className="text-muted text-sm mb-8 max-w-xs">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        href="/feed"
        className="px-5 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors"
      >
        Go to Feed
      </Link>
    </main>
  );
}
