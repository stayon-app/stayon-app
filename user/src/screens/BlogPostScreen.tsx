import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { STAYON_GRADIENT } from '../components/GradientButton';
import { fontSizes, fonts, spacing, borderRadius } from '../constants';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '../components/common';
import { useHaptics } from '../hooks/useHaptics';

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

interface BlogContent {
  type: 'paragraph' | 'heading' | 'image' | 'quote' | 'list';
  text?: string;
  imageUrl?: string;
  imageCaption?: string;
  items?: string[];
}

interface BlogPost {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  coverImage: string;
  author: {
    name: string;
    avatar: string;
    bio: string;
  };
  publishedDate: string;
  readingTime: string;
  content: BlogContent[];
  tags: string[];
}

// Mock blog post data
const mockBlogPost: BlogPost = {
  id: '1',
  title: '10 Hidden Gems in Southeast Asia',
  category: 'Travel Tips',
  excerpt: 'Discover breathtaking locations off the beaten path that most tourists never see.',
  coverImage: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800',
  author: {
    name: 'Sarah Chen',
    avatar: 'https://i.pravatar.cc/150?img=1',
    bio: 'Travel blogger and photographer with 10+ years exploring Asia',
  },
  publishedDate: '2 days ago',
  readingTime: '8 min read',
  content: [
    {
      type: 'paragraph',
      text: 'The California coast is known for its popular destinations like Los Angeles, San Francisco, and San Diego. But venture off the beaten path, and you\'ll discover hidden gems that offer authentic experiences, stunning landscapes, and fewer crowds.',
    },
    {
      type: 'heading',
      text: '1. Pai, Thailand - Mountain Paradise',
    },
    {
      type: 'paragraph',
      text: 'Nestled in the mountains of Northern Thailand, Pai offers a perfect blend of natural beauty and bohemian culture. The journey from Chiang Mai involves 762 curves through spectacular mountain scenery.',
    },
    {
      type: 'list',
      items: [
        'Best time to visit: November to February',
        'How to get there: 3-hour minivan from Chiang Mai',
        'Must-visit: Pai Canyon, Bamboo Bridge, Hot Springs',
        'Average cost: $15-30 per day',
      ],
    },
    {
      type: 'heading',
      text: '2. Kampot, Cambodia - Riverside Charm',
    },
    {
      type: 'paragraph',
      text: 'This sleepy riverside town is famous for its world-renowned pepper farms and laid-back atmosphere. Explore French colonial architecture, take boat trips through mangroves, and enjoy stunning sunsets over the Bokor Mountains.',
    },
    {
      type: 'quote',
      text: 'Kampot is where time slows down, and you remember what traveling is really about - connecting with places and people.',
    },
    {
      type: 'heading',
      text: '3. Siargao, Philippines - Surfer\'s Paradise',
    },
    {
      type: 'paragraph',
      text: 'While Siargao has gained popularity among surfers, it still maintains its island charm. Beyond Cloud 9 surf break, discover hidden lagoons, pristine beaches, and some of the friendliest locals in Southeast Asia.',
    },
    {
      type: 'list',
      items: [
        'Best for: Surfing, island hopping, relaxation',
        'Getting there: Fly to Siargao Airport from Manila or Cebu',
        'Don\'t miss: Magpupungko Rock Pools, Sugba Lagoon',
        'Budget: $25-40 per day',
      ],
    },
    {
      type: 'heading',
      text: 'Planning Your Adventure',
    },
    {
      type: 'paragraph',
      text: 'The best way to explore these hidden gems is to slow down and spend at least 3-4 days in each location. Rent a scooter, talk to locals, and don\'t be afraid to venture down unmarked roads. The best experiences often happen when you\'re not following a guidebook.',
    },
    {
      type: 'paragraph',
      text: 'Remember to travel responsibly - respect local customs, support local businesses, and leave no trace. These places remain special because they haven\'t been overrun by mass tourism. Let\'s keep them that way.',
    },
  ],
  tags: ['Southeast Asia', 'Hidden Gems', 'Travel Tips', 'Off the Beaten Path', 'Adventure Travel'],
};

export const BlogPostScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const styles = makeStyles(colors);

  const [isBookmarked, setIsBookmarked] = useState(false);

  // Brief on-mount skeleton so the hero/content eases in instead of popping.
  const [isLoading, setIsLoading] = useState(true);
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }).start();
    }
  }, [isLoading, contentOpacity]);

  // In real app, fetch blog post by ID from route.params
  const blogPost = mockBlogPost;

  const renderContent = (item: BlogContent, index: number) => {
    switch (item.type) {
      case 'paragraph':
        return (
          <Text key={index} style={styles.paragraph}>
            {item.text}
          </Text>
        );
      
      case 'heading':
        return (
          <Text key={index} style={styles.heading}>
            {item.text}
          </Text>
        );
      
      case 'image':
        return (
          <View key={index} style={styles.imageContainer}>
            <Image 
              source={{ uri: item.imageUrl }} 
              style={styles.contentImage}
              resizeMode="cover"
            />
            {item.imageCaption && (
              <Text style={styles.imageCaption}>{item.imageCaption}</Text>
            )}
          </View>
        );
      
      case 'quote':
        return (
          <View key={index} style={styles.quoteContainer}>
            <Ionicons name="chatbubble-outline" size={24} color={colors.primary} />
            <Text style={styles.quoteText}>{item.text}</Text>
          </View>
        );
      
      case 'list':
        return (
          <View key={index} style={styles.listContainer}>
            {item.items?.map((listItem, i) => (
              <View key={i} style={styles.listItem}>
                <View style={styles.bullet} />
                <Text style={styles.listText}>{listItem}</Text>
              </View>
            ))}
          </View>
        );
      
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <View style={styles.backButton} />
        </View>
        <Skeleton width="100%" height={300} borderRadius={0} />
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl }}>
          <Skeleton width={110} height={26} borderRadius={borderRadius.full} style={{ marginBottom: spacing.md }} />
          <Skeleton width="85%" height={30} style={{ marginBottom: spacing.md }} />
          <Skeleton width="100%" height={18} style={{ marginBottom: spacing.xs }} />
          <Skeleton width="70%" height={18} style={{ marginBottom: spacing.xl }} />
          <Skeleton width="100%" height={16} style={{ marginBottom: spacing.xs }} />
          <Skeleton width="95%" height={16} />
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: contentOpacity }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          style={styles.backButton}
          hitSlop={HIT_SLOP}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            hitSlop={HIT_SLOP}
            activeOpacity={0.7}
            onPress={() => {
              haptics.light();
              setIsBookmarked(!isBookmarked);
            }}
            accessibilityRole="button"
            accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark this article'}
          >
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={isBookmarked ? colors.primary : colors.textPrimary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            hitSlop={HIT_SLOP}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Share this article"
          >
            <Ionicons name="share-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Cover Image */}
        <Image 
          source={{ uri: blogPost.coverImage }} 
          style={styles.coverImage}
          resizeMode="cover"
        />

        {/* Article Header */}
        <View style={styles.articleHeader}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{blogPost.category}</Text>
          </View>
          
          <Text style={styles.title}>{blogPost.title}</Text>
          
          <Text style={styles.excerpt}>{blogPost.excerpt}</Text>
          
          {/* Author Info */}
          <View style={styles.authorSection}>
            <Image 
              source={{ uri: blogPost.author.avatar }} 
              style={styles.authorAvatar}
            />
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{blogPost.author.name}</Text>
              <Text style={styles.authorMeta}>
                {blogPost.publishedDate} · {blogPost.readingTime}
              </Text>
            </View>
          </View>
          
          <View style={styles.divider} />
        </View>

        {/* Article Content */}
        <View style={styles.articleBody}>
          {blogPost.content.map((item, index) => renderContent(item, index))}
        </View>

        {/* Tags */}
        <View style={styles.tagsSection}>
          <Text style={styles.tagsTitle}>Tags</Text>
          <View style={styles.tagsContainer}>
            {blogPost.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Author Bio */}
        <View style={styles.authorBio}>
          <Image 
            source={{ uri: blogPost.author.avatar }} 
            style={styles.authorBioAvatar}
          />
          <View style={styles.authorBioContent}>
            <Text style={styles.authorBioName}>{blogPost.author.name}</Text>
            <Text style={styles.authorBioText}>{blogPost.author.bio}</Text>
            <TouchableOpacity activeOpacity={0.9} style={styles.followButtonWrap} accessibilityRole="button" accessibilityLabel={`Follow ${blogPost.author.name}`}>
              <LinearGradient colors={STAYON_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.followButton}>
                <Text style={styles.followButtonText}>Follow</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* More Articles */}
        <View style={styles.moreSection}>
          <Text style={styles.moreSectionTitle}>More from {blogPost.author.name}</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[1, 2, 3].map((_, index) => (
              <TouchableOpacity key={index} style={styles.moreArticleCard} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Read article: Budget Travel Guide: Asia on $30 a Day">
                <Image 
                  source={{ uri: `https://images.unsplash.com/photo-153799619447${index}?w=400` }} 
                  style={styles.moreArticleImage}
                />
                <View style={styles.moreArticleContent}>
                  <Text style={styles.moreArticleCategory}>Travel Tips</Text>
                  <Text style={styles.moreArticleTitle} numberOfLines={2}>
                    Budget Travel Guide: Asia on $30 a Day
                  </Text>
                  <Text style={styles.moreArticleMeta}>5 min read</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </Animated.View>
  );
};

const makeStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  backButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing['4xl'],
  },
  coverImage: {
    width: '100%',
    height: 300,
  },
  articleHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  categoryBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
      android: { elevation: 3 },
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.18)' } as any,
    }),
  },
  categoryText: {
    fontSize: fontSizes.xs,
    ...fonts.semiBold,
    color: '#222222',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: fontSizes['3xl'],
    ...fonts.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: spacing.md,
    lineHeight: 36,
  },
  excerpt: {
    fontSize: fontSizes.lg,
    ...fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.md,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: fontSizes.md,
    ...fonts.semiBold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  authorMeta: {
    fontSize: fontSizes.sm,
    ...fonts.regular,
    color: colors.textTertiary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginBottom: spacing.xl,
  },
  articleBody: {
    paddingHorizontal: spacing.lg,
  },
  paragraph: {
    fontSize: fontSizes.base,
    ...fonts.regular,
    color: colors.textPrimary,
    lineHeight: 26,
    marginBottom: spacing.lg,
  },
  heading: {
    fontSize: fontSizes.xl,
    ...fonts.bold,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    lineHeight: 28,
  },
  imageContainer: {
    marginVertical: spacing.lg,
  },
  contentImage: {
    width: '100%',
    height: 250,
    borderRadius: borderRadius.lg,
  },
  imageCaption: {
    fontSize: fontSizes.sm,
    ...fonts.regular,
    color: colors.textTertiary,
    marginTop: spacing.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  quoteContainer: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderRadius: borderRadius.md,
    marginVertical: spacing.lg,
  },
  quoteText: {
    fontSize: fontSizes.lg,
    ...fonts.medium,
    color: colors.textPrimary,
    lineHeight: 28,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  listContainer: {
    marginVertical: spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginRight: spacing.md,
    marginTop: 8,
  },
  listText: {
    flex: 1,
    fontSize: fontSizes.base,
    ...fonts.regular,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  tagsSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  tagsTitle: {
    fontSize: fontSizes.md,
    ...fonts.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  tagText: {
    fontSize: fontSizes.sm,
    ...fonts.regular,
    color: colors.textSecondary,
  },
  authorBio: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    marginTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  authorBioAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: spacing.base,
  },
  authorBioContent: {
    flex: 1,
  },
  authorBioName: {
    fontSize: fontSizes.lg,
    ...fonts.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  authorBioText: {
    fontSize: fontSizes.sm,
    ...fonts.regular,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  followButtonWrap: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  followButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  followButtonText: {
    fontSize: fontSizes.sm,
    ...fonts.semiBold,
    color: '#FFFFFF',
  },
  moreSection: {
    paddingTop: spacing.xl,
    marginTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  moreSectionTitle: {
    fontSize: fontSizes.xl,
    ...fonts.bold,
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  moreArticleCard: {
    width: 280,
    marginLeft: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  moreArticleImage: {
    width: '100%',
    height: 160,
  },
  moreArticleContent: {
    padding: spacing.md,
  },
  moreArticleCategory: {
    fontSize: fontSizes.xs,
    ...fonts.semiBold,
    color: colors.primary,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  moreArticleTitle: {
    fontSize: fontSizes.base,
    ...fonts.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  moreArticleMeta: {
    fontSize: fontSizes.xs,
    ...fonts.regular,
    color: colors.textTertiary,
  },
});
