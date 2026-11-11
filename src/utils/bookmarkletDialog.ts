/** The dialog of a bookmarklet on the page it is clicked on */
export interface IBookmarkletDialog {
  show: (text: string, error?: boolean) => void;
  /** Done, e.g. copied: a green check and the title in bold, then the text */
  success: (title: string, text: string) => void;
  /** What "Close" (the default button, on the right) and Esc do before the dialog is closed */
  onClose: (action: () => void) => void;
  /** A button to the left of "Close" */
  button: (label: string, onClick: () => void) => HTMLButtonElement;
  /** A text to copy by hand, selected */
  area: (text: string) => HTMLTextAreaElement;
  /** Closes the dialog, without what "Close" does */
  close: () => void;
}

/**
 * A modal dialog as the ones of the app (antd): in the middle of the page, which is dimmed and can not be reached until
 * the dialog is closed. "Close" is the default button, on the right with the focus, Esc does the same. It is given to
 * the bookmarklets as its source text, so it must not use anything outside itself.
 */
export function CreateBookmarkletDialog(id: string, title: string, closeLabel: string): IBookmarkletDialog {
  document.getElementById(id)?.remove();
  const font =
    "14px/1.5715 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'Noto Sans',sans-serif";
  const element = (tag: string, style: string) => {
    const created = document.createElement(tag);
    created.setAttribute('style', style);
    return created;
  };
  const overlay = element(
    'div',
    `position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;font:${font};color:rgba(0,0,0,.88);text-align:left`
  );
  overlay.id = id;
  const dialog = element(
    'div',
    'background:#fff;border-radius:8px;box-shadow:0 6px 16px 0 rgba(0,0,0,.08),0 3px 6px -4px rgba(0,0,0,.12),0 9px 28px 8px rgba(0,0,0,.05);width:520px;max-width:100%;max-height:100%;overflow:auto;padding:20px 24px;box-sizing:border-box'
  );
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', title);
  const heading = element('div', 'font-weight:600;font-size:16px;line-height:1.5;margin-bottom:8px');
  heading.textContent = title;
  // Shown when it is done: a green check and the title in bold
  const status = element('div', 'display:none;align-items:center;gap:10px;margin-bottom:8px');
  const statusIcon = element(
    'span',
    'display:inline-flex;align-items:center;justify-content:center;flex:none;width:28px;height:28px;border-radius:50%;background:#52c41a;color:#fff;font-size:17px;font-weight:700;line-height:1'
  );
  statusIcon.textContent = String.fromCharCode(10003);
  const statusTitle = element('span', 'font-weight:600;font-size:18px;color:#389e0d');
  status.appendChild(statusIcon);
  status.appendChild(statusTitle);
  const message = element('div', 'white-space:pre-wrap;word-break:break-word');
  const footer = element('div', 'display:flex;justify-content:flex-end;flex-wrap:wrap;gap:8px;margin-top:20px');
  dialog.appendChild(heading);
  dialog.appendChild(status);
  dialog.appendChild(message);
  dialog.appendChild(footer);
  overlay.appendChild(dialog);

  // The page can not be scrolled behind the dialog
  const root = document.documentElement;
  const overflow = root.style.overflow;
  root.style.overflow = 'hidden';
  const close = () => {
    overlay.remove();
    root.style.overflow = overflow;
  };
  let closeAction: (() => void) | undefined;
  const closeByDefault = () => {
    closeAction?.();
    close();
  };

  const focusable = () =>
    Array.from(dialog.querySelectorAll<HTMLElement>('button,textarea')).filter(
      target => !target.hasAttribute('disabled')
    );
  // Nothing reaches the page: the keys stay in the dialog (Tab goes round in it), Esc closes it
  overlay.addEventListener('keydown', event => {
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      closeByDefault();
    } else if (event.key === 'Tab') {
      const targets = focusable();
      if (!targets.length) return;
      const index = targets.indexOf(document.activeElement as HTMLElement);
      const next = event.shiftKey
        ? targets[index <= 0 ? targets.length - 1 : index - 1]
        : targets[index < 0 || index === targets.length - 1 ? 0 : index + 1];
      event.preventDefault();
      next.focus();
    }
  });
  ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'wheel', 'keyup', 'keypress'].forEach(
    type => overlay.addEventListener(type, event => event.stopPropagation())
  );
  // The focus is taken back from the page, e.g. after a click in the address bar
  document.addEventListener(
    'focusin',
    event => {
      if (overlay.isConnected && !overlay.contains(event.target as Node)) focusable()[0]?.focus();
    },
    true
  );

  const createButton = (label: string, onClick: () => void, primary: boolean) => {
    const created = element(
      'button',
      `height:32px;padding:4px 15px;border-radius:6px;border:1px solid ${primary ? '#1677ff' : '#d9d9d9'};background:${
        primary ? '#1677ff' : '#fff'
      };color:${primary ? '#fff' : 'rgba(0,0,0,.88)'};cursor:pointer;font:${font};box-shadow:0 2px 0 ${
        primary ? 'rgba(5,145,255,.1)' : 'rgba(0,0,0,.02)'
      }`
    ) as HTMLButtonElement;
    created.type = 'button';
    created.textContent = label;
    created.addEventListener('click', onClick);
    return created;
  };
  // The default button, on the right. The bookmarklet copies by itself, there is no button for it.
  const closeButton = createButton(closeLabel, closeByDefault, true);
  footer.appendChild(closeButton);
  const button = (label: string, onClick: () => void) => {
    const created = createButton(label, onClick, false);
    footer.insertBefore(created, closeButton);
    return created;
  };
  document.body.appendChild(overlay);
  closeButton.focus();

  return {
    show: (text: string, error = false) => {
      status.style.display = 'none';
      statusTitle.textContent = '';
      message.textContent = text;
      message.style.color = error ? '#ff4d4f' : 'rgba(0,0,0,.88)';
    },
    success: (title: string, text: string) => {
      statusTitle.textContent = title;
      status.style.display = 'flex';
      message.textContent = text;
      message.style.color = 'rgba(0,0,0,.88)';
    },
    onClose: (action: () => void) => {
      closeAction = action;
    },
    button,
    area: (text: string) => {
      const area = element(
        'textarea',
        `width:100%;height:96px;margin-top:12px;padding:4px 11px;border:1px solid #d9d9d9;border-radius:6px;box-sizing:border-box;font:${font}`
      ) as HTMLTextAreaElement;
      area.value = text;
      dialog.insertBefore(area, footer);
      area.focus();
      area.select();
      return area;
    },
    close
  };
}
