import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';

export default function ComposeScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePublish = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Missing details', 'A title and body are required to publish.');
      return;
    }
    if (title.trim().length > 100) {
      Alert.alert('Title too long', 'Keep the title under 100 characters.');
      return;
    }

    setLoading(true);
    try {
      const tagList = tags
        .split(',')
        .map(t => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      const res = await api.post('/api/v1/blogs', {
        title: title.trim(),
        content: content.trim(),
        tags: tagList,
        status: 'published',
      });

      if (res.status === 201 || res.data?.success) {
        router.back();
      } else {
        throw new Error(res.data?.message || 'Publish failed');
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || error.message || 'Could not publish your post.';
      Alert.alert('Publish Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} disabled={loading} style={styles.headerBtn}>
          <Ionicons name="close" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Post</Text>
        <TouchableOpacity onPress={handlePublish} disabled={loading} style={styles.publishBtn}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.publishBtnText}>Publish</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.titleInput}
          placeholder="Post title"
          placeholderTextColor="#64748B"
          value={title}
          onChangeText={setTitle}
          maxLength={100}
          editable={!loading}
        />

        <TextInput
          style={styles.contentInput}
          placeholder="Write something worth reading..."
          placeholderTextColor="#64748B"
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          editable={!loading}
        />

        <Text style={styles.label}>Tags</Text>
        <TextInput
          style={styles.tagsInput}
          placeholder="travel, food, tech (comma separated)"
          placeholderTextColor="#64748B"
          value={tags}
          onChangeText={setTags}
          autoCapitalize="none"
          editable={!loading}
        />
        <Text style={styles.hint}>Posts are published immediately and appear in your followers&apos; feeds.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
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
  publishBtn: {
    minWidth: 84,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  publishBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  form: {
    padding: 24,
    paddingBottom: 48,
  },
  titleInput: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '700',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingVertical: 12,
    marginBottom: 16,
  },
  contentInput: {
    color: '#E2E8F0',
    fontSize: 16,
    lineHeight: 24,
    minHeight: 220,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  label: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  tagsInput: {
    color: '#F8FAFC',
    fontSize: 15,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  hint: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 12,
    lineHeight: 18,
  },
});
