import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter, Href, useFocusEffect } from 'expo-router';
import api from '../../utils/api';
import { excerpt, timeAgo } from '../../utils/format';

const { width } = Dimensions.get('window');

interface FeedAuthor {
  id?: string;
  _id?: string;
  name?: string;
  username?: string;
  avatar?: string | null;
}

interface FeedItem {
  _id: string;
  title?: string;
  content?: string;
  slug?: string;
  tags?: string[];
  media?: { url?: string; type?: string }[];
  author?: FeedAuthor;
  likesCount?: number;
  commentsCount?: number;
  createdAt?: string;
}

const PAGE_SIZE = 10;

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async (pageNum: number, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await api.get(`/api/v1/feed?page=${pageNum}&limit=${PAGE_SIZE}`);
      const payload = res.data || {};
      const items: FeedItem[] = Array.isArray(payload.data) ? payload.data : [];
      setFeed(prev => (pageNum === 1 ? items : [...prev, ...items]));
      setHasMore(
        typeof payload.pages === 'number' ? pageNum < payload.pages : items.length === PAGE_SIZE
      );
      setPage(pageNum);
      setError(null);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Could not load your feed.';
      if (pageNum === 1) setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  // Refresh whenever the screen regains focus (e.g. returning from compose).
  useFocusEffect(
    useCallback(() => {
      fetchFeed(1, true);
    }, [fetchFeed])
  );

  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore) return;
    fetchFeed(page + 1);
  };

  const features = [
    { id: '1', title: 'Start a Blog', icon: 'create-outline', color: '#3B82F6', onPress: () => router.push('/compose' as Href) },
    { id: '2', title: 'Your Feed', icon: 'newspaper-outline', color: '#10B981', onPress: () => fetchFeed(1, true) },
    { id: '3', title: 'Direct Messages', icon: 'chatbubbles-outline', color: '#6366F1', onPress: () => router.push('/messages' as Href) },
    { id: '4', title: 'Settings', icon: 'settings-outline', color: '#64748B', onPress: () => router.push('/(tabs)/explore' as Href) },
  ];

  const renderFeedItem = (item: FeedItem) => {
    const image = item.media?.find(m => m?.type === 'image' && m?.url) as { url?: string } | undefined;
    const authorName = item.author?.name || item.author?.username || 'Zuvo user';

    return (
      <View key={item._id} style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={styles.postAvatar}>
            {item.author?.avatar ? (
              <Image source={{ uri: item.author.avatar }} style={styles.postAvatarImage} />
            ) : (
              <Text style={styles.postAvatarText}>{authorName.charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <View style={styles.postHeaderMeta}>
            <Text style={styles.postAuthor}>{authorName}</Text>
            <Text style={styles.postTime}>{timeAgo(item.createdAt)}</Text>
          </View>
        </View>

        {item.title ? <Text style={styles.postTitle}>{item.title}</Text> : null}
        {item.content ? <Text style={styles.postContent}>{excerpt(item.content)}</Text> : null}

        {image?.url ? (
          <Image source={{ uri: image.url }} style={styles.postImage} resizeMode="cover" />
        ) : null}

        {item.tags && item.tags.length > 0 ? (
          <View style={styles.tagRow}>
            {item.tags.slice(0, 3).map((tag, i) => (
              <Text key={`${tag}-${i}`} style={styles.tagText}>#{tag}</Text>
            ))}
          </View>
        ) : null}

        <View style={styles.postStats}>
          <View style={styles.postStat}>
            <Ionicons name="heart-outline" size={15} color="#94A3B8" />
            <Text style={styles.postStatText}>{item.likesCount || 0}</Text>
          </View>
          <View style={styles.postStat}>
            <Ionicons name="chatbubble-outline" size={14} color="#94A3B8" />
            <Text style={styles.postStatText}>{item.commentsCount || 0}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header Section */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Hello,</Text>
          <Text style={styles.userNameText}>{user?.name || 'Zuvonator'}</Text>
        </View>
        <TouchableOpacity style={styles.notificationBtn} onPress={() => router.push('/notifications' as Href)}>
          <Ionicons name="notifications-outline" size={24} color="#F8FAFC" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchFeed(1, true)} tintColor="#3B82F6" colors={['#3B82F6']} />
        }
      >
        {/* Quick Actions / Featured */}
        <BlurView intensity={20} style={styles.featuredCard}>
          <Text style={styles.featuredTitle}>Ready to connect?</Text>
          <Text style={styles.featuredSubtitle}>Share your thoughts with the Zuvo community today.</Text>
          <TouchableOpacity style={styles.featuredBtn} onPress={() => router.push('/compose' as Href)}>
            <Text style={styles.featuredBtnText}>Create Post</Text>
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </BlurView>

        {/* Grid of Features */}
        <Text style={styles.sectionTitle}>Explore Features</Text>
        <View style={styles.grid}>
          {features.map((item) => (
            <TouchableOpacity key={item.id} style={styles.gridItem} onPress={item.onPress}>
              <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
                <Ionicons name={item.icon as any} size={28} color={item.color} />
              </View>
              <Text style={styles.gridText}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Personalized Feed */}
        <Text style={styles.sectionTitle}>Your Feed</Text>

        {loading ? (
          <View style={styles.emptyStateContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.emptyStateSubtext}>Loading your feed...</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="cloud-offline-outline" size={48} color="#334155" />
            <Text style={styles.emptyStateText}>Something went wrong</Text>
            <Text style={styles.emptyStateSubtext}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchFeed(1)}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : feed.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="planet-outline" size={64} color="#334155" />
            <Text style={styles.emptyStateText}>Your feed is quiet</Text>
            <Text style={styles.emptyStateSubtext}>Follow creators or publish a post and it will show up here.</Text>
          </View>
        ) : (
          <>
            {feed.map(renderFeedItem)}

            <View style={styles.loadMoreWrap}>
              {hasMore ? (
                <TouchableOpacity style={styles.loadMoreBtn} onPress={handleLoadMore} disabled={loadingMore}>
                  {loadingMore ? (
                    <ActivityIndicator size="small" color="#3B82F6" />
                  ) : (
                    <Text style={styles.loadMoreText}>Load More</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <Text style={styles.loadMoreDone}>You&apos;re all caught up.</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Slate 900
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
  },
  userNameText: {
    fontSize: 28,
    color: '#F8FAFC',
    fontWeight: 'bold',
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  featuredCard: {
    padding: 24,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1E293B50',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 32,
  },
  featuredTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  featuredSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
    marginBottom: 20,
  },
  featuredBtn: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  featuredBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 32,
  },
  gridItem: {
    width: (width - 64) / 2,
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#33415550',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gridText: {
    color: '#E2E8F0',
    fontWeight: '600',
    fontSize: 14,
  },
  postCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#33415550',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  postAvatarImage: {
    width: 36,
    height: 36,
  },
  postAvatarText: {
    color: '#E2E8F0',
    fontWeight: 'bold',
    fontSize: 15,
  },
  postHeaderMeta: {
    flex: 1,
  },
  postAuthor: {
    color: '#F8FAFC',
    fontWeight: '600',
    fontSize: 14,
  },
  postTime: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 1,
  },
  postTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  postContent: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  postImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: '#334155',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  tagText: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '500',
  },
  postStats: {
    flexDirection: 'row',
    gap: 18,
    borderTopWidth: 1,
    borderTopColor: '#33415550',
    paddingTop: 10,
  },
  postStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postStatText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#1E293B30',
    borderRadius: 24,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#334155',
    gap: 8,
  },
  emptyStateText: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  emptyStateSubtext: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  loadMoreWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  loadMoreBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1E293B',
    minWidth: 140,
    alignItems: 'center',
  },
  loadMoreText: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 14,
  },
  loadMoreDone: {
    color: '#64748B',
    fontSize: 13,
  },
});
