/**
 * News and cup reports are plain text with a few simple HTML tags (links, bold, italic, ...).
 * Only these tags become elements, everything else is shown as text, so nothing else can be injected.
 */
export const simpleHtmlTags = ['a', 'b', 'strong', 'i', 'em', 'u', 's', 'del', 'sup', 'sub'] as const;
export type SimpleHtmlTag = (typeof simpleHtmlTags)[number];

export const isSimpleHtmlTag = (name: string): name is SimpleHtmlTag =>
  (simpleHtmlTags as readonly string[]).includes(name.toLowerCase());

/** Only web, mail, phone and links on the same site */
export const safeHref = (href?: string | null): string | undefined => {
  const value = (href ?? '').trim().replace(/&amp;/gi, '&');
  return /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(value) ? value : undefined;
};

const anyTag = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;

/** Has other tags than the simple ones, e.g. from the old HTML editor */
export const hasOtherHtml = (text: string) => [...text.matchAll(anyTag)].some(match => !isSimpleHtmlTag(match[1]));

/**
 * HTML from the old editor to plain text, paragraphs and line breaks become new lines.
 * The simple tags are kept.
 */
export const htmlToSimpleText = (html: string): string => {
  const prepared = html
    .replace(/\r?\n/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/(p|div|h[1-6]|blockquote|ul|ol|table|tr)>/gi, '\n\n');
  const body = new DOMParser().parseFromString(prepared, 'text/html').body;

  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const element = node as Element;
    const inner = [...element.childNodes].map(walk).join('');
    const name = element.tagName.toLowerCase();
    if (!isSimpleHtmlTag(name) || inner.length === 0) return inner;
    if (name === 'a') {
      const href = safeHref(element.getAttribute('href'));
      return href ? `<a href="${href.replace(/"/g, '%22')}">${inner}</a>` : inner;
    }
    return `<${name}>${inner}</${name}>`;
  };

  return walk(body)
    .replaceAll(String.fromCharCode(160), ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export interface ISimpleHtmlNode {
  /** undefined for text */
  tag?: SimpleHtmlTag;
  href?: string;
  text?: string;
  children: ISimpleHtmlNode[];
}

const simpleTag = /<(\/?)(a|b|strong|i|em|u|s|del|sup|sub)(\s[^>]*)?>/gi;
const hrefAttribute = /href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;

/**
 * Text with the simple tags to a tree. Other tags and a < in the text stay text,
 * a closing tag without a start is ignored, and a tag that isn't closed ends with the text.
 */
export const parseSimpleHtml = (text: string): ISimpleHtmlNode[] => {
  const root: ISimpleHtmlNode = { children: [] };
  const stack: ISimpleHtmlNode[] = [root];
  let position = 0;
  const addText = (value: string) => {
    if (value) stack[stack.length - 1].children.push({ text: value, children: [] });
  };

  for (const match of text.matchAll(simpleTag)) {
    addText(text.slice(position, match.index));
    position = match.index + match[0].length;
    const tag = match[2].toLowerCase() as SimpleHtmlTag;

    if (match[1] === '/') {
      const index = stack.map(node => node.tag).lastIndexOf(tag);
      if (index > 0) stack.length = index;
      continue;
    }
    const node: ISimpleHtmlNode = { tag, children: [] };
    if (tag === 'a') {
      const href = match[3]?.match(hrefAttribute);
      node.href = safeHref(href ? (href[1] ?? href[2] ?? href[3]) : undefined);
    }
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  }
  addText(text.slice(position));

  return root.children;
};
