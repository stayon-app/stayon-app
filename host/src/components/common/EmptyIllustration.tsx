import React from 'react';
import Svg, { Path, Rect, Circle, Ellipse, Line, G } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';
import { withOpacity } from '../../utils/color';

export type EmptyKind = 'reservations' | 'listings' | 'messages' | 'calendar' | 'notifications' | 'reviews' | 'maintenance' | 'damages' | 'search' | 'generic';

const INDIGO = '#6366F1';

/**
 * Clean, original spot illustrations for empty states — geometric, on-brand
 * (StayOn teal + indigo), drawn with react-native-svg. No third-party art.
 */
export const EmptyIllustration: React.FC<{ kind: EmptyKind; size?: number }> = ({ kind, size = 150 }) => {
  const { colors } = useTheme();
  const teal = colors.primary;
  const page = colors.card;
  const line = colors.border;
  const soft = withOpacity(teal, 0.10);
  const softer = withOpacity(teal, 0.16);
  const shadow = withOpacity('#000000', 0.05);
  const sw = 2.5;

  return (
    <Svg width={size} height={size * 0.93} viewBox="0 0 150 140">
      {/* soft backdrop + ground shadow (shared) */}
      <Circle cx={75} cy={68} r={58} fill={soft} />
      <Ellipse cx={75} cy={120} rx={38} ry={6} fill={shadow} />

      {kind === 'reservations' && (
        <G>
          {/* open book with a bookmark ribbon */}
          <Path d="M75 52 C 60 45, 49 47, 44 51 L44 98 C49 94, 60 92, 75 99 Z" fill={page} stroke={line} strokeWidth={sw} strokeLinejoin="round" />
          <Path d="M75 52 C 90 45, 101 47, 106 51 L106 98 C101 94, 90 92, 75 99 Z" fill={page} stroke={line} strokeWidth={sw} strokeLinejoin="round" />
          <Line x1={53} y1={62} x2={68} y2={60} stroke={line} strokeWidth={2} strokeLinecap="round" />
          <Line x1={53} y1={70} x2={68} y2={68} stroke={line} strokeWidth={2} strokeLinecap="round" />
          <Line x1={82} y1={60} x2={97} y2={62} stroke={line} strokeWidth={2} strokeLinecap="round" />
          <Line x1={82} y1={68} x2={97} y2={70} stroke={line} strokeWidth={2} strokeLinecap="round" />
          <Path d="M70 90 h10 v18 l-5 -5 -5 5 z" fill={teal} />
        </G>
      )}

      {kind === 'listings' && (
        <G>
          <Rect x={48} y={68} width={54} height={40} rx={5} fill={page} stroke={line} strokeWidth={sw} />
          <Path d="M41 70 L75 43 L109 70 Z" fill={teal} strokeLinejoin="round" />
          <Rect x={67} y={88} width={15} height={20} rx={2} fill={softer} />
          <Rect x={54} y={76} width={12} height={12} rx={2} fill={INDIGO} />
        </G>
      )}

      {kind === 'messages' && (
        <G>
          <Rect x={44} y={48} width={46} height={34} rx={12} fill={softer} />
          <Rect x={56} y={58} width={56} height={38} rx={12} fill={page} stroke={line} strokeWidth={sw} />
          <Path d="M70 94 l0 12 l13 -12 z" fill={page} stroke={line} strokeWidth={sw} strokeLinejoin="round" />
          <Circle cx={74} cy={77} r={3} fill={teal} />
          <Circle cx={86} cy={77} r={3} fill={teal} />
          <Circle cx={98} cy={77} r={3} fill={teal} />
        </G>
      )}

      {kind === 'calendar' && (
        <G>
          <Rect x={44} y={54} width={62} height={52} rx={8} fill={page} stroke={line} strokeWidth={sw} />
          <Path d="M44 64 v-2 a8 8 0 0 1 8 -8 h46 a8 8 0 0 1 8 8 v2 z" fill={teal} />
          <Rect x={56} y={48} width={4} height={12} rx={2} fill={line} />
          <Rect x={90} y={48} width={4} height={12} rx={2} fill={line} />
          {[0, 1, 2].map((r) => [0, 1, 2].map((c) => (
            <Circle key={`${r}-${c}`} cx={58 + c * 17} cy={76 + r * 11} r={3}
              fill={r === 1 && c === 1 ? teal : withOpacity(line, 0.9)} />
          )))}
        </G>
      )}

      {kind === 'notifications' && (
        <G>
          <Path d="M75 50 a16 16 0 0 1 16 16 v8 l5 9 h-42 l5 -9 v-8 a16 16 0 0 1 16 -16 z" fill={page} stroke={line} strokeWidth={sw} strokeLinejoin="round" />
          <Circle cx={75} cy={49} r={3.5} fill={line} />
          <Path d="M69 92 a6 6 0 0 0 12 0 z" fill={line} />
          <Circle cx={94} cy={54} r={8} fill={INDIGO} />
        </G>
      )}

      {kind === 'reviews' && (
        <G>
          <Rect x={46} y={54} width={58} height={42} rx={10} fill={page} stroke={line} strokeWidth={sw} />
          <Path d="M64 96 l0 12 l12 -12 z" fill={page} stroke={line} strokeWidth={sw} strokeLinejoin="round" />
          <Path d="M75 62 l3.2 6.6 7.3 1 -5.3 5.1 1.3 7.2 -6.5 -3.4 -6.5 3.4 1.3 -7.2 -5.3 -5.1 7.3 -1 z" fill={teal} />
        </G>
      )}

      {kind === 'maintenance' && (
        <G>
          <Rect x={50} y={50} width={50} height={58} rx={8} fill={page} stroke={line} strokeWidth={sw} />
          <Rect x={63} y={44} width={24} height={11} rx={3.5} fill={teal} />
          <Line x1={60} y1={72} x2={84} y2={72} stroke={line} strokeWidth={2.5} strokeLinecap="round" />
          <Line x1={60} y1={82} x2={78} y2={82} stroke={line} strokeWidth={2.5} strokeLinecap="round" />
          <Circle cx={90} cy={98} r={12} fill={teal} />
          <Path d="M84 98 l4 4 l8 -8" stroke="#fff" strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </G>
      )}

      {kind === 'damages' && (
        <G>
          <Rect x={48} y={56} width={54} height={44} rx={6} fill={page} stroke={line} strokeWidth={sw} />
          <Path d="M58 92 l12 -16 8 10 6 -8 8 14 z" fill={softer} />
          <Circle cx={64} cy={68} r={4} fill={withOpacity(line, 0.9)} />
          <Path d="M86 50 l3 6 6 1 -4.5 4.3 1 6.2 -5.5 -3 -5.5 3 1 -6.2 -4.5 -4.3 6 -1 z" fill={INDIGO} />
        </G>
      )}

      {kind === 'search' && (
        <G>
          <Circle cx={68} cy={64} r={20} fill={page} stroke={teal} strokeWidth={4} />
          <Circle cx={68} cy={64} r={9} fill={softer} />
          <Line x1={84} y1={80} x2={98} y2={94} stroke={teal} strokeWidth={6} strokeLinecap="round" />
        </G>
      )}

      {(kind === 'generic') && (
        <G>
          <Rect x={48} y={54} width={54} height={50} rx={8} fill={page} stroke={line} strokeWidth={sw} />
          <Line x1={60} y1={70} x2={90} y2={70} stroke={line} strokeWidth={2.5} strokeLinecap="round" />
          <Line x1={60} y1={80} x2={84} y2={80} stroke={line} strokeWidth={2.5} strokeLinecap="round" />
          <Circle cx={90} cy={94} r={10} fill={teal} />
        </G>
      )}
    </Svg>
  );
};

export default EmptyIllustration;
