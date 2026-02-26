import { redirect } from "next/navigation";

export default function RootPage() {
  // Middleware handles auth-based redirects.
  // This fallback sends users to the feed.
  redirect("/feed");
}
