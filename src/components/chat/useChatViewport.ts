import { type RefObject, useEffect, useState } from 'react';

// The keyboard can both shrink and pan the visual viewport without resizing
// the layout viewport. Keep the document stable and position the chat shell.
export function useChatViewport(input: RefObject<HTMLTextAreaElement | null>, mobile: boolean) {
  const [layout, setLayout] = useState({ keyboardOpen: false, compactViewport: false, inputMaxHeight: 220 });
  useEffect(() => {
    const viewport = window.visualViewport;
    const root = document.documentElement;
    let baseline = viewport?.height ?? window.innerHeight;
    let width = window.innerWidth;
    let keyboardOpen = false;
    let frame = 0;
    const properties = ['--xue-viewport-height', '--xue-viewport-top'];
    const update = () => {
      frame = 0;
      // Pinch zoom must keep ordinary page panning, not trigger a keyboard dock.
      if (viewport && Math.abs(viewport.scale - 1) > .01) {
        properties.forEach(property => root.style.removeProperty(property));
        setLayout({ keyboardOpen: false, compactViewport: false, inputMaxHeight: 220 });
        return;
      }
      const height = viewport?.height ?? window.innerHeight;
      if (window.innerWidth !== width) {
        width = window.innerWidth;
        // On rotation iOS keeps a full layout viewport while the visual one
        // remains occluded. Do not mistake that occluded height for a baseline.
        baseline = Math.max(window.innerHeight, height);
      }
      const editing = document.activeElement === input.current;
      // Toolbar changes are small; retain the dock while focus transfers to
      // Send/Stop, until the viewport actually recovers after keyboard dismissal.
      const occluded = baseline - height > Math.max(120, baseline * .2);
      keyboardOpen = mobile && occluded && (editing || keyboardOpen);
      if (!editing && !keyboardOpen) baseline = height;
      baseline = Math.max(baseline, height);
      root.style.setProperty('--xue-viewport-height', `${height}px`);
      root.style.setProperty('--xue-viewport-top', `${Math.max(0, viewport?.offsetTop ?? 0)}px`);
      const inputMaxHeight = keyboardOpen ? Math.round(Math.min(220, Math.max(64, height * .35))) : 220;
      const compactViewport = keyboardOpen && height < 280;
      setLayout(current => current.keyboardOpen === keyboardOpen && current.compactViewport === compactViewport && current.inputMaxHeight === inputMaxHeight
        ? current : { keyboardOpen, compactViewport, inputMaxHeight });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    viewport?.addEventListener('resize', schedule);
    viewport?.addEventListener('scroll', schedule);
    window.addEventListener('resize', schedule);
    document.addEventListener('focusin', schedule);
    document.addEventListener('focusout', schedule);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener('resize', schedule);
      viewport?.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      document.removeEventListener('focusin', schedule);
      document.removeEventListener('focusout', schedule);
      properties.forEach(property => root.style.removeProperty(property));
    };
  }, [input, mobile]);
  return layout;
}
