/** The order of the top level in the menu, saved by an administrator and the same for everyone */

export const DIVIDER_PREFIX = 'divider#';
// Login (not logged in) and My pages (logged in) are the same place in the menu
const ALIASES: Record<string, string> = { 'menuItem#login': 'subMenu#myPages' };

export interface IOrderableMenuItem {
  key?: unknown;
  type?: unknown;
}

export const isDividerKey = (key: string) => key.startsWith(DIVIDER_PREFIX);

/** The key in the saved order, undefined for an item that can't be ordered (e.g. while loading) */
export const menuOrderKey = (item: IOrderableMenuItem | null | undefined): string | undefined => {
  if (!item || typeof item.key !== 'string') return undefined;
  return ALIASES[item.key] ?? item.key;
};

/** No divider first, last or two in a row (e.g. when the items between them aren't shown) */
export const cleanDividers = <T extends IOrderableMenuItem>(items: T[]): T[] => {
  const result: T[] = [];
  items.forEach(item => {
    if (item.type === 'divider' && (result.length === 0 || result[result.length - 1].type === 'divider')) return;
    result.push(item);
  });
  while (result.length > 0 && result[result.length - 1].type === 'divider') result.pop();
  return result;
};

/**
 * The default items in the saved order. Items that aren't in the saved order (new pages, modules and so on)
 * are put after the item before them in the default order. Dividers are only the saved ones, created with
 * createDivider. Without a saved order the default order is used.
 */
export const applyMenuOrder = <T extends IOrderableMenuItem>(
  defaultItems: T[],
  order: string[] | undefined,
  createDivider: (key: string) => T
): T[] => {
  if (!order || order.length === 0) return cleanDividers(defaultItems);

  const itemsByKey = new Map<string, T>();
  defaultItems.forEach(item => {
    const key = menuOrderKey(item);
    if (key && !isDividerKey(key)) itemsByKey.set(key, item);
  });

  const result: T[] = [];
  const used = new Set<T>();
  order.forEach(key => {
    if (isDividerKey(key)) {
      result.push(createDivider(key));
      return;
    }
    const item = itemsByKey.get(key);
    if (item && !used.has(item)) {
      result.push(item);
      used.add(item);
    }
  });

  let previous: T | undefined;
  defaultItems.forEach(item => {
    if (item.type === 'divider') return;
    if (!used.has(item)) {
      const index = previous ? result.indexOf(previous) : -1;
      result.splice(index + 1, 0, item);
      used.add(item);
    }
    previous = item;
  });

  return cleanDividers(result);
};

/** A new unique key for a divider */
export const newDividerKey = (existingKeys: string[]) => {
  let number = existingKeys.length + 1;
  while (existingKeys.includes(`${DIVIDER_PREFIX}${number}`)) number++;
  return `${DIVIDER_PREFIX}${number}`;
};
