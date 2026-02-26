export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* AppShell (Sidebar + Topbar) goes here — ui/layout-shell branch */}
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
