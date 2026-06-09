import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProgressiveImage } from '../components/common/ProgressiveImage';
import {
  PropertyCardSkeleton,
  ListItemSkeleton,
  TextSkeleton,
  ImageSkeleton,
  ExploreSectionSkeleton,
  GridSkeleton,
} from '../components/common/SkeletonLoader';
import { useToast } from '../components/common/Toast';
import { BottomSheet, ScrollableBottomSheet } from '../components/common/BottomSheet';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { fontSizes, fonts } from '../constants';
import * as animUtils from '../utils/animations';

/**
 * Demo Screen for Testing Phase 1 Utilities
 * 
 * Tests all new components:
 * - ProgressiveImage
 * - Skeleton Loaders
 * - Toast Notifications
 * - Bottom Sheets
 * - Animation Utilities
 */
export const UtilsDemoScreen: React.FC = () => {
  const toast = useToast();
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showScrollableSheet, setShowScrollableSheet] = useState(false);
  const [showSkeletons, setShowSkeletons] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));

  // Demo images
  const demoImages = [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
  ];

  const handleShowToast = (type: 'success' | 'error' | 'info' | 'warning') => {
    const messages = {
      success: 'Successfully completed the action!',
      error: 'An error occurred. Please try again.',
      info: 'Here is some information for you.',
      warning: 'Please be careful with this action.',
    };

    const titles = {
      success: 'Success',
      error: 'Error',
      info: 'Info',
      warning: 'Warning',
    };

    toast.show({
      type,
      title: titles[type],
      message: messages[type],
      duration: 3000,
      actionText: 'Undo',
      onActionPress: () => console.log('Action pressed'),
    });
  };

  const handleAnimationDemo = () => {
    const { pressIn, pressOut } = animUtils.pressScale(scaleAnim);
    pressIn.start(() => {
      setTimeout(() => {
        pressOut.start();
      }, 100);
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Phase 1 Utilities Demo</Text>
          <Text style={styles.subtitle}>Testing all new components and utilities</Text>
        </View>

        {/* Toast Container */}
        <toast.ToastContainer />

        {/* Progressive Image Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progressive Image</Text>
          <Text style={styles.sectionDescription}>
            Images with blur placeholder, smooth loading, and error handling
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
            {demoImages.map((uri, index) => (
              <View key={index} style={styles.imageContainer}>
                <ProgressiveImage
                  source={{ uri }}
                  style={styles.demoImage}
                  blurRadius={10}
                  fadeDuration={300}
                />
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Skeleton Loaders Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Skeleton Loaders</Text>
              <Text style={styles.sectionDescription}>
                Animated placeholders while content loads
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowSkeletons(!showSkeletons)}
              style={styles.toggleButton}
            >
              <Text style={styles.toggleText}>
                {showSkeletons ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          </View>

          {showSkeletons && (
            <View style={styles.skeletonDemo}>
              <Text style={styles.demoLabel}>Property Card Skeleton:</Text>
              <PropertyCardSkeleton />

              <Text style={[styles.demoLabel, { marginTop: spacing.lg }]}>List Item Skeleton:</Text>
              <ListItemSkeleton />
              <ListItemSkeleton />

              <Text style={[styles.demoLabel, { marginTop: spacing.lg }]}>Text Skeleton:</Text>
              <TextSkeleton lines={4} />

              <Text style={[styles.demoLabel, { marginTop: spacing.lg }]}>Image Skeleton:</Text>
              <ImageSkeleton height={150} />

              <Text style={[styles.demoLabel, { marginTop: spacing.lg }]}>Grid Skeleton:</Text>
              <GridSkeleton columns={2} rows={2} itemHeight={100} />
            </View>
          )}
        </View>

        {/* Toast Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Toast Notifications</Text>
          <Text style={styles.sectionDescription}>
            Dismissible notifications with actions and auto-dismiss
          </Text>
          <View style={styles.buttonGrid}>
            <TouchableOpacity
              style={[styles.demoButton, styles.successButton]}
              onPress={() => handleShowToast('success')}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.buttonText}>Success</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.demoButton, styles.errorButton]}
              onPress={() => handleShowToast('error')}
            >
              <Ionicons name="close-circle" size={20} color="#fff" />
              <Text style={styles.buttonText}>Error</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.demoButton, styles.infoButton]}
              onPress={() => handleShowToast('info')}
            >
              <Ionicons name="information-circle" size={20} color="#fff" />
              <Text style={styles.buttonText}>Info</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.demoButton, styles.warningButton]}
              onPress={() => handleShowToast('warning')}
            >
              <Ionicons name="warning" size={20} color="#fff" />
              <Text style={styles.buttonText}>Warning</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Sheet Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bottom Sheets</Text>
          <Text style={styles.sectionDescription}>
            Modal sheets with drag gestures and snap points
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.demoButton, styles.primaryButton]}
              onPress={() => setShowBottomSheet(true)}
            >
              <Text style={styles.buttonText}>Basic Sheet</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.demoButton, styles.primaryButton]}
              onPress={() => setShowScrollableSheet(true)}
            >
              <Text style={styles.buttonText}>Scrollable Sheet</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Animation Utilities Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Animation Utilities</Text>
          <Text style={styles.sectionDescription}>
            Reusable animation functions and presets
          </Text>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={[styles.demoButton, styles.animButton]}
              onPress={handleAnimationDemo}
              activeOpacity={0.9}
            >
              <Ionicons name="play-circle" size={20} color="#fff" />
              <Text style={styles.buttonText}>Press Animation Demo</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Summary Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phase 1 Complete</Text>
          <Text style={styles.summaryText}>
            All foundation utilities are ready for Phase 2 integration:
          </Text>
          <View style={styles.checklist}>
            <CheckItem text="ProgressiveImage component" />
            <CheckItem text="Skeleton loader components" />
            <CheckItem text="Toast notification system" />
            <CheckItem text="Bottom sheet component" />
            <CheckItem text="Animation utility functions" />
          </View>
        </View>

        <View style={{ height: spacing.xl * 2 }} />
      </ScrollView>

      {/* Bottom Sheets */}
      <BottomSheet
        visible={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        initialSnapPoint="half"
        snapPoints={['half', 'full']}
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Basic Bottom Sheet</Text>
          <Text style={styles.sheetText}>
            This is a basic bottom sheet with drag handle. You can:
          </Text>
          <View style={styles.sheetList}>
            <Text style={styles.sheetListItem}>• Drag the handle to dismiss</Text>
            <Text style={styles.sheetListItem}>• Tap outside to dismiss</Text>
            <Text style={styles.sheetListItem}>• Drag up/down to snap between heights</Text>
          </View>
          <TouchableOpacity
            style={[styles.demoButton, styles.primaryButton, { width: '100%' }]}
            onPress={() => setShowBottomSheet(false)}
          >
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      <ScrollableBottomSheet
        visible={showScrollableSheet}
        onClose={() => setShowScrollableSheet(false)}
        initialSnapPoint="full"
      >
        <View>
          <Text style={styles.sheetTitle}>Scrollable Bottom Sheet</Text>
          <Text style={styles.sheetText}>
            This sheet has scrollable content. Perfect for long lists or detailed information.
          </Text>
          {Array.from({ length: 20 }).map((_, i) => (
            <View key={i} style={styles.scrollItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              <Text style={styles.scrollItemText}>Item {i + 1}</Text>
            </View>
          ))}
        </View>
      </ScrollableBottomSheet>
    </SafeAreaView>
  );
};

const CheckItem: React.FC<{ text: string }> = ({ text }) => (
  <View style={styles.checkItem}>
    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
    <Text style={styles.checkText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: spacing.xl,
    paddingTop: spacing.lg,
  },
  title: {
    fontSize: fontSizes['2xl'],
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  section: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  imageRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  imageContainer: {
    marginRight: spacing.md,
  },
  demoImage: {
    width: 150,
    height: 200,
    borderRadius: spacing.md,
  },
  skeletonDemo: {
    marginTop: spacing.md,
  },
  demoLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.sm,
    gap: spacing.xs,
    flex: 1,
  },
  successButton: {
    backgroundColor: colors.success,
  },
  errorButton: {
    backgroundColor: colors.error,
  },
  infoButton: {
    backgroundColor: colors.primary,
  },
  warningButton: {
    backgroundColor: colors.warning,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  animButton: {
    backgroundColor: colors.secondary,
  },
  buttonText: {
    color: '#fff',
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  toggleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: spacing.sm,
  },
  toggleText: {
    color: '#fff',
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  summaryText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  checklist: {
    gap: spacing.sm,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkText: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  sheetContent: {
    padding: spacing.lg,
  },
  sheetTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  sheetText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  sheetList: {
    marginVertical: spacing.md,
    paddingLeft: spacing.sm,
  },
  sheetListItem: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  scrollItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scrollItemText: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
});

export default UtilsDemoScreen;
