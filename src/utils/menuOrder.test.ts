import { describe, expect, it } from 'vitest';
import { applyMenuOrder, cleanDividers, newDividerKey } from './menuOrder';

interface IItem {
  key: string;
  type?: 'divider';
}

const item = (key: string): IItem => ({ key });
const divider = (key: string): IItem => ({ key, type: 'divider' });
const keys = (items: IItem[]) => items.map(i => i.key);

const defaultItems = [
  item('home'),
  item('subMenu#myPages'),
  divider('divider#1'),
  item('news'),
  item('calendar'),
  divider('divider#2'),
  item('sponsors')
];

describe('applyMenuOrder', () => {
  it('uses the default order without a saved order', () => {
    expect(keys(applyMenuOrder(defaultItems, [], divider))).toEqual(keys(defaultItems));
    expect(keys(applyMenuOrder(defaultItems, undefined, divider))).toEqual(keys(defaultItems));
  });

  it('uses the saved order and only the saved dividers', () => {
    const order = ['calendar', 'divider#7', 'home', 'subMenu#myPages', 'news', 'sponsors'];
    expect(keys(applyMenuOrder(defaultItems, order, divider))).toEqual(order);
  });

  it('puts a new item after the item before it in the default order', () => {
    const order = ['sponsors', 'home', 'subMenu#myPages', 'divider#1', 'calendar'];
    expect(keys(applyMenuOrder(defaultItems, order, divider))).toEqual([
      'sponsors',
      'home',
      'subMenu#myPages',
      'news',
      'divider#1',
      'calendar'
    ]);
  });

  it('puts a new first item first', () => {
    const order = ['news', 'subMenu#myPages', 'calendar', 'sponsors'];
    expect(keys(applyMenuOrder(defaultItems, order, divider))[0]).toBe('home');
  });

  it('skips saved items that are not shown, and the dividers that are left alone', () => {
    const shown = [item('home'), item('news'), item('sponsors')];
    const order = ['home', 'divider#1', 'calendar', 'divider#2', 'news', 'divider#3'];
    expect(keys(applyMenuOrder(shown, order, divider))).toEqual(['home', 'divider#1', 'news', 'sponsors']);
  });

  it('gives login the place of My pages', () => {
    const notLoggedIn = [item('home'), item('menuItem#login'), item('news')];
    expect(keys(applyMenuOrder(notLoggedIn, ['news', 'home', 'subMenu#myPages'], divider))).toEqual([
      'news',
      'home',
      'menuItem#login'
    ]);
  });
});

describe('cleanDividers', () => {
  it('removes dividers first, last and in a row', () => {
    expect(
      keys(cleanDividers([divider('d1'), item('a'), divider('d2'), divider('d3'), item('b'), divider('d4')]))
    ).toEqual(['a', 'd2', 'b']);
  });
});

describe('newDividerKey', () => {
  it('is unique', () => {
    expect(newDividerKey(['divider#1', 'news', 'divider#3'])).toBe('divider#4');
    expect(newDividerKey(['divider#1', 'divider#2'])).toBe('divider#3');
  });
});
