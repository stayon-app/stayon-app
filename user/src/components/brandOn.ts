import { Platform } from 'react-native';

// The "On" in the StayOn wordmark — a neon green→cyan→blue gradient, matching
// the website logo. On web we clip a real CSS gradient to the text; on native
// (no masked-view dependency) we fall back to the cyan mid-stop, which reads the
// same. Spread into a Text style: <Text style={[base, BRAND_ON]}>On</Text>
export const BRAND_ON_GRADIENT = 'linear-gradient(110deg, #00E6B0 0%, #00C8E6 50%, #2D9CFF 100%)';
export const BRAND_ON_FALLBACK = '#00C8E6';

export const BRAND_ON: any =
  Platform.OS === 'web'
    ? {
        backgroundImage: BRAND_ON_GRADIENT,
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        color: 'transparent',
        WebkitTextFillColor: 'transparent',
      }
    : { color: BRAND_ON_FALLBACK };
