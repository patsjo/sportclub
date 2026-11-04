import { CupThemeType } from '../../models/cupModel';

/**
 * Every cup theme is a graphic novel / sports poster: heavy ink, halftone shading,
 * bold condensed type, dramatic light. Each theme has its own palette and scene.
 */
export interface ICupThemePalette {
  /** Dark page (night) or light page */
  dark: boolean;
  /** Page background, top and bottom of the gradient */
  background: string;
  backgroundEnd: string;
  /** Halftone dots on the background */
  dots: string;
  /** Panels (cards) */
  panel: string;
  panelText: string;
  /** Muted text on panels */
  panelMuted: string;
  /** Lines inside panels, e.g. table rows */
  line: string;
  /** The outlines, the "ink" */
  ink: string;
  /** The sky of the hero scene, top, middle and horizon */
  sky: [string, string, string];
  /** Hills / forest layers in the scene, far to near */
  ridges: [string, string, string];
  /** Text on the hero */
  heroText: string;
  /** Default accents, overridden by the colors of the cup */
  accent: string;
  accent2: string;
  /** Text on the accent colors */
  accentText: string;
  accent2Text: string;
  /** Glow and light effects (headlamp, sun, aurora) */
  glow: string;
  /** Table row stripes */
  rowAlt: string;
  medalGold: string;
  medalSilver: string;
  medalBronze: string;
}

export const cupThemePalettes: Record<CupThemeType, ICupThemePalette> = {
  NIGHT: {
    dark: true,
    background: '#07090f',
    backgroundEnd: '#0d1224',
    dots: 'rgba(90, 110, 200, 0.10)',
    panel: '#10162a',
    panelText: '#eef1ff',
    panelMuted: '#8d96bf',
    line: 'rgba(255, 255, 255, 0.08)',
    ink: '#000000',
    sky: ['#020308', '#0a1030', '#1b2559'],
    ridges: ['#0c1430', '#070b1d', '#030510'],
    heroText: '#ffffff',
    accent: '#ff6a00',
    accent2: '#3df2ff',
    accentText: '#000000',
    accent2Text: '#000000',
    glow: '#fff3b0',
    rowAlt: 'rgba(255, 255, 255, 0.035)',
    medalGold: '#ffc94d',
    medalSilver: '#c9d1e6',
    medalBronze: '#d98a4e'
  },
  YOUTH: {
    dark: false,
    background: '#fff9ec',
    backgroundEnd: '#ffeef6',
    dots: 'rgba(255, 0, 128, 0.10)',
    panel: '#ffffff',
    panelText: '#141414',
    panelMuted: '#6b6b6b',
    line: 'rgba(0, 0, 0, 0.08)',
    ink: '#111111',
    sky: ['#2fb8ff', '#8fd9ff', '#ffd9ec'],
    ridges: ['#7fd6c2', '#25a36b', '#11684a'],
    heroText: '#ffffff',
    accent: '#ff2d87',
    accent2: '#ffcf33',
    accentText: '#ffffff',
    accent2Text: '#111111',
    glow: '#fff3a0',
    rowAlt: 'rgba(122, 45, 255, 0.05)',
    medalGold: '#ffd21f',
    medalSilver: '#d6dbe3',
    medalBronze: '#ff9a52'
  },
  WINTER: {
    dark: false,
    background: '#eef5fb',
    backgroundEnd: '#dde9f5',
    dots: 'rgba(30, 80, 140, 0.10)',
    panel: '#ffffff',
    panelText: '#0b1d33',
    panelMuted: '#5b7089',
    line: 'rgba(11, 29, 51, 0.08)',
    ink: '#0b1d33',
    sky: ['#06122b', '#11365e', '#3f86b8'],
    ridges: ['#7fa8c9', '#c9dcec', '#f4f8fc'],
    heroText: '#ffffff',
    accent: '#e3173e',
    accent2: '#6ff7c9',
    accentText: '#ffffff',
    accent2Text: '#0b1d33',
    glow: '#6ff7c9',
    rowAlt: 'rgba(63, 134, 184, 0.06)',
    medalGold: '#f2c94c',
    medalSilver: '#cfd9e3',
    medalBronze: '#cf8b5a'
  },
  SUMMER: {
    dark: false,
    background: '#fff7ea',
    backgroundEnd: '#ffe9d1',
    dots: 'rgba(255, 90, 0, 0.10)',
    panel: '#ffffff',
    panelText: '#1d140c',
    panelMuted: '#75614f',
    line: 'rgba(29, 20, 12, 0.08)',
    ink: '#1d140c',
    sky: ['#2a1250', '#d9406e', '#ffb03a'],
    ridges: ['#8a2f5c', '#4a1a3d', '#1d0f1c'],
    heroText: '#ffffff',
    accent: '#ff5a1f',
    accent2: '#ffd23a',
    accentText: '#ffffff',
    accent2Text: '#1d140c',
    glow: '#ffe28a',
    rowAlt: 'rgba(255, 90, 31, 0.05)',
    medalGold: '#ffc73a',
    medalSilver: '#d8d8d8',
    medalBronze: '#e08a4a'
  },
  SPRING: {
    dark: false,
    background: '#f4fbef',
    backgroundEnd: '#e8f6ea',
    dots: 'rgba(40, 140, 60, 0.10)',
    panel: '#ffffff',
    panelText: '#0f2414',
    panelMuted: '#587060',
    line: 'rgba(15, 36, 20, 0.08)',
    ink: '#0f2414',
    sky: ['#9fe3d0', '#dff7c8', '#fff0c9'],
    ridges: ['#8cc79a', '#3f8f5a', '#14402a'],
    heroText: '#ffffff',
    accent: '#ff4d6d',
    accent2: '#c6f432',
    accentText: '#ffffff',
    accent2Text: '#0f2414',
    glow: '#fff6c2',
    rowAlt: 'rgba(63, 143, 90, 0.06)',
    medalGold: '#f4c430',
    medalSilver: '#d3dbd5',
    medalBronze: '#d18b57'
  },
  HALLOWEEN: {
    dark: true,
    background: '#110904',
    backgroundEnd: '#1c0f06',
    dots: 'rgba(255, 140, 0, 0.09)',
    panel: '#1d120a',
    panelText: '#fff3e0',
    panelMuted: '#c9a27a',
    line: 'rgba(255, 200, 150, 0.08)',
    ink: '#000000',
    sky: ['#2a1405', '#c96a12', '#f4b847'],
    ridges: ['#5a2c0a', '#2a1406', '#0d0603'],
    heroText: '#fff4d6',
    accent: '#ff7a00',
    accent2: '#b46bff',
    accentText: '#000000',
    accent2Text: '#ffffff',
    glow: '#ffd27a',
    rowAlt: 'rgba(255, 160, 60, 0.05)',
    medalGold: '#ffc94d',
    medalSilver: '#d9cfc5',
    medalBronze: '#d98a4e'
  },
  AUTUMN: {
    dark: true,
    background: '#140b08',
    backgroundEnd: '#1f110a',
    dots: 'rgba(230, 110, 30, 0.09)',
    panel: '#1e130d',
    panelText: '#fbefe1',
    panelMuted: '#b8957a',
    line: 'rgba(255, 220, 190, 0.08)',
    ink: '#000000',
    sky: ['#2b0d08', '#8c2a12', '#f08a24'],
    ridges: ['#5c1d0d', '#2e0f07', '#120604'],
    heroText: '#fff4e3',
    accent: '#ff7a1a',
    accent2: '#ffd166',
    accentText: '#140b08',
    accent2Text: '#140b08',
    glow: '#ffc46b',
    rowAlt: 'rgba(255, 180, 120, 0.04)',
    medalGold: '#ffc857',
    medalSilver: '#d9cfc5',
    medalBronze: '#c97a45'
  }
};

export interface ICupTheme extends ICupThemePalette {
  type: CupThemeType;
}

/** The palette of a theme with the colors of the cup (or the club) as accents */
export const getCupTheme = (
  type: CupThemeType | null | undefined,
  primaryColor?: string | null,
  secondaryColor?: string | null
): ICupTheme => {
  const themeType: CupThemeType = type && cupThemePalettes[type] ? type : 'SUMMER';
  const palette = cupThemePalettes[themeType];
  return {
    ...palette,
    type: themeType,
    accent: primaryColor || palette.accent,
    accentText: primaryColor ? readableTextColor(primaryColor) : palette.accentText,
    accent2: secondaryColor || palette.accent2,
    accent2Text: secondaryColor ? readableTextColor(secondaryColor) : palette.accent2Text
  };
};

/** Black or white text, whichever is readable on the color */
export const readableTextColor = (color: string): string => {
  const hex = color.replace('#', '').trim();
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map(c => c + c)
          .join('')
      : hex.substring(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return '#000000';
  const [r, g, b] = [0, 2, 4].map(i => parseInt(full.substring(i, i + 2), 16) / 255);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.55 ? '#000000' : '#ffffff';
};

/** Condensed poster type for headlines and numbers */
export const cupHeadingFont = "'Anton', 'Oswald', 'Impact', 'Arial Narrow Bold', sans-serif";
/** Sporty condensed type for labels, buttons and tables */
export const cupLabelFont = "'Barlow Condensed', 'Arial Narrow', 'Roboto Condensed', sans-serif";
/** Body text */
export const cupBodyFont = "'Barlow', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
/** Hand lettered comic sound effects (NEXT!, GO!) */
export const cupSfxFont = "'Permanent Marker', 'Marker Felt', 'Comic Sans MS', cursive";
export const cupFontsUrl =
  'https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;1,800&family=Barlow:wght@400;500;600;700&family=Permanent+Marker&display=swap';
