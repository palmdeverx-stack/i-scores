import type { DefaultTreeAdapterTypes } from 'parse5';

import { parseFragment, defaultTreeAdapter as tree } from 'parse5';

import { escapeHtml } from 'src/lib/escape-html';

const allowedTags = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'ol',
  'ul',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'code',
  'pre',
  'hr',
]);
const blockedTags = new Set(['script', 'style', 'template', 'iframe', 'object', 'embed']);

export function sanitizeSalesDocumentText(html: string): string {
  let hasText = false;

  function render(node: DefaultTreeAdapterTypes.ChildNode): string {
    if (tree.isTextNode(node)) {
      if (tree.getTextNodeContent(node).trim()) hasText = true;
      return escapeHtml(tree.getTextNodeContent(node));
    }
    if (!tree.isElementNode(node) || node.namespaceURI !== 'http://www.w3.org/1999/xhtml')
      return '';

    const tag = tree.getTagName(node);
    if (blockedTags.has(tag)) return '';
    if (tag === 'br' || tag === 'hr') return `<${tag}>`;

    const content = tree.getChildNodes(node).map(render).join('');
    if (!allowedTags.has(tag)) return content;

    const style = tree.getAttrList(node).find((attribute) => attribute.name === 'style')?.value;
    const alignment = style?.match(/^text-align:\s*(left|center|right|justify)\s*;?$/i)?.[1];
    const attrs = alignment ? ` style="text-align:${alignment.toLowerCase()}"` : '';
    const start =
      tag === 'ol'
        ? tree.getAttrList(node).find((attribute) => attribute.name === 'start')?.value
        : undefined;
    const orderedListStart = start && /^\d{1,6}$/.test(start) ? ` start="${start}"` : '';
    return `<${tag}${attrs}${orderedListStart}>${content}</${tag}>`;
  }

  const result = tree.getChildNodes(parseFragment(html)).map(render).join('');
  return hasText ? result : '';
}

export function salesDocumentEditorText(value: string, format?: 'html'): string {
  if (!value) return '';
  if (format === 'html') return sanitizeSalesDocumentText(value);
  return value
    .split(/\r\n?|\n/)
    .map(
      (line) =>
        `<p>${escapeHtml(line).replace(/^ +/, (spaces) => '&nbsp;'.repeat(spaces.length))}</p>`
    )
    .join('');
}
