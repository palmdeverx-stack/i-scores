'use client';

import { useEffect } from 'react';

import setupLocatorUI from '@locator/runtime';

let locatorStarted = false;

export function LocatorJS() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' || locatorStarted) {
      return;
    }

    locatorStarted = true;
    setupLocatorUI();
  }, []);

  return null;
}
