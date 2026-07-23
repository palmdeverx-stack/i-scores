'use client';

import { useEffect } from 'react';

import { useTranslate } from './use-locales';
import { translateUiText } from './ui-translation';

// ----------------------------------------------------------------------

const TRANSLATABLE_ATTRIBUTES = ['alt', 'aria-label', 'content', 'placeholder', 'title'] as const;
const THAI_PATTERN = /[ก-๙]/;
const originalText = new WeakMap<Text, string>();
const translatedText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
const translatedAttributes = new WeakMap<Element, Map<string, string>>();

function shouldSkip(element: Element | null) {
  if (!element) return true;
  if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE'].includes(element.tagName)) return true;
  return !!element.closest('[data-no-translate], [contenteditable="true"]');
}

function updateTextNode(node: Text, english: boolean) {
  if (shouldSkip(node.parentElement)) return;

  if (!english) {
    const original = originalText.get(node);
    if (original !== undefined && node.nodeValue !== original) node.nodeValue = original;
    translatedText.delete(node);
    return;
  }

  const current = node.nodeValue ?? '';
  const lastTranslated = translatedText.get(node);
  if (current === lastTranslated) return;

  if (lastTranslated !== undefined && THAI_PATTERN.test(current)) {
    originalText.set(node, current);
  }

  if (!originalText.has(node)) {
    if (!THAI_PATTERN.test(current)) return;
    originalText.set(node, current);
  }

  const source = originalText.get(node) ?? current;
  const translated = translateUiText(source);
  translatedText.set(node, translated);
  if (translated !== current) node.nodeValue = translated;
}

function updateElementAttributes(element: Element, english: boolean) {
  if (shouldSkip(element)) return;

  for (const attribute of TRANSLATABLE_ATTRIBUTES) {
    const current = element.getAttribute(attribute);
    if (current === null) continue;

    let attributes = originalAttributes.get(element);
    let translated = translatedAttributes.get(element);
    if (!attributes) {
      attributes = new Map();
      originalAttributes.set(element, attributes);
    }
    if (!translated) {
      translated = new Map();
      translatedAttributes.set(element, translated);
    }

    const lastTranslated = translated.get(attribute);

    if (!english) {
      const source = attributes.get(attribute);
      if (source !== undefined && source !== current) element.setAttribute(attribute, source);
      translated.delete(attribute);
      continue;
    }

    if (current === lastTranslated) continue;
    if (lastTranslated !== undefined && THAI_PATTERN.test(current)) {
      attributes.set(attribute, current);
    }

    if (!attributes.has(attribute)) {
      if (!THAI_PATTERN.test(current)) continue;
      attributes.set(attribute, current);
    }
    const source = attributes.get(attribute) ?? current;
    const nextValue = translateUiText(source);
    translated.set(attribute, nextValue);
    if (nextValue !== current) element.setAttribute(attribute, nextValue);
  }
}

function translateTree(root: Node, english: boolean) {
  if (root.nodeType === Node.TEXT_NODE) {
    updateTextNode(root as Text, english);
    return;
  }

  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;

  if (root.nodeType === Node.ELEMENT_NODE) updateElementAttributes(root as Element, english);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT + NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    if (node.nodeType === Node.TEXT_NODE) updateTextNode(node as Text, english);
    if (node.nodeType === Node.ELEMENT_NODE) updateElementAttributes(node as Element, english);
    node = walker.nextNode();
  }
}

export function UiTranslationBridge() {
  const { currentLang } = useTranslate();

  useEffect(() => {
    const english = currentLang.value === 'en';
    const root = document.documentElement;

    translateTree(root, english);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') {
          updateTextNode(mutation.target as Text, english);
        }

        if (mutation.type === 'attributes' && mutation.target instanceof Element) {
          updateElementAttributes(mutation.target, english);
        }

        mutation.addedNodes.forEach((node) => translateTree(node, english));
      }
    });

    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRIBUTES],
    });

    return () => observer.disconnect();
  }, [currentLang.value]);

  return null;
}
