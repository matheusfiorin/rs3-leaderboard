/**
 * Accessibility Utilities
 * Ensures WCAG 2.1 AA compliance
 */

/**
 * Add semantic HTML helpers
 */
const semanticHelpers = {
  /**
   * Create accessible button
   */
  button(text, options = {}) {
    const btn = document.createElement('button');
    btn.type = options.type || 'button';
    btn.className = options.className || '';
    btn.textContent = text;
    
    if (options.ariaLabel) btn.setAttribute('aria-label', options.ariaLabel);
    if (options.disabled) btn.disabled = true;
    if (options.id) btn.id = options.id;
    
    return btn;
  },

  /**
   * Create accessible link
   */
  link(text, href, options = {}) {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    a.className = options.className || '';
    
    if (options.ariaLabel) a.setAttribute('aria-label', options.ariaLabel);
    if (options.target) a.target = options.target;
    if (options.id) a.id = options.id;
    
    return a;
  },

  /**
   * Create heading with semantic level
   */
  heading(level, text, options = {}) {
    const h = document.createElement(`h${Math.max(1, Math.min(6, level))}`);
    h.textContent = text;
    if (options.className) h.className = options.className;
    if (options.id) h.id = options.id;
    return h;
  },

  /**
   * Create labeled form input
   */
  input(type, label, options = {}) {
    const id = options.id || `input-${Math.random().toString(36).slice(2)}`;
    
    const wrapper = document.createElement('div');
    wrapper.className = options.wrapperClass || 'form-group';
    
    const labelEl = document.createElement('label');
    labelEl.htmlFor = id;
    labelEl.textContent = label;
    
    const inputEl = document.createElement('input');
    inputEl.type = type;
    inputEl.id = id;
    inputEl.className = options.className || '';
    
    if (options.required) {
      inputEl.required = true;
      labelEl.innerHTML += ' <span aria-label="required">*</span>';
    }
    if (options.placeholder) inputEl.placeholder = options.placeholder;
    if (options.ariaDescribedBy) inputEl.setAttribute('aria-describedby', options.ariaDescribedBy);
    
    wrapper.appendChild(labelEl);
    wrapper.appendChild(inputEl);
    
    return wrapper;
  }
};

/**
 * Add ARIA labels and roles
 */
function addAriaLabel(el, label) {
  if (!el) return;
  el.setAttribute('aria-label', label);
}

function addAriaDescription(el, description) {
  if (!el) return;
  const id = `desc-${Math.random().toString(36).slice(2)}`;
  const desc = document.createElement('span');
  desc.id = id;
  desc.textContent = description;
  desc.className = 'sr-only'; // Visually hidden but readable
  el.parentNode.appendChild(desc);
  el.setAttribute('aria-describedby', id);
}

function addAriaRole(el, role) {
  if (!el) return;
  el.setAttribute('role', role);
}

/**
 * Screen reader only text helper
 */
function addScreenReaderText(el, text) {
  if (!el) return;
  const sr = document.createElement('span');
  sr.className = 'sr-only';
  sr.textContent = text;
  el.appendChild(sr);
}

/**
 * Keyboard navigation helper
 */
class KeyboardNavigator {
  constructor(containerSelector, itemSelector, options = {}) {
    this.container = document.querySelector(containerSelector);
    this.items = [];
    this.currentIndex = 0;
    this.options = {
      wrap: options.wrap !== false,
      vertical: options.vertical !== false,
      horizontal: options.horizontal !== false,
      ...options
    };

    if (this.container) {
      this.init();
    }
  }

  init() {
    this.updateItems();
    this.attachKeyListener();
  }

  updateItems() {
    this.items = Array.from(
      this.container.querySelectorAll(this.options.itemSelector || '[role="menuitem"], button, a[href], input')
    );
  }

  attachKeyListener() {
    this.container.addEventListener('keydown', (e) => this.handleKeydown(e));
  }

  handleKeydown(e) {
    const { key } = e;
    let handled = false;

    if (key === 'ArrowUp' || (this.options.vertical && key === 'ArrowLeft')) {
      this.previous();
      handled = true;
    } else if (key === 'ArrowDown' || (this.options.horizontal && key === 'ArrowRight')) {
      this.next();
      handled = true;
    } else if (key === 'Home') {
      this.first();
      handled = true;
    } else if (key === 'End') {
      this.last();
      handled = true;
    }

    if (handled) {
      e.preventDefault();
      this.focusItem(this.currentIndex);
    }
  }

  focusItem(index) {
    if (this.items[index]) {
      this.items[index].focus();
    }
  }

  next() {
    if (this.currentIndex < this.items.length - 1) {
      this.currentIndex++;
    } else if (this.options.wrap) {
      this.currentIndex = 0;
    }
  }

  previous() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    } else if (this.options.wrap) {
      this.currentIndex = this.items.length - 1;
    }
  }

  first() {
    this.currentIndex = 0;
  }

  last() {
    this.currentIndex = this.items.length - 1;
  }
}

/**
 * Focus trap helper (for modals)
 */
class FocusTrap {
  constructor(element) {
    this.element = element;
    this.focusableSelectors = [
      'button',
      '[href]',
      'input',
      'select',
      'textarea',
      '[tabindex]:not([tabindex="-1"])'
    ];
  }

  activate() {
    document.addEventListener('keydown', (e) => this.handleKeydown(e));
    const focusable = this.getFocusableElements();
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  }

  deactivate() {
    // Cleanup
  }

  handleKeydown(e) {
    if (e.key !== 'Tab') return;

    const focusable = this.getFocusableElements();
    const currentIndex = focusable.indexOf(document.activeElement);

    if (e.shiftKey) {
      // Shift+Tab
      if (currentIndex <= 0) {
        focusable[focusable.length - 1].focus();
        e.preventDefault();
      }
    } else {
      // Tab
      if (currentIndex >= focusable.length - 1) {
        focusable[0].focus();
        e.preventDefault();
      }
    }
  }

  getFocusableElements() {
    return Array.from(
      this.element.querySelectorAll(this.focusableSelectors.join(','))
    ).filter(el => !el.hasAttribute('disabled'));
  }
}

/**
 * Color contrast checker
 */
function checkContrast(foreground, background) {
  const getLuminance = (hex) => {
    const [r, g, b] = hex.match(/\w\w/g).map(x => parseInt(x, 16) / 255);
    const [rs, gs, bs] = [r, g, b].map(c =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return ((lighter + 0.05) / (darker + 0.05)).toFixed(2);
}

/**
 * Announce to screen readers
 */
function announce(message, priority = 'polite') {
  const el = document.createElement('div');
  el.setAttribute('aria-live', priority);
  el.setAttribute('aria-atomic', 'true');
  el.className = 'sr-only';
  el.textContent = message;
  document.body.appendChild(el);
  
  setTimeout(() => el.remove(), 1000);
}

/**
 * Add skip to main link
 */
function addSkipLink(mainSelector = 'main') {
  const skipLink = document.createElement('a');
  skipLink.href = '#main-content';
  skipLink.className = 'skip-link';
  skipLink.textContent = 'Skip to main content';
  
  const main = document.querySelector(mainSelector);
  if (main) {
    main.id = main.id || 'main-content';
  }
  
  document.body.insertBefore(skipLink, document.body.firstChild);
  
  return skipLink;
}

/**
 * CSS for screen reader only content and skip links
 */
const a11yStyles = `
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: white;
  padding: 8px;
  text-decoration: none;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}

button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 3px solid #4A90E2;
  outline-offset: 2px;
}

/* Reduce motion for users who prefer it */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  :root {
    --text-color: #e0e0e0;
    --bg-color: #1a1a1a;
  }
}
`;

export {
  semanticHelpers,
  addAriaLabel,
  addAriaDescription,
  addAriaRole,
  addScreenReaderText,
  KeyboardNavigator,
  FocusTrap,
  checkContrast,
  announce,
  addSkipLink,
  a11yStyles
};
