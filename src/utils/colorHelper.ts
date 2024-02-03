export const colorShade = (col: string, amt: number): string => {
  col = col.replace(/^#/, '');
  if (col.length === 3) col = col[0] + col[0] + col[1] + col[1] + col[2] + col[2];

  let [red, green, blue] = col.match(/.{2}/g) ?? ['0', '0', '0'];
  const [r, g, b] = [parseInt(red, 16) + amt, parseInt(green, 16) + amt, parseInt(blue, 16) + amt];

  red = Math.max(Math.min(255, r), 0).toString(16);
  green = Math.max(Math.min(255, g), 0).toString(16);
  blue = Math.max(Math.min(255, b), 0).toString(16);

  const rr = (red.length < 2 ? '0' : '') + red;
  const gg = (green.length < 2 ? '0' : '') + green;
  const bb = (blue.length < 2 ? '0' : '') + blue;

  return `#${rr}${gg}${bb}`;
};

export const lightenColor = (hex: string, percent: number): string => {
  // Ensure the percent is within the range [0, 100]
  const quota = Math.min(100, Math.max(0, percent)) / 100;

  // Convert hex to RGB
  let r: number = parseInt(hex.substring(1, 3), 16);
  let g: number = parseInt(hex.substring(3, 5), 16);
  let b: number = parseInt(hex.substring(5, 7), 16);

  // Lighten the color
  r = Math.round(r + (255 - r) * quota);
  g = Math.round(g + (255 - g) * quota);
  b = Math.round(b + (255 - b) * quota);

  // Convert back to hex
  const resultHex = `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;

  return resultHex;
};

export const getTextColorBasedOnBackground = (backgroundColor: string): string => {
  // Convert hex to RGB
  const r: number = parseInt(backgroundColor.substring(1, 3), 16);
  const g: number = parseInt(backgroundColor.substring(3, 5), 16);
  const b: number = parseInt(backgroundColor.substring(5, 7), 16);

  // Calculate perceived brightness using the W3C formula
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  // Determine whether to use light or dark text color based on brightness
  return brightness > 128 ? 'inherit' : '#FFFFFF';
};
