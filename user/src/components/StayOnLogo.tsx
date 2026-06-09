import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { fonts } from '../constants';
import { useTheme } from '../contexts/ThemeContext';

interface StayOnLogoProps {
  size?: number;
  showText?: boolean;
  variant?: 'default' | 'horizontal' | 'icon-only';
}

export const StayOnLogo: React.FC<StayOnLogoProps> = ({ 
  size = 32, 
  showText = true,
  variant = 'horizontal'
}) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const iconSize = size;
  const fontSize = size * 0.65;

  // Icon-only variant (just the logo mark)
  if (variant === 'icon-only') {
    return (
      <Svg width={iconSize} height={iconSize} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#14B8A6" stopOpacity="1" />
            <Stop offset="100%" stopColor="#0D9488" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        
        {/* House shape with door */}
        <G>
          {/* Roof */}
          <Path
            d="M50 15 L85 45 L80 45 L80 85 L20 85 L20 45 L15 45 Z"
            fill="url(#grad1)"
          />
          
          {/* Door with location pin inside */}
          <Path
            d="M40 85 L40 60 C40 55 42 52 47 52 L53 52 C58 52 60 55 60 60 L60 85 Z"
            fill="#FFFFFF"
          />
          
          {/* Location pin inside door */}
          <Path
            d="M50 58 C47 58 45 60 45 63 C45 66 50 72 50 72 C50 72 55 66 55 63 C55 60 53 58 50 58 Z"
            fill={colors.primary}
          />
          <Circle cx="50" cy="63" r="2" fill="#FFFFFF" />
          
          {/* Window left */}
          <Path
            d="M30 55 L30 45 L40 45 L40 55 Z"
            fill="#FFFFFF"
            opacity="0.9"
          />
          
          {/* Window right */}
          <Path
            d="M60 55 L60 45 L70 45 L70 55 Z"
            fill="#FFFFFF"
            opacity="0.9"
          />
        </G>
      </Svg>
    );
  }

  // Horizontal variant (icon + text side by side)
  if (variant === 'horizontal') {
    return (
      <View style={styles.horizontalContainer}>
        <Svg width={iconSize} height={iconSize} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#14B8A6" stopOpacity="1" />
              <Stop offset="100%" stopColor="#0D9488" stopOpacity="1" />
            </LinearGradient>
          </Defs>
          
          <G>
            <Path
              d="M50 15 L85 45 L80 45 L80 85 L20 85 L20 45 L15 45 Z"
              fill="url(#grad2)"
            />
            <Path
              d="M40 85 L40 60 C40 55 42 52 47 52 L53 52 C58 52 60 55 60 60 L60 85 Z"
              fill="#FFFFFF"
            />
            <Path
              d="M50 58 C47 58 45 60 45 63 C45 66 50 72 50 72 C50 72 55 66 55 63 C55 60 53 58 50 58 Z"
              fill={colors.primary}
            />
            <Circle cx="50" cy="63" r="2" fill="#FFFFFF" />
            <Path
              d="M30 55 L30 45 L40 45 L40 55 Z"
              fill="#FFFFFF"
              opacity="0.9"
            />
            <Path
              d="M60 55 L60 45 L70 45 L70 55 Z"
              fill="#FFFFFF"
              opacity="0.9"
            />
          </G>
        </Svg>
        
        {showText && (
          <View style={styles.textContainer}>
            <Text style={[styles.brandText, { fontSize }]}>
              Stay<Text style={styles.brandTextAccent}>On</Text>
            </Text>
          </View>
        )}
      </View>
    );
  }

  // Default variant (icon above text)
  return (
    <View style={styles.defaultContainer}>
      <Svg width={iconSize} height={iconSize} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#14B8A6" stopOpacity="1" />
            <Stop offset="100%" stopColor="#0D9488" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        
        <G>
          <Path
            d="M50 15 L85 45 L80 45 L80 85 L20 85 L20 45 L15 45 Z"
            fill="url(#grad3)"
          />
          <Path
            d="M40 85 L40 60 C40 55 42 52 47 52 L53 52 C58 52 60 55 60 60 L60 85 Z"
            fill="#FFFFFF"
          />
          <Path
            d="M50 58 C47 58 45 60 45 63 C45 66 50 72 50 72 C50 72 55 66 55 63 C55 60 53 58 50 58 Z"
            fill={colors.primary}
          />
          <Circle cx="50" cy="63" r="2" fill="#FFFFFF" />
          <Path
            d="M30 55 L30 45 L40 45 L40 55 Z"
            fill="#FFFFFF"
            opacity="0.9"
          />
          <Path
            d="M60 55 L60 45 L70 45 L70 55 Z"
            fill="#FFFFFF"
            opacity="0.9"
          />
        </G>
      </Svg>
      
      {showText && (
        <Text style={[styles.brandText, { fontSize: fontSize * 0.8, marginTop: 4 }]}>
          Stay<Text style={styles.brandTextAccent}>On</Text>
        </Text>
      )}
    </View>
  );
};

function makeStyles(colors: any) {
  return StyleSheet.create({
  horizontalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  defaultContainer: {
    alignItems: 'center',
  },
  textContainer: {
    justifyContent: 'center',
  },
  brandText: {
    ...fonts.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  brandTextAccent: {
    color: colors.primary,
  },
  });
}
