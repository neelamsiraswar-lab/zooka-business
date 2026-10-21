import React, { useState, useEffect, useRef } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

interface FullScreenButtonProps {
  /** Optional explicit mode: 'modal' targets closest fixed modal; 'component' targets closest view/section container */
  mode?: 'auto' | 'modal' | 'component';
  /** Optional show text label alongside icon */
  showLabel?: boolean;
  /** Optional custom className */
  className?: string;
  /** Optional title override */
  title?: string;
}

/**
 * Reusable Full Screen View Toggle Button for any Component, Popup, or Modal.
 */
export const FullScreenButton: React.FC<FullScreenButtonProps> = ({
  mode = 'auto',
  showLabel = false,
  className = '',
  title,
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const targetBoxRef = useRef<HTMLElement | null>(null);
  const backdropRef = useRef<HTMLElement | null>(null);

  const resolveTargets = (btn: HTMLButtonElement) => {
    const modalBackdrop = btn.closest('.fixed.inset-0') as HTMLElement | null;
    if ((mode === 'auto' || mode === 'modal') && modalBackdrop) {
      let modalCard = btn.closest('[role="dialog"]') as HTMLElement | null;
      if (!modalCard) {
        for (let i = 0; i < modalBackdrop.children.length; i++) {
          const child = modalBackdrop.children[i] as HTMLElement;
          if (child.contains(btn)) {
            modalCard = child;
            break;
          }
        }
      }
      return {
        isModal: true,
        backdrop: modalBackdrop,
        targetBox: modalCard || (modalBackdrop.firstElementChild as HTMLElement | null),
      };
    }

    const explicitContainer = btn.closest('[data-fs-container]') as HTMLElement | null;
    if (explicitContainer) {
      return { isModal: false, backdrop: null, targetBox: explicitContainer };
    }

    const mainEl = btn.closest('main');
    if (mainEl) {
      for (let i = 0; i < mainEl.children.length; i++) {
        const child = mainEl.children[i] as HTMLElement;
        if (child.contains(btn)) {
          return { isModal: false, backdrop: null, targetBox: child };
        }
      }
    }

    const fallbackSection = (btn.closest('.space-y-6, .space-y-5, .space-y-4') ||
      btn.parentElement?.parentElement?.parentElement) as HTMLElement | null;
    return { isModal: false, backdrop: null, targetBox: fallbackSection };
  };

  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const { targetBox } = resolveTargets(btn);
    if (targetBox) {
      targetBox.setAttribute('data-fs-bound', 'true');
    }
    return () => {
      if (targetBoxRef.current) {
        targetBoxRef.current.classList.remove('fs-modal-expanded', 'fs-component-expanded');
      }
      if (backdropRef.current) {
        backdropRef.current.classList.remove('fs-backdrop-expanded');
      }
    };
  }, []);

  useEffect(() => {
    if (!isFullScreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const target = targetBoxRef.current;
        if (!target) return;
        if (target.classList.contains('fs-component-expanded')) {
          const anyModal = document.querySelector('.fixed.inset-0');
          if (!anyModal) {
            target.classList.remove('fs-component-expanded');
            setIsFullScreen(false);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const btn = btnRef.current;
    if (!btn) return;

    const { isModal, backdrop, targetBox } = resolveTargets(btn);
    if (!targetBox) return;

    targetBoxRef.current = targetBox;
    backdropRef.current = backdrop;

    const nextState = !isFullScreen;
    setIsFullScreen(nextState);

    if (isModal) {
      if (nextState) {
        backdrop?.classList.add('fs-backdrop-expanded');
        targetBox.classList.add('fs-modal-expanded');
      } else {
        backdrop?.classList.remove('fs-backdrop-expanded');
        targetBox.classList.remove('fs-modal-expanded');
      }
    } else {
      if (nextState) {
        targetBox.classList.add('fs-component-expanded');
      } else {
        targetBox.classList.remove('fs-component-expanded');
      }
    }
  };

  const buttonTitle =
    title || (isFullScreen ? 'Exit Full Screen View' : 'Full Screen View');

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={handleToggle}
      data-fs-toggle="true"
      title={buttonTitle}
      aria-label={buttonTitle}
      className={
        className ||
        `inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer shrink-0 print:hidden border ${
          isFullScreen
            ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500/30 shadow-sm'
            : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/80'
        }`
      }
    >
      {isFullScreen ? (
        <Minimize2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
      ) : (
        <Maximize2 className="w-3.5 h-3.5 shrink-0" />
      )}
      {showLabel && (
        <span className="hidden sm:inline">{isFullScreen ? 'Exit Full Screen' : 'Full Screen'}</span>
      )}
    </button>
  );
};

const MAXIMIZE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`;
const MINIMIZE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-teal-400"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`;

/**
 * React-safe fallback enhancer that ensures any dynamically opened popup/modal or view
 * that does not yet have a [data-fs-toggle="true"] button receives a non-intrusive Full Screen View button
 * without ever moving or reparenting React-managed DOM nodes.
 */
export const UniversalFullScreenEnhancer: React.FC = () => {
  useEffect(() => {
    const enhanceDom = () => {
      // 1. Check all fixed modal/popup overlays
      const modalOverlays = document.querySelectorAll<HTMLElement>('div.fixed.inset-0');
      modalOverlays.forEach((backdrop) => {
        if (backdrop.children.length === 0) return;
        // Skip mobile sidebar overlay (which has aside or backdrop click only)
        if (backdrop.tagName !== 'DIV') return;
        const dialogBox = backdrop.firstElementChild as HTMLElement | null;
        if (!dialogBox || dialogBox.tagName !== 'DIV') return;
        // Skip pure backdrop divs with no content
        if (dialogBox.children.length === 0 && !dialogBox.textContent?.trim()) return;

        // Skip if already has a full screen toggle button inside this dialogBox
        if (dialogBox.querySelector('[data-fs-toggle="true"]')) return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('data-fs-toggle', 'true');
        btn.title = 'Full Screen View';
        btn.setAttribute('aria-label', 'Full Screen View');
        btn.className =
          'inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer shrink-0 print:hidden border bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700 shadow-sm';
        btn.innerHTML = `${MAXIMIZE_SVG}<span class="hidden sm:inline">Full Screen</span>`;

        const updateModalBtnUI = (expanded: boolean) => {
          btn.title = expanded ? 'Exit Full Screen View' : 'Full Screen View';
          btn.className = `inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer shrink-0 print:hidden border ${
            expanded
              ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500/30 shadow-sm'
              : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700 shadow-sm'
          }`;
          btn.innerHTML = `${expanded ? MINIMIZE_SVG : MAXIMIZE_SVG}<span class="hidden sm:inline">${
            expanded ? 'Exit Full Screen' : 'Full Screen'
          }</span>`;
        };

        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const isExpanded = dialogBox.classList.toggle('fs-modal-expanded');
          backdrop.classList.toggle('fs-backdrop-expanded', isExpanded);
          updateModalBtnUI(isExpanded);
        });

        // Append safely without moving any React child nodes
        const headerBar = dialogBox.firstElementChild as HTMLElement | null;
        if (headerBar && headerBar.classList.contains('justify-between')) {
          const lastChild = headerBar.lastElementChild as HTMLElement | null;
          if (lastChild && lastChild.tagName === 'DIV') {
            lastChild.insertBefore(btn, lastChild.firstChild);
            return;
          }
        }

        // Otherwise, append a non-intrusive top-right bar or badge inside dialogBox
        const bar = document.createElement('div');
        bar.setAttribute('data-fs-injected-bar', 'true');
        bar.className = 'flex items-center justify-end px-4 pt-3 pb-1 shrink-0 print:hidden';
        bar.appendChild(btn);
        dialogBox.insertBefore(bar, dialogBox.firstChild);
      });

      // 2. Check all main view containers inside <main> or [data-fs-container]
      const viewContainers = document.querySelectorAll<HTMLElement>('main > div, [data-fs-container]');
      viewContainers.forEach((container) => {
        if (container.querySelector('[data-fs-toggle="true"]')) return;
        if (container.children.length === 0) return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('data-fs-toggle', 'true');
        btn.title = 'Full Screen View';
        btn.setAttribute('aria-label', 'Full Screen View');
        btn.className =
          'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer shrink-0 print:hidden border bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/80';
        btn.innerHTML = `${MAXIMIZE_SVG}<span class="hidden sm:inline">Full Screen</span>`;

        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const isExpanded = container.classList.toggle('fs-component-expanded');
          btn.title = isExpanded ? 'Exit Full Screen View' : 'Full Screen View';
          btn.className = `inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer shrink-0 print:hidden border ${
            isExpanded
              ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500/30 shadow-sm'
              : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/80'
          }`;
          btn.innerHTML = `${isExpanded ? MINIMIZE_SVG : MAXIMIZE_SVG}<span class="hidden sm:inline">${
            isExpanded ? 'Exit Full Screen' : 'Full Screen'
          }</span>`;
        });

        const firstHeader = container.firstElementChild as HTMLElement | null;
        if (firstHeader && firstHeader.classList.contains('justify-between')) {
          const rightGroup = firstHeader.lastElementChild as HTMLElement | null;
          if (rightGroup && rightGroup.tagName === 'DIV') {
            rightGroup.appendChild(btn);
            return;
          }
        }

        const bar = document.createElement('div');
        bar.setAttribute('data-fs-injected-bar', 'true');
        bar.className = 'flex items-center justify-end pb-2 print:hidden';
        bar.appendChild(btn);
        container.insertBefore(bar, container.firstChild);
      });
    };

    enhanceDom();

    const observer = new MutationObserver(() => {
      enhanceDom();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
};
