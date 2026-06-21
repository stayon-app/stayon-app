import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, useWindowDimensions, Image, Platform } from 'react-native';
import { fontSizes, fonts } from '../constants';

const isWeb = Platform.OS === 'web';

// Beautiful destination images for carousel - diverse and contrasting
const BACKGROUND_IMAGES = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&h=1600&fit=crop&q=80', // Luxury hotel
  'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1200&h=1600&fit=crop&q=80', // Beach sunset
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&h=1600&fit=crop&q=80', // Mountain cabin
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&h=1600&fit=crop&q=80', // Modern apartment
  'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1200&h=1600&fit=crop&q=80', // Tropical villa
  'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1200&h=1600&fit=crop&q=80', // Desert resort
];

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const { width } = useWindowDimensions();
  const styles = makeStyles(width);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [nextImageIndex, setNextImageIndex] = useState(1);
  // Rotating brand motif — matches the website ("StayOn travelling / experiencing …")
  const WORDS = ['beyond ordinary', 'travelling', 'experiencing', 'vibing', 'exploring'];
  const [wordIdx, setWordIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setWordIdx((i) => (i + 1) % WORDS.length), 1400);
    return () => clearInterval(t);
  }, []);
  
  // Classy entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  // Whole-screen fade-out for a smooth hand-off to the app (no hard jump)
  const screenFade = useRef(new Animated.Value(1)).current;
  
  // Background image carousel
  const bgOpacity1 = useRef(new Animated.Value(1)).current;
  const bgOpacity2 = useRef(new Animated.Value(0)).current;
  const bgScale = useRef(new Animated.Value(1)).current;
  
  // Elegant letter animations for Stay On
  const letterS = useRef(new Animated.Value(0)).current;
  const letterT = useRef(new Animated.Value(0)).current;
  const letterA = useRef(new Animated.Value(0)).current;
  const letterY = useRef(new Animated.Value(0)).current;
  const letterO = useRef(new Animated.Value(0)).current;
  const letterN = useRef(new Animated.Value(0)).current;
  
  // Tagline animation
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineSlide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // First crossfade at 1000ms so it plays within the 2.5s window
    const imageInterval = setInterval(() => {
      Animated.parallel([
        Animated.timing(bgOpacity1, {
          toValue: 0,
          duration: 800,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(bgOpacity2, {
          toValue: 1,
          duration: 800,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(() => {
        setCurrentImageIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
        setNextImageIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
        bgOpacity1.setValue(1);
        bgOpacity2.setValue(0);
      });
    }, 1000);

    // Elegant zoom effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgScale, {
          toValue: 1.08,
          duration: 8000,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(bgScale, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();

    // Classy staggered letter entrance with smooth motion
    Animated.sequence([
      Animated.delay(150),
      Animated.parallel([
        // Main fade and slide
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(slideUpAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    ]).start();

    // Elegant letter reveal with refined timing for "Stay On"
    Animated.sequence([
      Animated.delay(200),
      Animated.stagger(120, [
        Animated.spring(letterS, { 
          toValue: 1, 
          friction: 8, 
          tension: 50, 
          useNativeDriver: Platform.OS !== 'web' 
        }),
        Animated.spring(letterT, { 
          toValue: 1, 
          friction: 8, 
          tension: 50, 
          useNativeDriver: Platform.OS !== 'web' 
        }),
        Animated.spring(letterA, { 
          toValue: 1, 
          friction: 8, 
          tension: 50, 
          useNativeDriver: Platform.OS !== 'web' 
        }),
        Animated.spring(letterY, { 
          toValue: 1, 
          friction: 8, 
          tension: 50, 
          useNativeDriver: Platform.OS !== 'web' 
        }),
      ]),
      Animated.delay(200),
      Animated.stagger(120, [
        Animated.spring(letterO, { 
          toValue: 1, 
          friction: 7, 
          tension: 45, 
          useNativeDriver: Platform.OS !== 'web' 
        }),
        Animated.spring(letterN, { 
          toValue: 1, 
          friction: 7, 
          tension: 45, 
          useNativeDriver: Platform.OS !== 'web' 
        }),
      ]),
    ]).start();

    // Classy tagline entrance - delayed and smooth
    Animated.sequence([
      Animated.delay(700),
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(taglineSlide, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    ]).start();

    // After the splash has shown, gently fade the whole screen out, THEN hand
    // off — so the home screen appears via a soft crossfade, not a hard jump.
    const timer = setTimeout(() => {
      Animated.timing(screenFade, {
        toValue: 0,
        duration: 500,
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => onFinish());
    }, 2400);

    return () => {
      clearInterval(imageInterval);
      clearTimeout(timer);
    };
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenFade }]}>
      {/* Multiple Background Images Carousel */}
      <Animated.View
        style={[
          styles.backgroundContainer,
          {
            opacity: bgOpacity1,
            transform: [{ scale: bgScale }],
          },
        ]}
      >
        <Image
          source={{ uri: BACKGROUND_IMAGES[currentImageIndex] }}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
      </Animated.View>
      
      <Animated.View
        style={[
          styles.backgroundContainer,
          {
            opacity: bgOpacity2,
            transform: [{ scale: bgScale }],
          },
        ]}
      >
        <Image
          source={{ uri: BACKGROUND_IMAGES[nextImageIndex] }}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
      </Animated.View>

      {/* Simple Dark Overlay */}
      <View style={styles.gradientOverlay} />

      {/* Classy Centered Logo with Motion */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideUpAnim }],
          },
        ]}
      >
        {/* Logo with Elegant Cursive Font and Classy Animation */}
        <View style={styles.logoContainer}>
          <View style={styles.brandContainer}>
            <Animated.Text
              style={[
                styles.brandText,
                {
                  opacity: letterS,
                  transform: [
                    {
                      translateY: letterS.interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    },
                    {
                      scale: letterS.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              S
            </Animated.Text>
            <Animated.Text
              style={[
                styles.brandText,
                {
                  opacity: letterT,
                  transform: [
                    {
                      translateY: letterT.interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    },
                    {
                      scale: letterT.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              t
            </Animated.Text>
            <Animated.Text
              style={[
                styles.brandText,
                {
                  opacity: letterA,
                  transform: [
                    {
                      translateY: letterA.interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    },
                    {
                      scale: letterA.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              a
            </Animated.Text>
            <Animated.Text
              style={[
                styles.brandText,
                {
                  opacity: letterY,
                  transform: [
                    {
                      translateY: letterY.interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    },
                    {
                      scale: letterY.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              y
            </Animated.Text>
            <Text style={styles.brandTextSpace}> </Text>
            <Animated.Text
              style={[
                styles.brandText,
                styles.brandOn,
                {
                  opacity: letterO,
                  transform: [
                    {
                      translateY: letterO.interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    },
                    {
                      scale: letterO.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              O
            </Animated.Text>
            <Animated.Text
              style={[
                styles.brandText,
                styles.brandOn,
                {
                  opacity: letterN,
                  transform: [
                    {
                      translateY: letterN.interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    },
                    {
                      scale: letterN.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              n
            </Animated.Text>
          </View>
        </View>
        
        {/* Classy Tagline with Elegant Entrance */}
        <Animated.Text 
          style={[
            styles.tagline,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineSlide }],
            }
          ]}
        >
          {WORDS[wordIdx]}
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
};

function makeStyles(width: number) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D2B25',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
  },
  content: {
    alignItems: 'center',
    zIndex: 10,
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandText: {
    fontSize: isWeb ? 88 : width > 400 ? 74 : 64,
    ...fonts.bold,
    fontWeight: '800',
    fontStyle: 'normal',
    color: '#FFFFFF',
    letterSpacing: isWeb ? -3 : -2,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 14,
    ...(isWeb && {
      fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    }),
  },
  // Neon "On" — the StayOn wordmark accent.
  brandOn: {
    color: '#22D3EE',
    textShadowColor: 'rgba(34, 211, 238, 0.35)',
  },
  brandTextSpace: {
    fontSize: isWeb ? 70 : width > 400 ? 55 : 48,
    width: 5,
  },
  tagline: {
    fontSize: isWeb ? 16 : 14,
    ...fonts.semiBold,
    fontWeight: '700',
    fontStyle: 'normal',
    color: 'rgba(255, 255, 255, 0.92)',
    letterSpacing: isWeb ? 5 : 4,
    textAlign: 'center',
    opacity: 0.95,
    paddingHorizontal: 40,
    lineHeight: isWeb ? 28 : 24,
    ...(isWeb && {
      fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    }),
  },
  });
}
