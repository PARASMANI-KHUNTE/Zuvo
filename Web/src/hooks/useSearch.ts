"use client";
import { useState } from "react";
import apiClient from "@/lib/api";

export interface SearchResults {
    posts: any[];
    users: any[];
}

export function useSearch() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResults>({ posts: [], users: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const performSearch = async (searchQuery: string) => {
        if (!searchQuery || searchQuery.trim().length < 2) {
            setResults({ posts: [], users: [] });
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await apiClient.get(`/search?q=${encodeURIComponent(searchQuery)}`);
            if (response.data.success) {
                setResults(response.data.data);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Search failed");
        } finally {
            setLoading(false);
        }
    };

    return {
        query,
        setQuery,
        results,
        loading,
        error,
        performSearch
    };
}
