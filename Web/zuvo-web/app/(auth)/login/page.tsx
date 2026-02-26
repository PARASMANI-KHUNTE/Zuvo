import type { Metadata } from "next";

export const metadata: Metadata = { title: "Login" };

export default function LoginPage() {
  return (
    <div className="w-full max-w-md animate-in">
      <h1 className="font-display text-3xl font-bold mb-2">Welcome back</h1>
      <p className="text-muted text-sm mb-8">
        Sign in to continue to Zuvo.
      </p>
      {/* LoginForm component goes here — feature/auth-login branch */}
      <div className="bg-surface border border-base rounded-2xl p-8 shadow-card">
        <p className="text-muted text-sm text-center">
          Login form — implemented in{" "}
          <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
            feature/auth-login
          </code>
        </p>
      </div>
    </div>
  );
}
