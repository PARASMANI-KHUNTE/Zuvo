"use client";
import { useState, useEffect } from "react";
import apiClient from "@/lib/api";

export interface Post {
    _id: string;
    title: string;
    content: string;
    author: {
        _id: string;
        username: string;
        avatar?: string;
    };
    image?: string;
    tags: string[];
    likesCount: number;
    commentsCount: number;
    createdAt: string;
}

export function usePosts() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPosts = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get("/blogs");
            if (response.data.success) {
                setPosts(response.data.data);
            } else {
                setError("Failed to fetch posts");
            }
        } catch (err: any) {
            setError(err.message || "An error occurred while fetching posts");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    return { posts, loading, error, refresh: fetchPosts };
}
