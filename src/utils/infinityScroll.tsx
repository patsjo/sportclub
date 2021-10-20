import { Spin } from 'antd';
import { SpinnerDiv } from 'components/styled/styled';
import { observer } from 'mobx-react';
import React, { useCallback, useRef, useState } from 'react';

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
    const [loading, setLoading] = useState(false);
    const divScrollRef = useRef<HTMLDivElement>(null);
    const scrollComponent: React.RefObject<HTMLDivElement> = ref || divScrollRef;

    const eventListenerOptions = (): EventListenerOptions => ({
      capture: useCapture,
    });

    const getParentElement = (el: HTMLElement | null): HTMLElement | null => {
      return el && el.parentElement;
    };

    const detachScrollListener = useCallback(() => {
      const options = eventListenerOptions();
      const scrollEl: EventTarget | null = useWindow ? window : getParentElement(scrollComponent.current);

      scrollEl?.removeEventListener('scroll', scrollListener, options);
      scrollEl?.removeEventListener('resize', scrollListener, options);
      scrollEl?.removeEventListener('wheel', (e: Event) => mousewheelListener(e as WheelEvent), options);
    }, []);

    const attachScrollListener = useCallback(() => {
      const options = eventListenerOptions();
      const scrollEl: EventTarget | null = useWindow ? window : getParentElement(scrollComponent.current);

      scrollEl?.addEventListener('wheel', (e: Event) => mousewheelListener(e as WheelEvent), options);
      scrollEl?.addEventListener('scroll', scrollListener, options);
      scrollEl?.addEventListener('resize', scrollListener, options);
    }, []);

    const mousewheelListener = (e: WheelEvent) => {
      // Prevents Chrome hangups
      // See: https://stackoverflow.com/questions/47524205/random-high-content-download-time-in-chrome/47684257#47684257
      if (e.deltaY === 1) {
        e.preventDefault();
      }
    };

    const scrollListener = useCallback(() => {
      if (loading) return;
      const el = scrollComponent.current;
      const parentElement = getParentElement(el);
      let offset = 0;
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
        setLoading(true);
        detachScrollListener();
        const beforeScrollHeight = parentElement.scrollHeight;
        const beforeScrollTop = parentElement.scrollTop;
        loadMore()
          .then((more) => {
            const parentElement = getParentElement(scrollComponent.current);
            parentElement &&
              (parentElement.scrollTop = parentElement.scrollHeight - beforeScrollHeight + beforeScrollTop);

            more && attachScrollListener();
            setHasMore(more);
            setLoading(false);
          })
          .catch((error) => {
            console.error(error);
            setHasMore(false);
            setLoading(false);
          });
      }
    }, [hasMore, loading, loadMore, detachScrollListener, attachScrollListener]);

    const calculateOffset = (el: HTMLElement | null, scrollTop: number): number => {
      if (!el) {
        return -1;
      }

      return calculateTopPosition(el) + (el.offsetHeight - scrollTop - window.innerHeight);
    };

    const calculateTopPosition = (el: HTMLElement | null): number => {
      if (!el) {
        return 0;
      }
      return el.offsetTop + calculateTopPosition(el.offsetParent as HTMLElement);
    };

    React.useEffect(() => {
      attachScrollListener();

      return () => detachScrollListener();
    }, []);

    React.useEffect(() => {
      const parentHeight: number | undefined = useWindow
        ? window.innerHeight
        : getParentElement(scrollComponent.current)?.clientHeight;
      if (
        hasMore &&
        !loading &&
        parentHeight != null &&
        scrollComponent.current &&
        parentHeight + threshold > scrollComponent.current.scrollHeight
      ) {
        scrollListener();
      }
    }, [hasMore, loading, scrollListener, scrollComponent.current, threshold]);

    return (
      <div ref={divScrollRef}>
        {children}
        <SpinnerDiv key="InfiniteScrollSpinner#competitorPresentation" visible={hasMore}>
          <Spin size="large" />
        </SpinnerDiv>
      </div>
    );
  }
);
export default InfiniteScroll;
