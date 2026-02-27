"use client";
import { useState, useEffect, useCallback } from "react";
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
    media?: Array<{ url: string; type: string; publicId: string }>;
    tags: string[];
    likesCount: number;
    commentsCount: number;
    createdAt: string;
    isLiked?: boolean;
}

export function usePosts() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPosts = useCallback(async () => {
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
    }, []);

    const fetchPostById = useCallback(async (id: string) => {
        try {
            const response = await apiClient.get(`/blogs/${id}`);
            return response.data.success ? response.data.data : null;
        } catch (err) {
            console.error("Failed to fetch post", err);
            return null;
        }
    }, []);

    const fetchComments = useCallback(async (postId: string) => {
        try {
            const response = await apiClient.get(`/interactions/comments/${postId}`);
            return response.data.success ? response.data.data : [];
        } catch (err) {
            console.error("Failed to fetch comments", err);
            return [];
        }
    }, []);

    const fetchReplies = useCallback(async (commentId: string) => {
        try {
            const response = await apiClient.get(`/interactions/comments/replies/${commentId}`);
            return response.data.success ? response.data.data : [];
        } catch (err) {
            console.error("Failed to fetch replies", err);
            return [];
        }
    }, []);

    const addComment = useCallback(async (postId: string, content: string, parentCommentId?: string) => {
        try {
            const response = await apiClient.post("/interactions/comments", { postId, content, parentCommentId });
            return response.data.success ? response.data.data : null;
        } catch (err) {
            console.error("Failed to add comment", err);
            return null;
        }
    }, []);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    return { posts, loading, error, refresh: fetchPosts, fetchPostById, fetchComments, fetchReplies, addComment };
}
