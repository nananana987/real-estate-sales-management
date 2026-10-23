import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, MoveDiagonal2, RotateCcw, Columns2 } from 'lucide-react';

export interface ModalResizeControls {
  isMaximized: boolean;
  isCustomSize: boolean;
  width: number | null;
  height: number | null;
  toggleMaximize: () => void;
  cyclePresetSize: () => void;
  resetSize: () => void;
  renderHeaderControls: (variant?: 'dark' | 'light') => React.ReactNode;
}

interface ResizableModalProps {
  id?: string;
  backdropId?: string;
  backdropClassName?: string;
  onBackdropClick?: () => void;
  defaultWidth?: number; // px (e.g., 896 for max-w-4xl)
  defaultHeight?: number; // px (optional)
  minWidth?: number;
  minHeight?: number;
  storageKey?: string;
  className?: string;
  children: React.ReactNode | ((controls: ModalResizeControls) => React.ReactNode);
}

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export const ResizableModal: React.FC<ResizableModalProps> = ({
  id,
  backdropId,
  backdropClassName = 'z-50',
  onBackdropClick,
  defaultWidth = 896,
  defaultHeight,
  minWidth = 420,
  minHeight = 320,
  storageKey,
  className = '',
  children,
}) => {
  // Load saved size from localStorage if storageKey is provided
  const getInitialSize = (): { width: number | null; height: number | null; isMaximized: boolean } => {
    if (storageKey) {
      try {
        const raw = localStorage.getItem(`resizable_modal_${storageKey}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            return {
              width: typeof parsed.width === 'number' ? parsed.width : null,
              height: typeof parsed.height === 'number' ? parsed.height : null,
              isMaximized: !!parsed.isMaximized,
            };
          }
        }
      } catch {
        // ignore storage errors
      }
    }
    return { width: null, height: null, isMaximized: false };
  };

  const initial = getInitialSize();
  const [width, setWidth] = useState<number | null>(initial.width);
  const [height, setHeight] = useState<number | null>(initial.height);
  const [isMaximized, setIsMaximized] = useState<boolean>(initial.isMaximized);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragInfoRef = useRef<{
    dir: ResizeDirection;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  // Persist size changes when storageKey is provided
  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(
        `resizable_modal_${storageKey}`,
        JSON.stringify({ width, height, isMaximized })
      );
    } catch {
      // ignore
    }
  }, [width, height, isMaximized, storageKey]);

  const handleMouseDownResize = useCallback(
    (dir: ResizeDirection, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      setIsMaximized(false);
      setIsDragging(true);
      dragInfoRef.current = {
        dir,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: rect.width,
        startHeight: rect.height,
      };
    },
    []
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const info = dragInfoRef.current;
      if (!info) return;

      const deltaX = e.clientX - info.startX;
      const deltaY = e.clientY - info.startY;
      const maxW = window.innerWidth - 16;
      const maxH = window.innerHeight - 16;

      let newW = info.startWidth;
      let newH = info.startHeight;

      // Since modal is centered horizontally/vertically in flex container,
      // dragging one side expands symmetrically or naturally. Using * 1.5 feels natural and responsive.
      if (info.dir.includes('e')) {
        newW = Math.min(maxW, Math.max(minWidth, info.startWidth + deltaX * 1.5));
      } else if (info.dir.includes('w')) {
        newW = Math.min(maxW, Math.max(minWidth, info.startWidth - deltaX * 1.5));
      }

      if (info.dir.includes('s')) {
        newH = Math.min(maxH, Math.max(minHeight, info.startHeight + deltaY * 1.5));
      } else if (info.dir.includes('n')) {
        newH = Math.min(maxH, Math.max(minHeight, info.startHeight - deltaY * 1.5));
      }

      if (info.dir.includes('e') || info.dir.includes('w')) {
        setWidth(Math.round(newW));
      }
      if (info.dir.includes('s') || info.dir.includes('n')) {
        setHeight(Math.round(newH));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragInfoRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, minWidth, minHeight]);

  const toggleMaximize = useCallback(() => {
    setIsMaximized(prev => !prev);
  }, []);

  const cyclePresetSize = useCallback(() => {
    if (isMaximized) {
      setIsMaximized(false);
      setWidth(null);
      setHeight(null);
      return;
    }
    const maxW = window.innerWidth - 32;
    const maxH = Math.round(window.innerHeight * 0.92);
    const wideW = Math.min(maxW, Math.max(defaultWidth + 260, Math.round(window.innerWidth * 0.88)));

    if (width === null) {
      // Switch to Wide
      setWidth(wideW);
      setHeight(maxH);
    } else if (width < maxW - 40) {
      // Switch to Maximize
      setIsMaximized(true);
    } else {
      // Back to Standard
      setWidth(null);
      setHeight(null);
      setIsMaximized(false);
    }
  }, [isMaximized, width, defaultWidth]);

  const resetSize = useCallback(() => {
    setIsMaximized(false);
    setWidth(null);
    setHeight(null);
  }, []);

  const isCustomSize = isMaximized || width !== null || height !== null;

  const renderHeaderControls = useCallback(
    (variant: 'dark' | 'light' = 'light') => {
      const btnBase =
        variant === 'dark'
          ? 'text-slate-300 hover:text-white hover:bg-white/10 border-white/15'
          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 border-slate-200';

      return (
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={cyclePresetSize}
            className={`px-2 py-1 rounded text-[10px] font-semibold border flex items-center space-x-1 transition-colors cursor-pointer ${btnBase}`}
            title="ウインドウ幅を切り替え (標準 ➔ ワイド ➔ 最大化)"
          >
            <Columns2 className="w-3 h-3" />
            <span className="hidden sm:inline">
              {isMaximized ? '全画面' : width !== null ? 'ワイド' : 'サイズ切替'}
            </span>
          </button>

          {isCustomSize && (
            <button
              type="button"
              onClick={resetSize}
              className={`p-1.5 rounded transition-colors cursor-pointer ${btnBase}`}
              title="標準ウインドウサイズに戻す"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={toggleMaximize}
            className={`p-1.5 rounded transition-colors cursor-pointer ${btnBase}`}
            title={isMaximized ? '元のサイズに戻す' : 'ウインドウを最大化'}
          >
            {isMaximized ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      );
    },
    [cyclePresetSize, isCustomSize, isMaximized, resetSize, toggleMaximize, width]
  );

  const controls: ModalResizeControls = {
    isMaximized,
    isCustomSize,
    width,
    height,
    toggleMaximize,
    cyclePresetSize,
    resetSize,
    renderHeaderControls,
  };

  // Compute inline style for container dimensions
  const containerStyle: React.CSSProperties = isMaximized
    ? {
        width: 'calc(100vw - 16px)',
        maxWidth: 'calc(100vw - 16px)',
        height: 'calc(100vh - 16px)',
        maxHeight: 'calc(100vh - 16px)',
      }
    : {
        width: width ? `${width}px` : '100%',
        maxWidth: width ? 'calc(100vw - 16px)' : `${defaultWidth}px`,
        height: height ? `${height}px` : defaultHeight ? `${defaultHeight}px` : undefined,
        maxHeight: '94vh',
      };

  const modalContent = (
    <div
      id={backdropId}
      onClick={onBackdropClick}
      className={`fixed inset-0 ${backdropClassName} overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center ${
        isMaximized ? 'p-2' : 'p-3'
      } ${onBackdropClick ? 'cursor-pointer' : ''} ${isDragging ? 'select-none' : ''}`}
    >
      <div
        id={id}
        ref={containerRef}
        onClick={e => e.stopPropagation()}
        style={containerStyle}
        className={`relative bg-white rounded-lg shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 cursor-default ${className}`}
      >
        {/* Edge Resize Handles */}
        {!isMaximized && (
          <>
            {/* Top */}
            <div
              onMouseDown={e => handleMouseDownResize('n', e)}
              className="absolute top-0 left-3 right-3 h-1.5 cursor-ns-resize z-30 hover:bg-blue-500/30 transition-colors"
              title="ドラッグして高さを変更"
            />
            {/* Bottom */}
            <div
              onMouseDown={e => handleMouseDownResize('s', e)}
              className="absolute bottom-0 left-3 right-6 h-1.5 cursor-ns-resize z-30 hover:bg-blue-500/30 transition-colors"
              title="ドラッグして高さを変更"
            />
            {/* Left */}
            <div
              onMouseDown={e => handleMouseDownResize('w', e)}
              className="absolute top-3 bottom-3 left-0 w-1.5 cursor-ew-resize z-30 hover:bg-blue-500/30 transition-colors"
              title="ドラッグして幅を変更"
            />
            {/* Right */}
            <div
              onMouseDown={e => handleMouseDownResize('e', e)}
              className="absolute top-3 bottom-6 right-0 w-1.5 cursor-ew-resize z-30 hover:bg-blue-500/30 transition-colors"
              title="ドラッグして幅を変更"
            />
            {/* Top-Left Corner */}
            <div
              onMouseDown={e => handleMouseDownResize('nw', e)}
              className="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize z-40"
            />
            {/* Top-Right Corner */}
            <div
              onMouseDown={e => handleMouseDownResize('ne', e)}
              className="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize z-40"
            />
            {/* Bottom-Left Corner */}
            <div
              onMouseDown={e => handleMouseDownResize('sw', e)}
              className="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize z-40"
            />
            {/* Bottom-Right Corner with Visual Grip */}
            <div
              onMouseDown={e => handleMouseDownResize('se', e)}
              className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize z-40 flex items-end justify-end p-0.5 text-slate-400 hover:text-blue-600 transition-colors group"
              title="ドラッグしてウインドウサイズを自由に変更"
            >
              <MoveDiagonal2 className="w-3.5 h-3.5 rotate-90 opacity-60 group-hover:opacity-100" />
            </div>
          </>
        )}

        {typeof children === 'function' ? children(controls) : children}
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};
