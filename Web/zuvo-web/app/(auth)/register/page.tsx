import type { Metadata } from "next";

export const metadata: Metadata = { title: "Create Account" };

export default function RegisterPage() {
  return (
    <div className="w-full max-w-md animate-in">
      <h1 className="font-display text-3xl font-bold mb-2">Join Zuvo</h1>
      <p className="text-muted text-sm mb-8">
        Create your account and start writing.
      </p>
      {/* RegisterForm component goes here — feature/auth-register branch */}
      <div className="bg-surface border border-base rounded-2xl p-8 shadow-card">
        <p className="text-muted text-sm text-center">
          Register form — implemented in{" "}
          <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
            feature/auth-register
          </code>
        </p>
      </div>
    </div>
  );
}
