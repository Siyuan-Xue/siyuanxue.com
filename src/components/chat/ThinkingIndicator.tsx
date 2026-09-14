import { gsap } from 'gsap';
import { useEffect, useRef } from 'react';

const ribbon = [
  'M 24 24 C 3 5 7 40 24 24 C 41 8 45 42 24 24 C 5 43 41 43 24 24 C 7 5 42 5 24 24',
  'M 24 24 C 0 17 18 45 24 24 C 30 3 48 30 24 24 C 6 49 47 33 24 24 C 1 15 32 0 24 24',
  'M 24 24 C 9 0 1 34 24 24 C 47 14 34 48 24 24 C 0 33 35 49 24 24 C 13 0 48 16 24 24',
];

/** A continuous ink ribbon, animated by the site's existing GSAP runtime. */
export function ThinkingIndicator({ label, reduceMotion }: { label: string; reduceMotion: boolean }) {
  const root = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!root.current || reduceMotion) return;
    const context = gsap.context(() => {
      gsap.timeline({ repeat: -1, defaults: { duration: 1.25, ease: 'sine.inOut' } })
        .to('path', { attr: { d: ribbon[1] } })
        .to('path', { attr: { d: ribbon[2] } })
        .to('path', { attr: { d: ribbon[0] } });
      gsap.to(root.current, { rotation: 360, duration: 12, repeat: -1, ease: 'none', transformOrigin: '50% 50%' });
    }, root);
    return () => context.revert();
  }, [reduceMotion]);

  return <span aria-label={label} className="xue-thinking" data-xue-loader="" role="status">
    <svg aria-hidden="true" fill="none" height="40" ref={root} viewBox="0 0 48 48" width="40">
      <path d={ribbon[0]} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  </span>;
}
