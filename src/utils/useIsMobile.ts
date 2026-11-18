import { useSyncExternalStore } from 'react';

/** Below this width the pages use the mobile layout (same as the md breakpoint in antd) */
export const mobileMaxWidth = 767;
export const mobileMediaQuery = `@media screen and (max-width: ${mobileMaxWidth}px)`;

const query = `(max-width: ${mobileMaxWidth}px)`;

const hasMatchMedia = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function';

const subscribe = (onChange: () => void) => {
  if (!hasMatchMedia()) return () => undefined;
  const mediaQueryList = window.matchMedia(query);
  mediaQueryList.addEventListener('change', onChange);
  return () => mediaQueryList.removeEventListener('change', onChange);
};

const getSnapshot = () => hasMatchMedia() && window.matchMedia(query).matches;

/** True on a phone (or a narrow window), follows when the window is resized or the phone is turned */
export const useIsMobile = () => useSyncExternalStore(subscribe, getSnapshot, () => false);
