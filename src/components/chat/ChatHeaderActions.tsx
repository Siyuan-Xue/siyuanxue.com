import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { site } from '../../data/site';
import { bindHeaderActions } from '../../utils/headerActions';
import type { Locale } from '../../i18n/types';

export function ChatHeaderActions({ locale, children }: { locale: Locale; children: ReactNode }) {
 const root = useRef<HTMLDivElement>(null);
 useEffect(() => root.current ? bindHeaderActions(root.current) : undefined, []);
 const show = site.ui.showActions[locale];
 return <div className="header-controls" data-header-actions="" data-actions-expanded="false" ref={root}>
  <div className="header-actions-panel" id="header-actions" data-actions-panel=""><div className="header-actions-row">{children}</div></div>
  <button type="button" className="header-control-button header-actions-toggle" data-actions-toggle="" aria-expanded="false" aria-controls="header-actions" aria-label={show} title={show} data-show-label={show} data-hide-label={site.ui.hideActions[locale]}>
   <ChevronLeft className="header-actions-open-icon" size={20} strokeWidth={1.8} aria-hidden="true" />
   <ChevronRight className="header-actions-close-icon" size={20} strokeWidth={1.8} aria-hidden="true" />
  </button>
 </div>;
}
