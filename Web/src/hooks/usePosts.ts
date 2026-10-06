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

const PAGE_SIZE = 10;

export function usePosts() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const fetchPosts = useCallback(async (pageNum: number = 1) => {
        try {
            if (pageNum === 1) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const response = await apiClient.get(`/blogs?page=${pageNum}&limit=${PAGE_SIZE}`);
            if (response.data.success) {
                const incoming: Post[] = response.data.data || [];
                setPosts(prev => (pageNum === 1 ? incoming : [...prev, ...incoming]));
                setHasMore(
                    typeof response.data.pages === "number"
                        ? pageNum < response.data.pages
                        : incoming.length === PAGE_SIZE
                );
                setPage(pageNum);
                setError(null);
            } else {
                setError("Failed to fetch posts");
            }
        } catch (err: any) {
            setError(err.message || "An error occurred while fetching posts");
        } finally {
            if (pageNum === 1) {
                setLoading(false);
            } else {
                setLoadingMore(false);
            }
        }
    }, []);

    const loadMore = useCallback(() => {
        if (loading || loadingMore || !hasMore) return;
        fetchPosts(page + 1);
    }, [fetchPosts, loading, loadingMore, hasMore, page]);

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
        fetchPosts(1);
    }, [fetchPosts]);

    return {
        posts,
        loading,
        loadingMore,
        error,
        hasMore,
        refresh: () => fetchPosts(1),
        loadMore,
        fetchPostById,
        fetchComments,
        fetchReplies,
        addComment
    };
}
