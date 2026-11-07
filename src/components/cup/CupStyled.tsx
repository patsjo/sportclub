import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { CSSProperties, ReactNode, useEffect } from 'react';
import { styled } from 'styled-components';
import { useMobxStore } from '../../utils/mobxStore';
import { CupBannerScene } from './CupArt';
import {
  cupBodyFont,
  cupFontsUrl,
  cupHeadingFont,
  cupLabelFont,
  cupSfxFont,
  contrastRatio,
  ICupTheme
} from './cupThemes';

/*
 * The graphic novel look of the cup pages. The colors of the theme are set as CSS
 * variables by CupThemeScope, so a race with its own theme is just another scope.
 */

export const cupThemeVariables = (theme: ICupTheme): CSSProperties =>
  ({
    '--cup-bg': theme.background,
    '--cup-bg-end': theme.backgroundEnd,
    '--cup-dots': theme.dots,
    '--cup-page-text': theme.dark ? '#ffffff' : theme.ink,
    '--cup-panel': theme.panel,
    '--cup-panel-text': theme.panelText,
    '--cup-muted': theme.panelMuted,
    '--cup-line': theme.line,
    '--cup-ink': theme.ink,
    '--cup-hero-text': theme.heroText,
    '--cup-sky0': theme.sky[0],
    '--cup-sky1': theme.sky[1],
    '--cup-sky2': theme.sky[2],
    '--cup-accent': theme.accent,
    '--cup-accent-text': theme.accentText,
    '--cup-accent2': theme.accent2,
    '--cup-accent2-text': theme.accent2Text,
    // The edge of a button that would melt into the panel (e.g. a black button on the night panel)
    '--cup-accent-edge': contrastRatio(theme.accent, theme.panel) < 1.6 ? theme.highlight : theme.ink,
    '--cup-accent2-edge': contrastRatio(theme.accent2, theme.panel) < 1.6 ? theme.highlight : theme.ink,
    '--cup-row-alt': theme.rowAlt,
    '--cup-gold': theme.medalGold,
    '--cup-silver': theme.medalSilver,
    '--cup-bronze': theme.medalBronze,
    '--cup-highlight': theme.highlight,
    '--cup-highlight-text': theme.highlightText,
    '--cup-shadow': theme.dark ? theme.highlight : theme.ink,
    // How much the hero art is toned down behind the title, the colorful youth forest only a little
    '--cup-scrim': theme.dark ? 0.78 : theme.type === 'YOUTH' ? 0.32 : 0.55
  }) as CSSProperties;

const useCupFonts = () => {
  useEffect(() => {
    const id = 'cup-graphic-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = cupFontsUrl;
    document.head.appendChild(link);
  }, []);
};

/** Paper grain, keeps the flat colors from looking digital */
const noise =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.07 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const StyledScope = styled.div`
  background-color: var(--cup-bg);
  background-image:
    ${noise}, radial-gradient(var(--cup-dots) 1.3px, transparent 1.6px),
    linear-gradient(180deg, var(--cup-bg), var(--cup-bg-end));
  background-size:
    160px 160px,
    11px 11px,
    100% 100%;
  color: var(--cup-page-text);
  font-family: ${cupBodyFont};
  font-size: 15px;
  margin: -24px -12px 0 -12px;
  padding: 0 0 64px 0;
  min-height: calc(100vh - 80px);
  /* Shadows and stamps must not make the page scroll sideways on phones */
  overflow-x: clip;

  a {
    color: var(--cup-highlight);
    font-weight: 700;
  }
  .ant-tabs {
    color: var(--cup-panel-text);
  }
  .ant-tabs-nav::before {
    border-bottom-color: var(--cup-line) !important;
  }
  .ant-tabs-tab {
    font-family: ${cupLabelFont};
    font-weight: 800;
    font-size: 17px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--cup-muted);
  }
  .ant-tabs-tab:hover,
  .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
    color: var(--cup-highlight) !important;
  }
  .ant-tabs-ink-bar {
    background: var(--cup-highlight);
    height: 4px !important;
  }
  .ant-empty-description {
    color: var(--cup-muted);
  }
`;

interface ICupThemeScopeProps {
  theme: ICupTheme;
  children: ReactNode;
}
export const CupThemeScope = ({ theme, children }: ICupThemeScopeProps) => {
  useCupFonts();
  const { globalStateModel } = useMobxStore();
  // The background of the cup must reach the edge of the screen, also on very wide screens
  useEffect(() => {
    globalStateModel.setFullWidthPage(true);
    return () => globalStateModel.setFullWidthPage(false);
  }, [globalStateModel]);
  return <StyledScope style={cupThemeVariables(theme)}>{children}</StyledScope>;
};

/** The width of the content, all parts have the same width and grow on wide screens */
const cupContentWidth = '1760px';

export const CupContent = styled.div`
  position: relative;
  max-width: ${cupContentWidth};
  margin: 0 auto;
  padding: 0 20px;
`;

/* ------------------------------------------------------------------ hero */

/** The size of the banner scene, see CupBannerScene */
const sceneAspect = '1600 / 520';
/** Below this width the text is above the scene, the title would otherwise cover the motif */
const heroStackedWidth = '1000px';

const StyledHero = styled.header`
  position: relative;
  height: clamp(380px, 44vw, 540px);
  overflow: hidden;
  /* The same sky as the scene, where the scene does not reach on wide screens */
  background: linear-gradient(180deg, var(--cup-sky0) 0%, var(--cup-sky1) 55%, var(--cup-sky2) 100%);
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 56px), 0 100%);

  @media screen and (max-width: ${heroStackedWidth}) {
    height: auto;
  }
  @media screen and (max-width: 640px) {
    clip-path: polygon(0 0, 100% 0, 100% calc(100% - 28px), 0 100%);
  }
`;
/**
 * The scene is scaled by the height and kept to the right, so it is never blown up and cropped on wide
 * screens, and fades into the sky to the left. On a phone the motif is shown as a band below the text.
 */
const HeroArt = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  aspect-ratio: ${sceneAspect};
  mask-image: linear-gradient(90deg, transparent 0%, #000000 22%);

  @media screen and (max-width: ${heroStackedWidth}) {
    top: auto;
    bottom: 0;
    height: auto;
    /* The right part of the scene, x 370-1600 of 1600 */
    width: 130vw;
    mask-image: linear-gradient(180deg, transparent 0%, #000000 40%);
  }
  @media screen and (max-width: 640px) {
    /* The motif, x 800-1600 of 1600, fills the width */
    width: 200vw;
  }
`;
/** Keeps the title readable over the art */
const HeroScrim = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, var(--cup-sky0) 0%, transparent 62%);
  opacity: var(--cup-scrim, 0.78);

  @media screen and (max-width: ${heroStackedWidth}) {
    background: linear-gradient(180deg, var(--cup-sky0) 10%, transparent 75%);
  }
`;
const HeroText = styled.div`
  position: relative;
  max-width: ${cupContentWidth};
  margin: 0 auto;
  padding: clamp(28px, 5vw, 64px) 20px 0 20px;

  /* Room for the motif below the text */
  @media screen and (max-width: ${heroStackedWidth}) {
    padding-bottom: 27vw;
  }
  @media screen and (max-width: 640px) {
    padding-bottom: 42vw;
  }
`;
const HeroKicker = styled.div`
  display: inline-block;
  font-family: ${cupLabelFont};
  font-weight: 800;
  font-style: italic;
  font-size: 15px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--cup-accent-text);
  background: var(--cup-accent);
  padding: 5px 14px 5px 12px;
  transform: skewX(-12deg);
  border: 3px solid var(--cup-ink);
  box-shadow: 4px 4px 0 var(--cup-ink);
`;
export const CupTitle = styled.h1`
  font-family: ${cupHeadingFont};
  font-weight: 400;
  /* Scaled down for long names, so a word is never broken */
  font-size: min(128px, 9.5vw, calc(var(--cup-title-scale, 110) * 1px));
  line-height: 0.88;
  letter-spacing: 0.005em;
  text-transform: uppercase;
  margin: 30px 0 0 0;
  max-width: min(100%, 760px);
  color: var(--cup-hero-text);
  -webkit-text-stroke: 3px var(--cup-ink);
  paint-order: stroke fill;
  text-shadow:
    5px 5px 0 var(--cup-ink),
    10px 10px 0 var(--cup-highlight);
  overflow-wrap: normal;

  /* Smaller next to the scene on narrow desktops, so that the motif is not covered */
  @media screen and (min-width: 1001px) and (max-width: 1400px) {
    font-size: min(7.2vw, calc(var(--cup-title-scale, 110) * 1px));
  }
  @media screen and (max-width: 640px) {
    font-size: min(64px, calc((100vw - 40px) / (var(--cup-title-longest, 8) * 0.6)));
  }
`;
const HeroSubtitle = styled.div`
  margin-top: 18px;
  font-family: ${cupLabelFont};
  font-weight: 700;
  font-size: clamp(16px, 1.8vw, 21px);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--cup-hero-text);
  text-shadow: 2px 2px 0 var(--cup-ink);
`;
const HeroStats = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px 28px;
  margin-top: 22px;
`;
const HeroStat = styled.div`
  color: var(--cup-hero-text);
  text-shadow: 2px 2px 0 var(--cup-ink);

  strong {
    display: block;
    font-family: ${cupHeadingFont};
    font-weight: 400;
    font-size: clamp(30px, 4vw, 46px);
    line-height: 1;
    color: var(--cup-accent2);
    -webkit-text-stroke: 1.5px var(--cup-ink);
    paint-order: stroke fill;
  }
  span {
    font-family: ${cupLabelFont};
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }
`;

export interface ICupHeroStat {
  value: ReactNode;
  label: string;
}
interface ICupHeroProps {
  theme: ICupTheme;
  kicker?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  stats?: ICupHeroStat[];
  children?: ReactNode;
}
/** The longest word decides how big the title can be, without breaking the word */
const titleScale = (title: string): CSSProperties => {
  const longest = Math.max(4, ...title.split(/\s+/).map(word => word.length));
  return {
    '--cup-title-scale': Math.round(Math.min(128, 1150 / Math.max(longest, title.length / 2))),
    '--cup-title-longest': longest
  } as CSSProperties;
};

export const CupHero = ({ theme, kicker, title, subtitle, stats, children }: ICupHeroProps) => (
  <StyledHero>
    <HeroArt>
      <CupBannerScene theme={theme} />
    </HeroArt>
    <HeroScrim />
    <HeroText>
      {kicker ? <HeroKicker>{kicker}</HeroKicker> : null}
      <CupTitle style={titleScale(title)}>{title}</CupTitle>
      {subtitle ? <HeroSubtitle>{subtitle}</HeroSubtitle> : null}
      {stats && stats.length ? (
        <HeroStats>
          {stats.map(stat => (
            <HeroStat key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </HeroStat>
          ))}
        </HeroStats>
      ) : null}
      {children}
    </HeroText>
  </StyledHero>
);

/* --------------------------------------------------------------- panels */

export const CupPanel = styled.section<{ $accent?: boolean }>`
  position: relative;
  background: ${({ $accent }) => ($accent ? 'var(--cup-accent)' : 'var(--cup-panel)')};
  color: ${({ $accent }) => ($accent ? 'var(--cup-accent-text)' : 'var(--cup-panel-text)')};
  border: 3px solid var(--cup-ink);
  box-shadow: 9px 9px 0 ${({ $accent }) => ($accent ? 'var(--cup-ink)' : 'var(--cup-shadow)')};
  padding: clamp(18px, 3vw, 30px);
  margin-bottom: 40px;

  a {
    color: ${({ $accent }) => ($accent ? 'var(--cup-accent-text)' : 'var(--cup-highlight)')};
  }
`;

/** A small skewed label above a heading */
export const CupCaption = styled.div`
  display: inline-block;
  font-family: ${cupLabelFont};
  font-weight: 800;
  font-style: italic;
  font-size: 14px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--cup-accent2-text);
  background: var(--cup-accent2);
  padding: 3px 12px 3px 10px;
  transform: skewX(-12deg);
  border: 2px solid var(--cup-ink);
  margin-bottom: 10px;
`;

export const CupHeading = styled.h3`
  font-family: ${cupHeadingFont};
  font-weight: 400;
  font-size: clamp(24px, 3vw, 34px);
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.01em;
  margin: 4px 0 10px 0;
  color: inherit;
`;

export const CupMuted = styled.span`
  color: var(--cup-muted);
`;

const SectionHeader = styled.div<{ $clickable?: boolean }>`
  display: flex;
  align-items: flex-end;
  gap: 14px;
  margin: 56px 0 24px 0;
  color: var(--cup-page-text);
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  user-select: none;

  &:focus-visible {
    outline: 3px solid var(--cup-highlight);
    outline-offset: 6px;
  }
  .cup-section-index {
    font-family: ${cupHeadingFont};
    font-size: clamp(44px, 6vw, 72px);
    line-height: 0.8;
    color: transparent;
    -webkit-text-stroke: 2px var(--cup-highlight);
  }
  h2 {
    font-family: ${cupHeadingFont};
    font-weight: 400;
    font-size: clamp(30px, 4.4vw, 52px);
    line-height: 0.9;
    text-transform: uppercase;
    margin: 0;
    color: inherit;
  }
  .cup-section-count {
    font-family: ${cupLabelFont};
    font-weight: 800;
    font-size: 15px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--cup-muted);
    margin-bottom: 6px;
    white-space: nowrap;
  }
  .cup-section-line {
    flex: 1;
    min-width: 40px;
    height: 8px;
    margin-bottom: 8px;
    background: repeating-linear-gradient(-55deg, var(--cup-highlight) 0 8px, transparent 8px 14px);
  }
  .cup-section-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    flex: 0 0 auto;
    color: var(--cup-panel-text);
    background: var(--cup-panel);
    border: 3px solid var(--cup-ink);
    box-shadow: 3px 3px 0 var(--cup-shadow);
    font-size: 18px;
    transition: transform 0.15s;
  }
  &:hover .cup-section-toggle {
    transform: translate(-1px, -1px);
  }
`;

interface ICupSectionProps {
  index?: number;
  title: string;
  extra?: ReactNode;
  /** Shown next to the title, e.g. the number of races, mostly when collapsed */
  count?: ReactNode;
  /** Set together with onToggle to make the section collapsible */
  collapsed?: boolean;
  onToggle?: () => void;
}
/** A big section title on the page, e.g. "02 RACES ////", that can collapse its section */
export const CupSection = ({ index, title, extra, count, collapsed, onToggle }: ICupSectionProps) => {
  const clickable = !!onToggle;
  return (
    <SectionHeader
      $clickable={clickable}
      aria-expanded={clickable ? !collapsed : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onToggle}
      onKeyDown={
        clickable
          ? e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggle();
              }
            }
          : undefined
      }
    >
      {index != null ? <span className="cup-section-index">{String(index).padStart(2, '0')}</span> : null}
      <h2>{title}</h2>
      {count != null ? <span className="cup-section-count">{count}</span> : null}
      <span className="cup-section-line" />
      {extra}
      {clickable ? (
        <span className="cup-section-toggle" aria-hidden="true">
          {collapsed ? <DownOutlined /> : <UpOutlined />}
        </span>
      ) : null}
    </SectionHeader>
  );
};

/** The seasons as tabs, the chosen season filled */
export const CupSeasonTabs = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 28px;

  .cup-season-label {
    font-family: ${cupLabelFont};
    font-weight: 800;
    font-style: italic;
    font-size: 14px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--cup-muted);
    margin-right: 4px;
  }
  button {
    font-family: ${cupHeadingFont};
    font-size: 20px;
    letter-spacing: 0.02em;
    padding: 6px 16px 4px 16px;
    cursor: pointer;
    color: var(--cup-panel-text);
    background: var(--cup-panel);
    border: 3px solid var(--cup-ink);
    box-shadow: 4px 4px 0 var(--cup-shadow);
    transform: skewX(-8deg);
    transition:
      transform 0.08s,
      box-shadow 0.08s;
  }
  button:hover {
    transform: skewX(-8deg) translate(-2px, -2px);
    box-shadow: 6px 6px 0 var(--cup-shadow);
  }
  button[aria-pressed='true'] {
    color: var(--cup-highlight-text);
    background: var(--cup-highlight);
    box-shadow: 4px 4px 0 var(--cup-ink);
  }
  button:focus-visible {
    outline: 3px solid var(--cup-highlight);
    outline-offset: 3px;
  }
`;

export const CupAdminBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  margin: 24px 0 8px 0;
  background: var(--cup-panel);
  border: 2px dashed var(--cup-muted);
`;

/** The small, discreet button that shows the administration */
export const CupEditToggle = styled.button<{ $active?: boolean }>`
  position: absolute;
  top: 14px;
  right: 20px;
  z-index: 3;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-family: ${cupLabelFont};
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  color: var(--cup-muted);
  background: ${({ $active }) => ($active ? 'var(--cup-panel)' : 'transparent')};
  border: 1px dashed ${({ $active }) => ($active ? 'var(--cup-muted)' : 'transparent')};
  opacity: ${({ $active }) => ($active ? 1 : 0.55)};

  &:hover,
  &:focus-visible {
    opacity: 1;
    border-color: var(--cup-muted);
  }

  /* In the administration bar: last in the row, never on top of the buttons */
  ${CupAdminBar} & {
    position: static;
    margin-left: auto;
    align-self: center;
  }
`;

/** A comic starburst with a hand lettered sound effect */
export const CupBurst = styled.div<{ $size?: number }>`
  position: absolute;
  top: -42px;
  right: -14px;
  width: ${({ $size }) => $size ?? 132}px;
  height: ${({ $size }) => $size ?? 132}px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-family: ${cupSfxFont};
  font-size: ${({ $size }) => Math.round(($size ?? 132) / 5.2)}px;
  line-height: 1;
  color: var(--cup-ink);
  background: var(--cup-accent2);
  clip-path: polygon(
    50% 0%,
    58% 26%,
    79% 9%,
    72% 33%,
    98% 27%,
    79% 47%,
    100% 62%,
    74% 64%,
    84% 90%,
    60% 74%,
    50% 100%,
    41% 74%,
    15% 91%,
    26% 64%,
    0% 60%,
    21% 46%,
    3% 25%,
    28% 32%,
    21% 7%,
    43% 25%
  );
  transform: rotate(10deg);
  z-index: 2;
  pointer-events: none;
  filter: drop-shadow(3px 3px 0 var(--cup-ink));
`;

/** The narration box of a comic, for the description of the cup */
export const CupBubble = styled.div`
  position: relative;
  background: var(--cup-panel);
  color: var(--cup-panel-text);
  border: 3px solid var(--cup-ink);
  border-left: 12px solid var(--cup-highlight);
  padding: 18px 22px;
  margin: 0 0 40px 0;
  box-shadow: 6px 6px 0 var(--cup-shadow);
  font-size: clamp(16px, 1.6vw, 19px);
  font-weight: 500;
  font-style: italic;
  line-height: 1.5;
  white-space: pre-line;
  max-width: 860px;
`;

export const CupButton = styled.a<{ $secondary?: boolean }>`
  &&& {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: ${cupLabelFont};
    font-weight: 800;
    font-size: 17px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 9px 18px;
    margin: 6px 12px 6px 0;
    color: ${({ $secondary }) => ($secondary ? 'var(--cup-accent2-text)' : 'var(--cup-accent-text)')};
    background: ${({ $secondary }) => ($secondary ? 'var(--cup-accent2)' : 'var(--cup-accent)')};
    border: 3px solid ${({ $secondary }) => ($secondary ? 'var(--cup-accent2-edge)' : 'var(--cup-accent-edge)')};
    box-shadow: 5px 5px 0 var(--cup-ink);
    text-decoration: none;
    cursor: pointer;
    transition:
      transform 0.08s,
      box-shadow 0.08s;
  }
  &&&:hover {
    transform: translate(-2px, -2px);
    box-shadow: 7px 7px 0 var(--cup-ink);
  }
  &&&:active {
    transform: translate(4px, 4px);
    box-shadow: 1px 1px 0 var(--cup-ink);
  }
`;

export const CupGrid = styled.div<{ $min?: number }>`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, ${({ $min }) => $min ?? 260}px), 1fr));
  gap: 30px;
`;

/** A rubber stamp, e.g. on finished races */
export const CupStamp = styled.span<{ $color?: string }>`
  display: inline-block;
  font-family: ${cupLabelFont};
  font-weight: 800;
  font-size: 14px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: ${({ $color }) => $color ?? 'var(--cup-highlight)'};
  border: 3px solid currentColor;
  outline: 1px solid currentColor;
  outline-offset: 2px;
  padding: 1px 8px;
  transform: rotate(-8deg);
  opacity: 0.92;
`;

/** A big outlined number, e.g. the race number */
export const CupBigNumber = styled.span<{ $size?: number }>`
  font-family: ${cupHeadingFont};
  font-size: ${({ $size }) => $size ?? 76}px;
  line-height: 0.8;
  color: transparent;
  -webkit-text-stroke: 2.5px var(--cup-panel-text);
  opacity: 0.9;
`;

/** Table styles on top of antd, inside a panel */
export const CupTableWrapper = styled.div`
  overflow-x: auto;
  overflow-y: hidden;

  .ant-table {
    background: transparent;
    color: var(--cup-panel-text);
    font-family: ${cupBodyFont};
    font-size: 14px;
  }
  .ant-table-thead > tr > th {
    background: var(--cup-ink) !important;
    color: #ffffff;
    font-family: ${cupLabelFont};
    font-weight: 800;
    font-size: 14px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    border-bottom: none;
    border-radius: 0 !important;
  }
  .ant-table-thead > tr > th::before {
    display: none;
  }
  .ant-table-tbody > tr > td {
    border-bottom: 1px solid var(--cup-line);
    background: transparent;
  }
  .ant-table-tbody > tr:nth-child(even) > td {
    background: var(--cup-row-alt);
  }
  .ant-table-tbody > tr.ant-table-row:hover > td {
    background: var(--cup-row-alt);
    box-shadow: inset 0 0 0 9999px rgba(127, 127, 127, 0.06);
  }
  .ant-table-placeholder td {
    background: transparent !important;
  }
  /* Fixed columns (rank, name, total) must be opaque, the other columns scroll below them.
     The striped rows get the stripe color layered on top of the panel color. */
  .ant-table-tbody > tr > td.ant-table-cell-fix,
  .ant-table-tbody > tr > td.ant-table-cell-fix-left,
  .ant-table-tbody > tr > td.ant-table-cell-fix-right {
    background: var(--cup-panel) !important;
  }
  .ant-table-tbody > tr:nth-child(even) > td.ant-table-cell-fix,
  .ant-table-tbody > tr:nth-child(even) > td.ant-table-cell-fix-left,
  .ant-table-tbody > tr:nth-child(even) > td.ant-table-cell-fix-right,
  .ant-table-tbody > tr.ant-table-row:hover > td.ant-table-cell-fix,
  .ant-table-tbody > tr.ant-table-row:hover > td.ant-table-cell-fix-left,
  .ant-table-tbody > tr.ant-table-row:hover > td.ant-table-cell-fix-right {
    background: linear-gradient(var(--cup-row-alt), var(--cup-row-alt)), var(--cup-panel) !important;
  }
  .cup-points {
    font-family: ${cupHeadingFont};
    font-size: 17px;
    letter-spacing: 0.02em;
  }
  .cup-total {
    font-family: ${cupHeadingFont};
    font-size: 22px;
    color: var(--cup-highlight);
  }
  .cup-not-counted {
    opacity: 0.4;
    text-decoration: line-through;
  }
  .cup-club-member {
    font-weight: 700;
  }
`;

/** Gold, silver and bronze medals, a plain number for the others */
export const CupRank = ({ rank, size = 34 }: { rank: number; size?: number }) => {
  const color =
    rank === 1 ? 'var(--cup-gold)' : rank === 2 ? 'var(--cup-silver)' : rank === 3 ? 'var(--cup-bronze)' : null;
  return color ? (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        background: color,
        color: '#111111',
        fontFamily: cupHeadingFont,
        fontSize: size * 0.52,
        clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)'
      }}
    >
      {rank}
    </span>
  ) : (
    <span style={{ fontFamily: cupHeadingFont, fontSize: size * 0.5, paddingLeft: size * 0.3, opacity: 0.85 }}>
      {rank}
    </span>
  );
};
