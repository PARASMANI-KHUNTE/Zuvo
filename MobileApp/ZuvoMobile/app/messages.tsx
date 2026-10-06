import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { excerpt, timeAgo } from '../utils/format';

interface Profile {
  id?: string;
  _id?: string;
  name?: string;
  username?: string;
  avatar?: string | null;
}

interface Conversation {
  _id: string;
  participants: Profile[];
  lastMessage?: { content?: string; createdAt?: string } | null;
  isGroup?: boolean;
  groupName?: string;
  updatedAt?: string;
}

interface Message {
  _id: string;
  content?: string;
  sender?: Profile;
  createdAt: string;
}

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const currentUserId = user?.id;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const fetchConversations = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get('/api/v1/chat/conversations');
      const data = res.data?.data;
      setConversations(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not load your conversations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const openConversation = async (conversation: Conversation) => {
    setActive(conversation);
    setMessages([]);
    setMessagesLoading(true);
    try {
      const res = await api.get(`/api/v1/chat/messages/${conversation._id}?page=1&limit=50`);
      const data = res.data?.data;
      setMessages(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not load messages.');
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || !active || sending) return;

    setSending(true);
    try {
      const res = await api.post('/api/v1/chat/message', {
        conversationId: active._id,
        content,
      });
      const created: Message | undefined = res.data?.data;
      if (created) setMessages(prev => [...prev, created]);
      setDraft('');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Message failed to send.';
      console.error(msg);
    } finally {
      setSending(false);
    }
  };

  const titleFor = (conversation: Conversation) => {
    if (conversation.isGroup) return conversation.groupName || 'Group chat';
    const other = conversation.participants.find(p => (p.id || p._id) !== currentUserId) || conversation.participants[0];
    return other?.name || other?.username || 'Conversation';
  };

  const avatarFor = (conversation: Conversation): string | null => {
    if (conversation.isGroup) return null;
    const other = conversation.participants.find(p => (p.id || p._id) !== currentUserId) || conversation.participants[0];
    return other?.avatar || null;
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const name = titleFor(item);
    const avatar = avatarFor(item);
    return (
      <TouchableOpacity style={styles.convItem} onPress={() => openConversation(item)} activeOpacity={0.7}>
        <View style={styles.convAvatar}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.convAvatarImage} />
          ) : (
            <Text style={styles.convAvatarText}>{name.charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.convBody}>
          <View style={styles.convTopRow}>
            <Text style={styles.convName} numberOfLines={1}>{name}</Text>
            <Text style={styles.convTime}>{timeAgo(item.lastMessage?.createdAt || item.updatedAt)}</Text>
          </View>
          <Text style={styles.convPreview} numberOfLines={1}>
            {item.lastMessage?.content ? excerpt(item.lastMessage.content, 70) : 'No messages yet'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const senderId = item.sender?.id || item.sender?._id;
    const isMine = !!senderId && senderId === currentUserId;
    return (
      <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
          {!isMine && item.sender?.name ? <Text style={styles.bubbleSender}>{item.sender.name}</Text> : null}
          <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{item.content}</Text>
          <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>{timeAgo(item.createdAt)}</Text>
        </View>
      </View>
    );
  };

  if (active) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <StatusBar style="light" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setActive(null)}>
            <Ionicons name="arrow-back" size={22} color="#F8FAFC" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>{titleFor(active)}</Text>
            <Text style={styles.headerSubtitle}>{active.isGroup ? 'Group' : 'Direct message'}</Text>
          </View>
          <View style={styles.headerBtn} />
        </View>

        {messagesLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={item => item._id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptySub}>Say hello — this is the start of the conversation.</Text>
              </View>
            }
          />
        )}

        <View style={styles.composer}>
          <TextInput
            style={styles.composerInput}
            placeholder="Message..."
            placeholderTextColor="#64748B"
            value={draft}
            onChangeText={setDraft}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!draft.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : error && conversations.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubbles-outline" size={44} color="#334155" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchConversations()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={item => item._id}
          renderItem={renderConversation}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchConversations(true)} tintColor="#3B82F6" colors={['#3B82F6']} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color="#334155" />
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySub}>Start a chat from a profile to see it here.</Text>
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
    gap: 12,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  list: {
    padding: 16,
    flexGrow: 1,
  },
  convItem: {
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
  convAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  convAvatarImage: {
    width: 44,
    height: 44,
  },
  convAvatarText: {
    color: '#E2E8F0',
    fontWeight: 'bold',
    fontSize: 17,
  },
  convBody: {
    flex: 1,
  },
  convTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  convName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  convTime: {
    color: '#64748B',
    fontSize: 11,
  },
  convPreview: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 3,
  },
  messageList: {
    padding: 16,
    flexGrow: 1,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  bubbleRowMine: {
    justifyContent: 'flex-end',
  },
  bubbleRowTheirs: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  bubbleMine: {
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: '#1E293B',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#33415550',
  },
  bubbleSender: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 3,
  },
  bubbleText: {
    color: '#E2E8F0',
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTextMine: {
    color: '#FFFFFF',
  },
  bubbleTime: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  bubbleTimeMine: {
    color: '#DBEAFE',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  composerInput: {
    flex: 1,
    maxHeight: 110,
    minHeight: 44,
    color: '#F8FAFC',
    fontSize: 15,
    backgroundColor: '#1E293B',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#334155',
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
