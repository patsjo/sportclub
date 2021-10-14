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
