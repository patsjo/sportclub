import React, { Component } from 'react';
import PropTypes from 'prop-types';

export default class InfiniteScroll extends Component {
  static propTypes = {
    children: PropTypes.node.isRequired,
    element: PropTypes.node,
    hasMore: PropTypes.bool,
    initialLoad: PropTypes.bool,
    isReverse: PropTypes.bool,
    loader: PropTypes.node,
    loadMore: PropTypes.func.isRequired,
    pageStart: PropTypes.number,
    ref: PropTypes.func,
    getScrollParent: PropTypes.func,
    threshold: PropTypes.number,
    useCapture: PropTypes.bool,
    useWindow: PropTypes.bool,
  };

  static defaultProps = {
    element: 'div',
    hasMore: false,
    initialLoad: true,
    pageStart: 0,
    useWindow: true,
    isReverse: false,
    useCapture: false,
    loader: null,
    ref: null,
    getScrollParent: null,
    threshold: 250,
  };

  constructor(props) {
    super(props);

    this.scrollListener = this.scrollListener.bind(this);
    this.eventListenerOptions = this.eventListenerOptions.bind(this);
    this.mousewheelListener = this.mousewheelListener.bind(this);
  }

  componentDidMount() {
    this.pageLoaded = this.props.pageStart;
    this.options = this.eventListenerOptions();
    this.attachScrollListener();
  }

  componentWillUnmount() {
    this.detachScrollListener();
  }

  isPassiveSupported() {
    let passive = false;

    const testOptions = {
      get passive() {
        passive = true;
      },
    };

    try {
      document.addEventListener('test', null, testOptions);
      document.removeEventListener('test', null, testOptions);
    } catch (e) {
      // ignore
    }
    return passive;
  }

  eventListenerOptions() {
    let options = this.props.useCapture;

    if (this.isPassiveSupported()) {
      options = {
        useCapture: this.props.useCapture,
        passive: true,
      };
    } else {
      options = {
        passive: false,
      };
    }
    return options;
  }

  // Set a defaut loader for all your `InfiniteScroll` components
  setDefaultLoader(loader) {
    this.defaultLoader = loader;
  }

  detachScrollListener() {
    let scrollEl = window;
    if (this.props.useWindow === false) {
      scrollEl = this.getParentElement(this.scrollComponent);
    }

    scrollEl.removeEventListener('scroll', this.scrollListener, this.options ? this.options : this.props.useCapture);
    scrollEl.removeEventListener('resize', this.scrollListener, this.options ? this.options : this.props.useCapture);
    scrollEl.removeEventListener(
      'mousewheel',
      this.mousewheelListener,
      this.options ? this.options : this.props.useCapture
    );
  }

  getParentElement(el) {
    const scrollParent = this.props.getScrollParent && this.props.getScrollParent();
    if (scrollParent != null) {
      return scrollParent;
    }
    return el && el.parentNode;
  }

  attachScrollListener() {
    const parentElement = this.getParentElement(this.scrollComponent);

    if (!this.props.hasMore || !parentElement) {
      return;
    }

    let scrollEl = window;
    if (this.props.useWindow === false) {
      scrollEl = parentElement;
    }

    scrollEl.addEventListener(
      'mousewheel',
      this.mousewheelListener,
      this.options ? this.options : this.props.useCapture
    );
    scrollEl.addEventListener('scroll', this.scrollListener, this.options ? this.options : this.props.useCapture);
    scrollEl.addEventListener('resize', this.scrollListener, this.options ? this.options : this.props.useCapture);

    if (this.props.initialLoad) {
      this.scrollListener();
    }
  }

  mousewheelListener(e) {
    // Prevents Chrome hangups
    // See: https://stackoverflow.com/questions/47524205/random-high-content-download-time-in-chrome/47684257#47684257
    if (e.deltaY === 1 && !this.isPassiveSupported()) {
      e.preventDefault();
    }
  }

  scrollListener() {
    const self = this;
    const el = self.scrollComponent;
    const scrollEl = window;
    const parentNode = self.getParentElement(el);

    let offset;
    if (self.props.useWindow) {
      const doc = document.documentElement || document.body.parentNode || document.body;
      const scrollTop = scrollEl.pageYOffset !== undefined ? scrollEl.pageYOffset : doc.scrollTop;
      if (self.props.isReverse) {
        offset = scrollTop;
      } else {
        offset = self.calculateOffset(el, scrollTop);
      }
    } else if (self.props.isReverse) {
      offset = parentNode.scrollTop;
    } else {
      offset = el.scrollHeight - parentNode.scrollTop - parentNode.clientHeight;
    }

    // Here we make sure the element is visible as well as checking the offset
    // Call loadMore after detachScrollListener to allow for non-async loadMore functions
    if (
      offset > 0 &&
      offset < Number(self.props.threshold) &&
      el &&
      el.offsetParent !== null &&
      typeof self.props.loadMore === 'function'
    ) {
      self.detachScrollListener();
      self.beforeScrollHeight = parentNode.scrollHeight;
      self.beforeScrollTop = parentNode.scrollTop;
      self.props
        .loadMore((self.pageLoaded += 1))
        .then(() => {
          const parentElement = self.getParentElement(self.scrollComponent);
          parentElement.scrollTop = parentElement.scrollHeight - self.beforeScrollHeight + self.beforeScrollTop;
          self.attachScrollListener();
        })
        .catch(() => {
          self.attachScrollListener();
        });
    }
  }

  calculateOffset(el, scrollTop) {
    if (!el || el.offsetHeight < window.innerHeight) {
      return -1;
    }

    return this.calculateTopPosition(el) + (el.offsetHeight - scrollTop - window.innerHeight);
  }

  calculateTopPosition(el) {
    if (!el) {
      return 0;
    }
    return el.offsetTop + this.calculateTopPosition(el.offsetParent);
  }

  render() {
    const {
      children,
      element,
      hasMore,
      initialLoad,
      isReverse,
      loader,
      loadMore,
      pageStart,
      useCapture,
      useWindow,
      ref,
      getScrollParent,
      ...props
    } = this.props;

    props.ref = (node) => {
      this.scrollComponent = node;
      if (ref) {
        ref(node);
      }
    };

    const childrenArray = [children];
    if (hasMore) {
      if (loader) {
        isReverse ? childrenArray.unshift(loader) : childrenArray.push(loader);
      } else if (this.defaultLoader) {
        isReverse ? childrenArray.unshift(this.defaultLoader) : childrenArray.push(this.defaultLoader);
      }
    }
    return React.createElement(element, props, childrenArray);
  }
}
