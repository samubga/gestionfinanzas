import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Minus, MoveHorizontal, Plus, RotateCcw } from 'lucide-react';

interface ChartViewportProps {
  children: React.ReactNode;
  label: string;
  heightClassName?: string;
  className?: string;
  maxZoom?: number;
  minContentWidth?: number;
  showZoomControls?: boolean;
}

const ZOOM_STEP = 0.25;

/**
 * A touch-friendly viewport shared by the application's analytical charts.
 * Zoom increases the chart's real drawing width, so labels and data points gain
 * detail instead of merely applying a blurry CSS transform.
 */
const ChartViewport: React.FC<ChartViewportProps> = ({
  children,
  label,
  heightClassName = 'h-[22rem] sm:h-72',
  className = '',
  maxZoom = 3,
  minContentWidth,
  showZoomControls = true,
}) => {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);

  const applyZoom = useCallback((nextZoom: number) => {
    const viewport = viewportRef.current;
    const previousZoom = zoom;
    const boundedZoom = Math.max(1, Math.min(maxZoom, Math.round(nextZoom * 100) / 100));
    if (boundedZoom === previousZoom) return;

    const centerRatio = viewport
      ? (viewport.scrollLeft + viewport.clientWidth / 2) / Math.max(viewport.scrollWidth, 1)
      : 0.5;

    setZoom(boundedZoom);
    requestAnimationFrame(() => {
      const currentViewport = viewportRef.current;
      if (!currentViewport) return;
      currentViewport.scrollLeft = Math.max(0, (currentViewport.scrollWidth * centerRatio) - (currentViewport.clientWidth / 2));
    });
  }, [maxZoom, zoom]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 640px)');
    const updateViewport = () => setIsMobileViewport(mediaQuery.matches);
    updateViewport();
    mediaQuery.addEventListener('change', updateViewport);
    return () => mediaQuery.removeEventListener('change', updateViewport);
  }, []);

  useEffect(() => {
    if (!isFullscreen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  const pointerDistance = () => {
    const points = Array.from(pointersRef.current.values());
    if (points.length < 2) return null;
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!showZoomControls || event.pointerType !== 'touch') return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    const distance = pointerDistance();
    if (distance) pinchRef.current = { distance, zoom };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const distance = pointerDistance();
    if (!distance || !pinchRef.current) return;
    applyZoom(pinchRef.current.zoom * (distance / pinchRef.current.distance));
  };

  const releasePointer = (event: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
  };

  const controls = (
    <div className="flex min-h-10 items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
        <MoveHorizontal size={13} className="shrink-0" />
        <span className="truncate">{showZoomControls ? (zoom > 1 ? 'Desliza para explorar' : 'Pellizca o amplía') : 'Desliza para explorar'}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200/80 bg-white/90 p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
        {showZoomControls && (
          <>
            <button
              type="button"
              onClick={() => applyZoom(zoom - ZOOM_STEP)}
              disabled={zoom <= 1}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label={`Alejar ${label}`}
              title="Alejar"
            >
              <Minus size={15} />
            </button>
            <span className="min-w-11 text-center text-[10px] font-black tabular-nums text-slate-600 dark:text-slate-300" aria-live="polite">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => applyZoom(zoom + ZOOM_STEP)}
              disabled={zoom >= maxZoom}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label={`Ampliar ${label}`}
              title="Ampliar"
            >
              <Plus size={15} />
            </button>
            <button
              type="button"
              onClick={() => applyZoom(1)}
              disabled={zoom === 1}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label={`Restablecer zoom de ${label}`}
              title="Restablecer zoom"
            >
              <RotateCcw size={14} />
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => setIsFullscreen(value => !value)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition hover:bg-brand-100 dark:bg-brand-950/40 dark:text-brand-300 dark:hover:bg-brand-900/50"
          aria-label={isFullscreen ? `Salir de pantalla completa: ${label}` : `Ver ${label} a pantalla completa`}
          title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
        >
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      </div>
    </div>
  );

  return (
    <section
      className={isFullscreen
        ? 'fixed inset-0 z-[80] flex flex-col bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:bg-slate-950 sm:p-5'
        : `w-full ${className}`}
      role={isFullscreen ? 'dialog' : undefined}
      aria-modal={isFullscreen ? true : undefined}
      aria-label={isFullscreen ? `${label} a pantalla completa` : undefined}
    >
      {isFullscreen && (
        <div className="mb-2 min-w-0">
          <p className="truncate text-xs font-black text-slate-800 dark:text-white">{label}</p>
        </div>
      )}
      {controls}
      <div
        ref={viewportRef}
        className={`chart-scroll-area mt-2 overflow-auto overscroll-contain rounded-xl ${isFullscreen ? 'min-h-0 flex-1' : heightClassName}`}
        style={{ touchAction: 'pan-x pan-y' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={releasePointer}
        onPointerCancel={releasePointer}
        onWheel={(event) => {
          if (!showZoomControls || (!event.ctrlKey && !event.metaKey)) return;
          event.preventDefault();
          applyZoom(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
        }}
      >
        <div
          className="relative h-full min-h-full transition-[width] duration-150 ease-out"
          style={{
            width: minContentWidth && isMobileViewport
              ? `max(${zoom * 100}%, ${Math.round(minContentWidth * zoom)}px)`
              : `${zoom * 100}%`,
            minWidth: '100%',
          }}
        >
          {children}
        </div>
      </div>
    </section>
  );
};

export default ChartViewport;
