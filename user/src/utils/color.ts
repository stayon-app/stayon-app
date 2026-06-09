// Color helpers. `withOpacity` takes any theme color (hex or rgb/rgba) and
// returns an rgba() string at the given opacity — theme-aware by construction,
// since the input is a token from useTheme().colors. Prefer this over string
// concat like `colors.primary + '15'` when the opacity needs to be explicit.

export function withOpacity(color: string, opacity: number): string {
  const a = Math.max(0, Math.min(1, opacity));

  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    if (hex.length === 8) hex = hex.slice(0, 6); // drop existing alpha
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    return color;
  }

  const match = color.match(/rgba?\(([^)]+)\)/);
  if (match) {
    const [r, g, b] = match[1].split(',').map((s) => s.trim());
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  return color;
}
