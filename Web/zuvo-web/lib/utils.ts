import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";

/**
 * Merge Tailwind classes safely.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date as relative time (e.g. "3 hours ago").
 */
export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

/**
 * Format a date as "Jan 12, 2024".
 */
export function formatDate(date: string | Date): string {
  return format(new Date(date), "MMM d, yyyy");
}

/**
 * Truncate a string to a given length.
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

/**
 * Generate initials from a name (e.g. "John Doe" → "JD").
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Extract a readable error message from an Axios error or unknown error.
 */
export function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const axiosError = error as {
      response?: { data?: { message?: string } };
    };
    return axiosError.response?.data?.message ?? "Something went wrong.";
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}
