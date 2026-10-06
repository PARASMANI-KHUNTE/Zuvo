import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { timeAgo } from '../utils/format';

type NotificationType = 'LIKE' | 'FOLLOW' | 'COMMENT' | 'SYSTEM' | string;

interface NotificationItem {
  _id: string;
  type: NotificationType;
  actor?: { id?: string; name?: string; username?: string; avatar?: string };
  message?: string;
  createdAt: string;
  isRead: boolean;
}

const typeIcon = (type: NotificationType) => {
  switch (type) {
    case 'LIKE': return 'heart';
    case 'FOLLOW': return 'person-add';
    case 'COMMENT': return 'chatbubble';
    default: return 'notifications';
  }
};

const typeColor = (type: NotificationType) => {
  switch (type) {
    case 'LIKE': return '#F43F5E';
    case 'FOLLOW': return '#3B82F6';
    case 'COMMENT': return '#10B981';
    default: return '#8B5CF6';
  }
};

const buildMessage = (notif: NotificationItem) => {
  const name = notif.actor?.name || notif.actor?.username || 'Someone';
  switch (notif.type) {
    case 'LIKE': return `${name} liked your post.`;
    case 'FOLLOW': return `${name} started following you.`;
    case 'COMMENT': return `${name} commented on your post.`;
    case 'SYSTEM': return notif.message || `${name} sent an alert.`;
    default: return notif.message || `${name} sent you a notification.`;
  }
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get('/api/v1/notifications');
      const data = res.data?.data;
      setNotifications(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => (n._id === id ? { ...n, isRead: true } : n)));
    try {
      await api.put(`/api/v1/notifications/${id}/read`);
    } catch {
      // Non-critical: keep optimistic state.
    }
  };

  const markAllRead = async () => {
    const hadUnread = notifications.some(n => !n.isRead);
    if (!hadUnread) return;
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      await api.put('/api/v1/notifications/read-all');
    } catch {
      // Non-critical: keep optimistic state.
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={[styles.item, !item.isRead && styles.itemUnread]}
      onPress={() => !item.isRead && markAsRead(item._id)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconBubble, { backgroundColor: `${typeColor(item.type)}20` }]}>
        <Ionicons name={typeIcon(item.type) as any} size={18} color={typeColor(item.type)} />
      </View>

      <View style={styles.itemBody}>
        <Text style={styles.itemText}>{buildMessage(item)}</Text>
        <Text style={styles.itemTime}>{timeAgo(item.createdAt)}</Text>
      </View>

      {item.actor?.avatar ? (
        <Image source={{ uri: item.actor.avatar }} style={styles.actorAvatar} />
      ) : !item.isRead ? (
        <View style={styles.unreadDot} />
      ) : null}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={markAllRead}>
          <Ionicons name="checkmark-done" size={22} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={44} color="#334155" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchNotifications()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchNotifications(true)} tintColor="#3B82F6" colors={['#3B82F6']} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="notifications-off-outline" size={48} color="#334155" />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySub}>Likes, comments and new followers will land here.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  list: {
    padding: 16,
    flexGrow: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#33415550',
  },
  itemUnread: {
    borderColor: '#3B82F650',
    backgroundColor: '#1E293B',
  },
  iconBubble: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemBody: {
    flex: 1,
  },
  itemText: {
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 20,
  },
  itemTime: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 3,
  },
  actorAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 32,
  },
  errorText: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
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
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '600',
    marginTop: 8,
  },
  emptySub: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
  },
});
