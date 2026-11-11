import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CreateBookmarkletDialog } from './bookmarkletDialog';

describe('CreateBookmarkletDialog', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.style.overflow = '';
  });

  it('covers the page, which can not be reached or scrolled until it is closed', () => {
    document.body.innerHTML = '<button id="page">Page</button>';
    const onPageClick = vi.fn();
    document.body.addEventListener('click', onPageClick);
    const dialog = CreateBookmarkletDialog('test-dialog', 'Copy results', 'Close');
    dialog.show('Collected: M75A');

    const overlay = document.getElementById('test-dialog')!;
    expect(overlay).toHaveStyle({ position: 'fixed', zIndex: '2147483647' });
    expect(overlay.querySelector('[role="dialog"]')).toHaveAttribute('aria-modal', 'true');
    expect(overlay).toHaveTextContent(/Copy results/);
    expect(overlay).toHaveTextContent(/Collected: M75A/);
    expect(document.documentElement).toHaveStyle({ overflow: 'hidden' });
    // "Close" is the only button, the default with the focus
    const close = overlay.querySelector('button')!;
    expect(Array.from(overlay.querySelectorAll('button')).map(b => b.textContent)).toEqual(['Close']);
    expect(close).toHaveFocus();
    // A click in the dialog does not reach the page
    overlay.click();
    expect(onPageClick).not.toHaveBeenCalled();

    close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.getElementById('test-dialog')).toBeNull();
    expect(document.documentElement).not.toHaveStyle({ overflow: 'hidden' });
  });

  it('has its other buttons to the left of "Close", which does its action, the others do not', () => {
    const dialog = CreateBookmarkletDialog('test-dialog', 'Copy results', 'Close');
    const onClose = vi.fn();
    dialog.onClose(onClose);
    const continueCopying = dialog.button('Close and continue copying', dialog.close);
    const overlay = document.getElementById('test-dialog')!;
    const buttons = Array.from(overlay.querySelectorAll('button'));
    expect(buttons.map(b => b.textContent)).toEqual(['Close and continue copying', 'Close']);
    // "Close" keeps the focus, Tab goes round in the dialog
    expect(buttons[1]).toHaveFocus();
    buttons[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(continueCopying).toHaveFocus();
    continueCopying.click();
    expect(onClose).not.toHaveBeenCalled();
    expect(document.getElementById('test-dialog')).toBeNull();

    // "Close", and Esc, do the action
    const again = CreateBookmarkletDialog('test-dialog', 'Copy results', 'Close');
    again.onClose(onClose);
    document.getElementById('test-dialog')!.querySelector('button')!.click();
    expect(onClose).toHaveBeenCalledTimes(1);
    const third = CreateBookmarkletDialog('test-dialog', 'Copy results', 'Close');
    third.onClose(onClose);
    document.getElementById('test-dialog')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('tells clearly that it is done', () => {
    const dialog = CreateBookmarkletDialog('test-dialog', 'Copy results', 'Close');
    dialog.success('Copied!', 'Collected: M75A');
    const overlay = document.getElementById('test-dialog')!;
    expect(overlay).toHaveTextContent(/Copied!.*Collected: M75A/);
    // Another message is not done
    dialog.show('Not copied');
    expect(overlay).not.toHaveTextContent(/Copied!/);
  });

  it('replaces the dialog of an earlier click, and shows a text to copy by hand', () => {
    CreateBookmarkletDialog('test-dialog', 'Copy results', 'Close');
    const dialog = CreateBookmarkletDialog('test-dialog', 'Copy results', 'Close');
    expect(document.querySelectorAll('#test-dialog')).toHaveLength(1);
    const area = dialog.area('{"sportclubResults":1}');
    expect(area.value).toBe('{"sportclubResults":1}');
    expect(area).toHaveFocus();
    dialog.close();
    expect(document.getElementById('test-dialog')).toBeNull();
  });
});
