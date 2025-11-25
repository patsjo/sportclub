import { Spin } from 'antd';
import { observer } from 'mobx-react';
import React, { useCallback, useRef, useState } from 'react';
import { SpinnerDiv } from '../components/styled/styled';

const getParentElement = (el: HTMLElement | null): HTMLElement | null => {
  return el && el.parentElement;
};

const mousewheelListener = (e: WheelEvent) => {
  // Prevents Chrome hangups
  // See: https://stackoverflow.com/questions/47524205/random-high-content-download-time-in-chrome/47684257#47684257
  if (e.deltaY === 1) {
    e.preventDefault();
  }
};

const calculateTopPosition = (el: HTMLElement | null): number => {
  if (!el) {
    return 0;
  }
  return el.offsetTop + calculateTopPosition(el.offsetParent as HTMLElement);
};

const calculateOffset = (el: HTMLElement | null, scrollTop: number): number => {
  if (!el) {
    return -1;
  }

  return calculateTopPosition(el) + (el.offsetHeight - scrollTop - window.innerHeight);
};

interface IInfiniteScrollProps {
  children?: React.ReactNode;
  loadMore: () => Promise<boolean>;
  threshold?: number;
  useCapture?: boolean;
  useWindow?: boolean;
  ref?: React.RefObject<HTMLDivElement>;
}

const InfiniteScroll = observer(
  ({ children, loadMore, threshold = 250, useCapture, useWindow = true, ref }: IInfiniteScrollProps) => {
    const [hasMore, setHasMore] = useState(true);
    const loadingRef = useRef(false);
    const divScrollRef = useRef<HTMLDivElement>(null);
    const scrollComponent: React.RefObject<HTMLDivElement> = ref || divScrollRef;

    const eventListenerOptions = useCallback(
      (): EventListenerOptions => ({
        capture: useCapture,
      }),
      [useCapture],
    );

    const scrollListener = useCallback(async () => {
      try {
        if (loadingRef.current) return true;
        loadingRef.current = true;
        const el = scrollComponent.current;
        let parentElement = getParentElement(el);
        let offset = 0;
        let moreToLoad = false;
        if (useWindow) {
          const doc = document.documentElement || document.body.parentNode || document.body;
          const scrollTop = window.pageYOffset !== undefined ? window.pageYOffset : doc.scrollTop;
          offset = calculateOffset(el, scrollTop);
        } else if (el && parentElement) {
          offset = el.scrollHeight - parentElement.scrollTop - parentElement.clientHeight;
        }

        // Here we make sure the element is visible as well as checking the offset
        // Call loadMore after detachScrollListener to allow for non-async loadMore functions
        if (hasMore && offset < threshold && el && parentElement && el.offsetParent !== null) {
          //detachScrollListener();
          const beforeScrollHeight = parentElement.scrollHeight;
          const beforeScrollTop = parentElement.scrollTop;
          moreToLoad = await loadMore();
          setHasMore(moreToLoad);
          parentElement = getParentElement(scrollComponent.current);
          if (parentElement)
            parentElement.scrollTop = parentElement.scrollHeight - beforeScrollHeight + beforeScrollTop;
        }
        loadingRef.current = false;
        return moreToLoad;
      } catch (error) {
        console.error(error);
        setHasMore(false);
        loadingRef.current = false;
        return false;
      }
    }, [loadMore, hasMore]);

    React.useEffect(() => {
      const options = eventListenerOptions();
      const scrollEl: EventTarget | null = useWindow ? window : getParentElement(scrollComponent.current);

      scrollEl?.addEventListener('wheel', (e: Event) => mousewheelListener(e as WheelEvent), options);
      scrollEl?.addEventListener('scroll', scrollListener, options);
      scrollEl?.addEventListener('resize', scrollListener, options);

      return () => {
        const options = eventListenerOptions();
        const scrollEl: EventTarget | null = useWindow ? window : getParentElement(scrollComponent.current);

        scrollEl?.removeEventListener('scroll', scrollListener, options);
        scrollEl?.removeEventListener('resize', scrollListener, options);
        scrollEl?.removeEventListener('wheel', (e: Event) => mousewheelListener(e as WheelEvent), options);
      };
    }, [scrollListener, eventListenerOptions]);

    React.useEffect(() => {
      const initialLoad = async () => {
        const parentHeight: number | undefined = useWindow
          ? window.innerHeight
          : getParentElement(scrollComponent.current)?.clientHeight;
        let moreToLoad = true;
        while (
          moreToLoad &&
          parentHeight != null &&
          scrollComponent.current &&
          parentHeight + threshold > scrollComponent.current.scrollHeight
        ) {
          if (!loadingRef.current) moreToLoad = await scrollListener();
          else await new Promise((resolve) => setTimeout(() => resolve(true), 200));
        }
      };
      initialLoad();
    }, [scrollListener, scrollComponent.current, threshold]);

    return (
      <div ref={divScrollRef}>
        {children}
        <SpinnerDiv key="InfiniteScrollSpinner#competitorPresentation" visible={hasMore}>
          <Spin size="large" />
        </SpinnerDiv>
      </div>
    );
  },
);
export default InfiniteScroll;
