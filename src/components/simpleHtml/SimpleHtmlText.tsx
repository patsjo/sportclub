import { Fragment, useMemo } from 'react';
import { ISimpleHtmlNode, parseSimpleHtml } from '../../utils/simpleHtml';

const renderNodes = (nodes: ISimpleHtmlNode[], keyPrefix = ''): React.ReactNode[] =>
  nodes.map((node, index) => {
    const key = `${keyPrefix}${index}`;
    if (!node.tag) return <Fragment key={key}>{node.text}</Fragment>;
    const children = renderNodes(node.children, `${key}-`);
    if (node.tag === 'a') {
      return node.href ? (
        <a key={key} href={node.href} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
          {children}
        </a>
      ) : (
        <Fragment key={key}>{children}</Fragment>
      );
    }
    const Tag = node.tag;
    return <Tag key={key}>{children}</Tag>;
  });

interface ISimpleHtmlTextProps {
  text?: string | null;
}

/** Plain text with links, bold, italic, underline, strikethrough, superscript and subscript */
const SimpleHtmlText = ({ text }: ISimpleHtmlTextProps) => {
  const nodes = useMemo(() => (text ? parseSimpleHtml(text) : []), [text]);
  return <>{renderNodes(nodes)}</>;
};

export default SimpleHtmlText;
