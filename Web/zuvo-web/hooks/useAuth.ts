"use client";

import { useAuthStore } from "@/store";

/**
 * Convenience hook for accessing auth state and actions.
 */
export const useAuth = () => {
  const user            = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading       = useAuthStore((s) => s.isLoading);
  const setUser         = useAuthStore((s) => s.setUser);
  const setTokens       = useAuthStore((s) => s.setTokens);
  const logout          = useAuthStore((s) => s.logout);

  return { user, isAuthenticated, isLoading, setUser, setTokens, logout };
};
