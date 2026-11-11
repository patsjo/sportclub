/**
 * An XML document as the proxy (php/eventorProxyWithCache.php) turns it into JSON, for a file read in the browser:
 * the attributes under "@attributes", the children by name (an array when the name is used more than once), and a
 * child with text as the text alone (its attributes are dropped). An element without text or children, or with only
 * spaces, is an empty object.
 */
const isText = (node: ChildNode | null) =>
  node != null &&
  (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE) &&
  (node.nodeValue ?? '').trim() !== '';

const elementText = (element: Element) =>
  Array.from(element.childNodes)
    .filter(node => node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE)
    .map(node => node.nodeValue ?? '')
    .join('');

const childName = (node: ChildNode) =>
  node.nodeType === Node.ELEMENT_NODE
    ? (node as Element).localName
    : node.nodeType === Node.COMMENT_NODE
      ? 'comment'
      : node.nodeType === Node.PROCESSING_INSTRUCTION_NODE
        ? node.nodeName
        : null;

const childAsJson = (node: ChildNode): unknown => {
  if (node.nodeType !== Node.ELEMENT_NODE) return {};
  return isText(node.firstChild) ? elementText(node as Element) : elementAsJson(node as Element);
};

const elementAsJson = (element: Element): Record<string, unknown> => {
  const json: Record<string, unknown> = {};
  const attributes = Array.from(element.attributes).filter(attribute => attribute.namespaceURI == null);
  if (attributes.length) json['@attributes'] = Object.fromEntries(attributes.map(a => [a.name, a.value]));
  const nodes = Array.from(element.childNodes).filter(node => childName(node) != null || isText(node));
  if (nodes.length === 1 && isText(nodes[0])) {
    json['0'] = elementText(element);
    return json;
  }
  const children = new Map<string, unknown[]>();
  Array.from(element.childNodes).forEach(node => {
    const name = childName(node);
    if (name == null) return;
    if (!children.has(name)) children.set(name, []);
    children.get(name)!.push(childAsJson(node));
  });
  children.forEach((values, name) => {
    json[name] = values.length > 1 ? values : values[0];
  });
  return json;
};

export const IofXmlToJson = (xml: string): Record<string, unknown> => {
  // As the proxy, line breaks and tabs are taken out before the document is parsed
  const document = new DOMParser().parseFromString(
    xml.replace(/^\uFEFF/, '').replace(/[\n\r\t]/g, ''),
    'application/xml'
  );
  const error = document.getElementsByTagName('parsererror')[0];
  if (error) throw new Error(`Not an XML file, ${(error.textContent ?? '').trim().substring(0, 200)}`);
  return elementAsJson(document.documentElement);
};
