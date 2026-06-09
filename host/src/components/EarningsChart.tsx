import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';
import { fonts, fontSizes, spacing } from '../constants';
import { withOpacity } from '../utils/color';

interface Bar { label: string; value: number; }
interface Props { data: Bar[]; height?: number; barColor?: string; }

/** Lightweight token-coloured bar chart (react-native-svg). Animates none for
 *  simplicity; bars scale to the max value, with a baseline + value labels. */
export const EarningsChart: React.FC<Props> = ({ data, height = 160, barColor }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 300;
  const padBottom = 22;
  const chartH = height - padBottom;
  const n = data.length || 1;
  const slot = W / n;
  const barW = Math.min(28, slot * 0.5);
  const color = barColor || colors.primary;

  return (
    <View style={styles.wrap}>
      <Svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none">
        {/* baseline */}
        <Line x1={0} y1={chartH} x2={W} y2={chartH} stroke={colors.borderLight} strokeWidth={1} />
        {data.map((d, i) => {
          const h = (d.value / max) * (chartH - 6);
          const x = i * slot + (slot - barW) / 2;
          const y = chartH - h;
          return (
            <React.Fragment key={i}>
              <Rect x={x} y={0} width={barW} height={chartH} rx={5} fill={withOpacity(color, 0.08)} />
              <Rect x={x} y={y} width={barW} height={Math.max(2, h)} rx={5} fill={color} />
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={styles.labels}>
        {data.map((d, i) => (
          <Text key={i} style={styles.label} numberOfLines={1}>{d.label}</Text>
        ))}
      </View>
    </View>
  );
};

const makeStyles = (colors: any) =>
  StyleSheet.create({
    wrap: { width: '100%' },
    labels: { flexDirection: 'row', marginTop: -16 },
    label: { flex: 1, textAlign: 'center', fontSize: fontSizes.xs, color: colors.textTertiary, ...fonts.medium },
  });
