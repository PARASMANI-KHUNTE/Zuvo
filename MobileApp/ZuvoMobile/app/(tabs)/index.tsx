import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user } = useAuth();

  const features = [
    { id: '1', title: 'Start a Blog', icon: 'create-outline', color: '#3B82F6' },
    { id: '2', title: 'Explore Feed', icon: 'newspaper-outline', color: '#10B981' },
    { id: '3', title: 'Direct Messages', icon: 'chatbubbles-outline', color: '#6366F1' },
    { id: '4', title: 'Settings', icon: 'settings-outline', color: '#64748B' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header Section */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Hello,</Text>
          <Text style={styles.userNameText}>{user?.name || 'Zuvonator'}</Text>
        </View>
        <TouchableOpacity style={styles.notificationBtn}>
          <Ionicons name="notifications-outline" size={24} color="#F8FAFC" />
          <View style={styles.notificationBadge} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Quick Actions / Featured */}
        <BlurView intensity={20} style={styles.featuredCard}>
          <Text style={styles.featuredTitle}>Ready to connect?</Text>
          <Text style={styles.featuredSubtitle}>Share your thoughts with the Zuvo community today.</Text>
          <TouchableOpacity style={styles.featuredBtn}>
            <Text style={styles.featuredBtnText}>Create Post</Text>
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </BlurView>

        {/* Grid of Features */}
        <Text style={styles.sectionTitle}>Explore Features</Text>
        <View style={styles.grid}>
          {features.map((item) => (
            <TouchableOpacity key={item.id} style={styles.gridItem}>
              <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
                <Ionicons name={item.icon as any} size={28} color={item.color} />
              </View>
              <Text style={styles.gridText}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Placeholder Feed Section */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.emptyStateContainer}>
          <Ionicons name="planet-outline" size={64} color="#334155" />
          <Text style={styles.emptyStateText}>Establishing connection...</Text>
          <Text style={styles.emptyStateSubtext}>Your personalized feed is coming soon!</Text>
        </View>
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
  notificationBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#1E293B',
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
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#1E293B30',
    borderRadius: 24,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#334155',
  },
  emptyStateText: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateSubtext: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 8,
  },
});
