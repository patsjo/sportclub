import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// The public pages that most visitors use, the admin pages need a login and are audited manually
export const publicPages: { name: string; path: string }[] = [
  { name: 'dashboard', path: '/' },
  { name: 'news', path: '/news' },
  { name: 'calendar', path: '/calendar' },
  { name: 'competitor-presentation', path: '/competitor/presentation' },
  { name: 'results', path: '/results' },
  { name: 'results-individual', path: '/results/individual' },
  { name: 'results-statistics', path: '/results/statistics' },
  { name: 'league', path: '/league' },
  { name: 'cups', path: '/cups' },
  { name: 'maps', path: '/maps' },
  { name: 'map-tracks', path: '/maps/tracks' },
  { name: 'sponsors', path: '/sponsors' }
];

const extraPages: { name: string; path: string }[] = (process.env.AUDIT_PAGES ?? '')
  .split(',')
  .filter(Boolean)
  .map(p => ({ name: p.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'root', path: p }));

const pages = extraPages.length ? extraPages : publicPages;
const resultDir = path.join(process.cwd(), 'e2e-results');

interface IOverflowElement {
  selector: string;
  right: number;
  width: number;
}

const findOverflow = (page: Page) =>
  page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const describe = (el: Element) => {
      const id = el.id ? `#${el.id}` : '';
      const cls =
        typeof el.className === 'string' && el.className
          ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
          : '';
      return `${el.tagName.toLowerCase()}${id}${cls}`;
    };
    const isClipped = (el: Element) => {
      // An ancestor that scrolls or hides overflow is fine (e.g. a table with a horizontal scroll)
      let parent = el.parentElement;
      while (parent && parent !== document.body) {
        const style = getComputedStyle(parent);
        if (['auto', 'scroll', 'hidden', 'clip'].includes(style.overflowX)) {
          const rect = parent.getBoundingClientRect();
          if (rect.right <= viewportWidth + 1) return true;
        }
        parent = parent.parentElement;
      }
      return false;
    };
    const overflowing: IOverflowElement[] = [];
    document.querySelectorAll('body *').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      if (rect.right > viewportWidth + 1 && !isClipped(el)) {
        overflowing.push({ selector: describe(el), right: Math.round(rect.right), width: Math.round(rect.width) });
      }
    });
    // Only the outermost offenders
    return {
      viewportWidth,
      scrollWidth: document.documentElement.scrollWidth,
      overflowing: overflowing.slice(0, 15)
    };
  });

const findSmallTouchTargets = (page: Page) =>
  page.evaluate(() => {
    const small: string[] = [];
    document
      .querySelectorAll('a[href], button, [role="button"], input:not([type="hidden"]), select, [role="tab"]')
      .forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        if (rect.width < 24 || rect.height < 24) {
          const text = (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30);
          small.push(`${el.tagName.toLowerCase()} ${Math.round(rect.width)}x${Math.round(rect.height)} "${text}"`);
        }
      });
    return small.slice(0, 20);
  });

for (const p of pages) {
  test(`mobile audit ${p.name}`, async ({ page }, testInfo) => {
    const project = testInfo.project.name;
    await page.goto(p.path);
    await page.waitForLoadState('networkidle', { timeout: 45_000 }).catch(() => undefined);
    await page.waitForTimeout(1500);

    const overflow = await findOverflow(page);
    const smallTargets = await findSmallTouchTargets(page);
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    const violations = axe.violations.map(v => ({
      id: v.id,
      impact: v.impact,
      count: v.nodes.length,
      targets: v.nodes.slice(0, 3).map(n => n.target.join(' '))
    }));

    fs.mkdirSync(resultDir, { recursive: true });
    // One image per screen height (max 4), a full page image of a long page is unreadable
    const viewport = page.viewportSize() ?? { width: 390, height: 844 };
    const fullHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let i = 0; i < Math.min(4, Math.ceil(fullHeight / viewport.height)); i++) {
      await page.screenshot({
        path: path.join(resultDir, `${project}-${p.name}-${i}.png`),
        fullPage: true,
        clip: { x: 0, y: i * viewport.height, width: viewport.width, height: viewport.height }
      });
    }
    fs.writeFileSync(
      path.join(resultDir, `${project}-${p.name}.json`),
      JSON.stringify({ path: p.path, overflow, smallTargets, violations }, null, 2)
    );

    expect.soft(overflow.scrollWidth, `horizontal scroll on ${p.path}`).toBeLessThanOrEqual(overflow.viewportWidth);
  });
}
