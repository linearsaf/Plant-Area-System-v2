'use client';
// PDF viewer in-page (PRD §7, K11) dari komponen resmi pdfjs-dist/web/pdf_viewer
// (PDFViewer, EventBus, PDFLinkService), mengikuti contoh simpleviewer.
import 'pdfjs-dist/web/pdf_viewer.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon, Overlay } from '@plant/ui';
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import type { EventBus, PDFViewer } from 'pdfjs-dist/web/pdf_viewer.mjs';

export type PdfViewerProps = {
  /** Endpoint file same-origin yang mendukung Range. */
  url: string | null;
  title: string;
  /** Teks watermark overlay CSS (revisi belum final, Obsolete, Cancelled). File tidak diubah. */
  watermark?: string;
  /** Tombol download/print hanya tampil bila URL diberikan (sesuai izin). */
  downloadUrl?: string;
  printUrl?: string;
  /** Tinggi area viewer; bawaan mengikuti viewport. */
  height?: string;
};

const MIN_SCALE = 0.1,
  MAX_SCALE = 8;
const ASSETS = '/drawings/pdfjs/';
const presets = [
  { value: 'auto', label: 'Otomatis' },
  { value: 'page-width', label: 'Fit lebar' },
  { value: 'page-fit', label: 'Fit halaman' },
  { value: '1', label: '100%' },
];
type Failure = { title: string; detail: string };
function describe(error: unknown): Failure {
  const name = (error as { name?: string })?.name;
  const status = (error as { status?: number })?.status;
  if (status === 403)
    return { title: 'Akses ditolak', detail: 'Anda tidak mempunyai izin membuka file ini.' };
  if (status === 404)
    return { title: 'File tidak ditemukan', detail: 'File sudah tidak tersedia atau tautan salah.' };
  if (status === 413) return { title: 'File terlalu besar', detail: 'Ukuran file melampaui batas.' };
  if (status === 503 || status === 502 || status === 504)
    return { title: 'Penyimpanan tidak tersedia', detail: 'Layanan file sementara tidak dapat dihubungi.' };
  if (name === 'PasswordException')
    return { title: 'PDF berpassword', detail: 'PDF terenkripsi tidak dapat ditampilkan.' };
  if (name === 'InvalidPDFException')
    return { title: 'PDF rusak', detail: 'File tidak dapat dibaca sebagai PDF.' };
  return { title: 'PDF belum dapat dibuka', detail: 'Periksa koneksi lalu coba lagi.' };
}
const clampScale = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
// Not in lib.dom yet; Chromium on Android supports it while an element is fullscreen.
type LockableOrientation = ScreenOrientation & { lock?: (orientation: 'landscape') => Promise<void> };
const orientation = () =>
  typeof screen === 'undefined' ? undefined : (screen.orientation as LockableOrientation | undefined);

export default function PdfViewerCore({
  url,
  title,
  watermark,
  downloadUrl,
  printUrl,
  height,
}: PdfViewerProps) {
  const frame = useRef<HTMLDivElement>(null),
    container = useRef<HTMLDivElement>(null),
    viewerElement = useRef<HTMLDivElement>(null);
  const viewer = useRef<PDFViewer | null>(null),
    eventBus = useRef<EventBus | null>(null);
  const [attempt, setAttempt] = useState(0),
    [progress, setProgress] = useState<number | null>(0),
    [failure, setFailure] = useState<Failure | null>(null),
    [ready, setReady] = useState(false),
    [page, setPage] = useState(1),
    [pageInput, setPageInput] = useState('1'),
    [pages, setPages] = useState(0),
    [scale, setScale] = useState(1),
    [preset, setPreset] = useState('auto'),
    [nativeFullscreen, setNativeFullscreen] = useState(false),
    // iPhone Safari has no element fullscreen: the frame covers the viewport instead.
    [pseudoFullscreen, setPseudoFullscreen] = useState(false),
    [panning, setPanning] = useState(true),
    [moreOpen, setMoreOpen] = useState(false);
  const moreButton = useRef<HTMLButtonElement>(null);
  const fullscreen = nativeFullscreen || pseudoFullscreen;

  useEffect(() => {
    if (!url) return;
    let cancelled = false,
      task: PDFDocumentLoadingTask | null = null;
    setFailure(null);
    setReady(false);
    setProgress(0);
    (async () => {
      const lib = await import('pdfjs-dist');
      // pdf_viewer.mjs reads the core library from globalThis.pdfjsLib.
      (globalThis as unknown as { pdfjsLib: typeof lib }).pdfjsLib = lib;
      const components = await import('pdfjs-dist/web/pdf_viewer.mjs');
      if (cancelled || !container.current || !viewerElement.current) return;
      lib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).toString();
      const bus = new components.EventBus();
      const links = new components.PDFLinkService({ eventBus: bus });
      const instance = new components.PDFViewer({
        container: container.current,
        viewer: viewerElement.current,
        eventBus: bus,
        linkService: links,
        // Tanpa border 9px dan padding scrollbar 40px bawaan, "Fit lebar" memakai lebar penuh viewer.
        removePageBorders: true,
        enableDetailCanvas: true,
        maxCanvasPixels: 16_777_216,
        enableAutoLinking: false,
        supportsPinchToZoom: true,
      });
      links.setViewer(instance);
      viewer.current = instance;
      eventBus.current = bus;
      bus.on('pagesinit', () => {
        instance.currentScaleValue = 'auto';
        setPages(instance.pagesCount);
        setReady(true);
        setProgress(null);
      });
      bus.on('pagechanging', ({ pageNumber }: { pageNumber: number }) => {
        setPage(pageNumber);
        setPageInput(String(pageNumber));
      });
      bus.on('scalechanging', ({ scale: value, presetValue }: { scale: number; presetValue?: string }) => {
        setScale(value);
        setPreset(presetValue && presets.some((p) => p.value === presetValue) ? presetValue : '');
      });
      task = lib.getDocument({
        url,
        cMapUrl: ASSETS + 'cmaps/',
        cMapPacked: true,
        standardFontDataUrl: ASSETS + 'standard_fonts/',
        wasmUrl: ASSETS + 'wasm/',
        iccUrl: ASSETS + 'iccs/',
        enableXfa: false,
        withCredentials: true,
      });
      task.onProgress = ({ loaded, total }: { loaded: number; total: number }) => {
        if (!cancelled && total) setProgress(Math.min(100, Math.round((loaded / total) * 100)));
      };
      const doc = await task.promise;
      if (cancelled) return;
      instance.setDocument(doc);
      links.setDocument(doc, null);
    })().catch((error) => {
      if (!cancelled) {
        setFailure(describe(error));
        setProgress(null);
      }
    });
    return () => {
      cancelled = true;
      viewer.current?.setDocument(null as unknown as PDFDocumentProxy);
      viewer.current?.cleanup();
      viewer.current = null;
      eventBus.current = null;
      // Destroying the loading task also destroys the document and its worker.
      void task?.destroy();
      if (viewerElement.current) viewerElement.current.replaceChildren();
    };
  }, [url, attempt]);

  const zoom = useCallback((steps: number, origin?: [number, number]) => {
    const instance = viewer.current;
    if (!instance) return;
    const target = clampScale(instance.currentScale * Math.pow(1.1, steps));
    if (target === instance.currentScale) return;
    instance.updateScale({ scaleFactor: target / instance.currentScale, origin });
  }, []);
  const setZoom = (value: string) => {
    const instance = viewer.current;
    if (!instance || !value) return;
    instance.currentScaleValue = value;
  };
  const goTo = (value: number) => {
    const instance = viewer.current;
    if (!instance || !pages) return;
    instance.currentPageNumber = Math.min(pages, Math.max(1, Math.round(value)));
  };
  const rotate = () => {
    if (viewer.current) viewer.current.pagesRotation = (viewer.current.pagesRotation + 90) % 360;
  };
  // Drawings are mostly landscape sheets: on a phone, fullscreen turns the screen sideways.
  const lockLandscape = async () => {
    const viewport = viewer.current?.getPageView(page - 1)?.viewport;
    if (!viewport || viewport.width <= viewport.height || !matchMedia('(pointer: coarse)').matches) return;
    try {
      await orientation()?.lock?.('landscape');
    } catch {}
  };
  const toggleFullscreen = async () => {
    if (pseudoFullscreen) return setPseudoFullscreen(false);
    try {
      if (document.fullscreenElement) return await document.exitFullscreen();
      if (document.fullscreenEnabled && frame.current?.requestFullscreen) {
        await frame.current.requestFullscreen({ navigationUI: 'hide' });
        return await lockLandscape();
      }
    } catch {}
    setPseudoFullscreen(true);
  };
  useEffect(() => {
    const update = () => {
      const active = document.fullscreenElement === frame.current;
      setNativeFullscreen(active);
      if (!active)
        try {
          orientation()?.unlock();
        } catch {}
    };
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);
  useEffect(() => {
    if (!pseudoFullscreen) return;
    const root = document.documentElement,
      previous = root.style.overflow;
    root.style.overflow = 'hidden';
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPseudoFullscreen(false);
    };
    document.addEventListener('keydown', escape);
    return () => {
      root.style.overflow = previous;
      document.removeEventListener('keydown', escape);
    };
  }, [pseudoFullscreen]);

  // Keep preset zoom (auto / fit) correct when the container changes size (layout, rotation, fullscreen).
  const presetRef = useRef(preset);
  presetRef.current = preset;
  useEffect(() => {
    // Observe the fixed-size stage, not the scroll container: the container's content box shrinks when
    // its scrollbar appears, and refitting on that change toggles the scrollbar again in an endless loop.
    const element = container.current?.parentElement;
    if (!element || !ready) return;
    let frameId = 0,
      lastWidth = -1,
      lastHeight = -1;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      // A hidden viewer (phone "Info & Revisi" tab) has no box to fit; refit once it is shown again.
      if (!width || !height || (width === lastWidth && height === lastHeight)) return;
      lastWidth = width;
      lastHeight = height;
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const value = presetRef.current;
        if (viewer.current && value && value !== '1') viewer.current.currentScaleValue = value;
      });
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, [ready]);

  // Ctrl/Cmd + wheel (and trackpad pinch, reported as ctrl+wheel) zooms around the cursor.
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const wheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !viewer.current) return;
      e.preventDefault();
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoom(-delta / 100, [e.clientX, e.clientY]);
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [zoom, ready]);

  // Two-finger pinch on touch screens, centred between the fingers.
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let start: { distance: number; scale: number } | null = null;
    const distance = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const touchstart = (e: TouchEvent) => {
      if (e.touches.length === 2 && viewer.current)
        start = { distance: distance(e.touches), scale: viewer.current.currentScale };
    };
    const touchmove = (e: TouchEvent) => {
      const instance = viewer.current;
      if (!start || e.touches.length !== 2 || !instance) return;
      e.preventDefault();
      const target = clampScale(start.scale * (distance(e.touches) / start.distance));
      const origin: [number, number] = [
        (e.touches[0].clientX + e.touches[1].clientX) / 2,
        (e.touches[0].clientY + e.touches[1].clientY) / 2,
      ];
      instance.updateScale({ scaleFactor: target / instance.currentScale, origin, drawingDelay: 200 });
    };
    const touchend = () => (start = null);
    element.addEventListener('touchstart', touchstart, { passive: true });
    element.addEventListener('touchmove', touchmove, { passive: false });
    element.addEventListener('touchend', touchend);
    return () => {
      element.removeEventListener('touchstart', touchstart);
      element.removeEventListener('touchmove', touchmove);
      element.removeEventListener('touchend', touchend);
    };
  }, [ready]);

  // Drag to pan in hand mode when the page overflows. Text selection uses the select mode.
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const pointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const element = container.current;
    if (!panning || !element || e.pointerType === 'touch' || e.button !== 0) return;
    if (element.scrollWidth <= element.clientWidth && element.scrollHeight <= element.clientHeight) return;
    drag.current = { x: e.clientX, y: e.clientY, left: element.scrollLeft, top: element.scrollTop };
    element.setPointerCapture(e.pointerId);
    // Toolbar mengambang meredup selama drag agar tepi bawah drawing tetap terlihat.
    frame.current?.classList.add('is-dragging');
  };
  const pointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const element = container.current;
    if (!drag.current || !element) return;
    element.scrollLeft = drag.current.left - (e.clientX - drag.current.x);
    element.scrollTop = drag.current.top - (e.clientY - drag.current.y);
  };
  const pointerUp = () => {
    drag.current = null;
    frame.current?.classList.remove('is-dragging');
  };

  // Keyboard shortcuts apply only while focus is inside the viewer; Ctrl/Cmd+K and +B stay with the shell.
  const keyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('input, select, textarea')) return;
    if (e.altKey || ((e.ctrlKey || e.metaKey) && !['+', '=', '-', '0'].includes(e.key))) return;
    const handled = () => e.preventDefault();
    switch (e.key) {
      case '+':
      case '=':
        zoom(1);
        return handled();
      case '-':
        zoom(-1);
        return handled();
      case '0':
        setZoom('1');
        return handled();
      case 'PageDown':
        goTo(page + 1);
        return handled();
      case 'PageUp':
        goTo(page - 1);
        return handled();
      case 'Home':
        goTo(1);
        return handled();
      case 'End':
        goTo(pages);
        return handled();
    }
  };

  const percent = Math.round(scale * 100);
  return (
    <div
      ref={frame}
      className={`pdf-frame${fullscreen ? ' is-fullscreen' : ''}${pseudoFullscreen ? ' is-pseudo-fullscreen' : ''}`}
      style={height ? ({ '--pdf-height': height } as React.CSSProperties) : undefined}
      onKeyDown={keyDown}
    >
      <div className="pdf-toolbar" role="toolbar" aria-label={`Kontrol viewer ${title}`}>
        <div className="pdf-toolbar-group pdf-nav">
          <button
            type="button"
            className="icon-button"
            aria-label="Halaman sebelumnya"
            title="Halaman sebelumnya (PageUp)"
            disabled={!ready || page <= 1}
            onClick={() => goTo(page - 1)}
          >
            <Icon name="chevron" style={{ transform: 'rotate(-90deg)' }} />
          </button>
          <label className="pdf-page">
            <span className="sr-only">Nomor halaman</span>
            <input
              inputMode="numeric"
              aria-label="Nomor halaman"
              value={pageInput}
              disabled={!ready}
              onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') goTo(Number(pageInput) || page);
              }}
              onBlur={() => setPageInput(String(page))}
            />
            <span aria-live="polite">/ {pages || '–'}</span>
          </label>
          <button
            type="button"
            className="icon-button"
            aria-label="Halaman berikutnya"
            title="Halaman berikutnya (PageDown)"
            disabled={!ready || page >= pages}
            onClick={() => goTo(page + 1)}
          >
            <Icon name="chevron" style={{ transform: 'rotate(90deg)' }} />
          </button>
        </div>
        <div className="pdf-toolbar-group pdf-tools">
          <button
            type="button"
            className="icon-button pdf-pointer-only"
            aria-label="Perkecil"
            title="Perkecil (−)"
            disabled={!ready || scale <= MIN_SCALE}
            onClick={() => zoom(-1)}
          >
            <Icon name="minus" />
          </button>
          <select
            aria-label="Zoom"
            className="pdf-zoom pdf-pointer-only"
            value={preset}
            disabled={!ready}
            onChange={(e) => setZoom(e.target.value)}
          >
            {!preset && <option value="">{percent}%</option>}
            {presets.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="icon-button pdf-pointer-only"
            aria-label="Perbesar"
            title="Perbesar (+)"
            disabled={!ready || scale >= MAX_SCALE}
            onClick={() => zoom(1)}
          >
            <Icon name="plus" />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Putar 90 derajat"
            title="Putar 90 derajat"
            disabled={!ready}
            onClick={rotate}
          >
            <Icon name="rotate" />
          </button>
          <button
            type="button"
            className="icon-button pdf-pointer-only"
            aria-label="Mode geser"
            aria-pressed={panning}
            title="Geser halaman"
            disabled={!ready}
            onClick={() => setPanning((v) => !v)}
          >
            <Icon name="move" />
          </button>
        </div>
        <div className="pdf-toolbar-group pdf-actions">
          {url && (
            <a
              className="icon-button pdf-wide-only"
              href={url}
              target="_blank"
              rel="noopener"
              aria-label="Buka di tab baru"
              title="Buka di tab baru"
            >
              <Icon name="external" />
            </a>
          )}
          {printUrl && (
            <a
              className="icon-button pdf-wide-only"
              href={printUrl}
              target="_blank"
              rel="noopener"
              aria-label="Print"
              title="Print"
            >
              <Icon name="print" />
            </a>
          )}
          {downloadUrl && (
            <a className="icon-button" href={downloadUrl} aria-label="Download" title="Download">
              <Icon name="download" />
            </a>
          )}
          <button
            type="button"
            className="icon-button"
            aria-label={fullscreen ? 'Keluar layar penuh' : 'Layar penuh'}
            title={fullscreen ? 'Keluar layar penuh' : 'Layar penuh'}
            onClick={() => void toggleFullscreen()}
          >
            <Icon name={fullscreen ? 'shrink' : 'expand'} />
          </button>
          {/* Narrow viewers: rarely used file actions sit behind one button so the toolbar stays one row. */}
          {url && (
            <>
              <button
                ref={moreButton}
                type="button"
                className="icon-button pdf-narrow-only"
                aria-label="Aksi file lain"
                aria-haspopup="menu"
                aria-expanded={moreOpen}
                title="Aksi file lain"
                onClick={() => setMoreOpen(true)}
              >
                <Icon name="more" strokeWidth={3} />
              </button>
              <Overlay
                open={moreOpen}
                onClose={() => setMoreOpen(false)}
                title="Aksi file lain"
                kind="menu"
                placement="bottom-end"
                anchor={moreButton}
                hideTitle
              >
                <div className="menu-list" role="menu" aria-label="Aksi file lain">
                  <a
                    className="menu-item"
                    role="menuitem"
                    href={url}
                    target="_blank"
                    rel="noopener"
                    onClick={() => setMoreOpen(false)}
                  >
                    <Icon name="external" />
                    <span>Buka di tab baru</span>
                  </a>
                  {printUrl && (
                    <a
                      className="menu-item"
                      role="menuitem"
                      href={printUrl}
                      target="_blank"
                      rel="noopener"
                      onClick={() => setMoreOpen(false)}
                    >
                      <Icon name="print" />
                      <span>Print</span>
                    </a>
                  )}
                </div>
              </Overlay>
            </>
          )}
        </div>
      </div>
      <div className="pdf-stage">
        <div
          ref={container}
          className={`pdf-container${panning ? ' is-panning' : ''}`}
          tabIndex={0}
          aria-label={`Dokumen ${title}`}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
        >
          <div ref={viewerElement} className="pdfViewer" />
        </div>
        {watermark && ready && (
          <div className="pdf-watermark" aria-hidden="true">
            <span>{watermark}</span>
          </div>
        )}
        {!url && (
          <div className="pdf-state">
            <strong>Belum ada file</strong>
            <p className="muted">Revisi ini belum mempunyai PDF.</p>
          </div>
        )}
        {url && !ready && !failure && (
          <div className="pdf-state" role="status" aria-live="polite">
            <span className="skeleton pdf-skeleton" />
            <p className="muted">Memuat PDF{progress ? ` ${progress}%` : '…'}</p>
            {!!progress && (
              <div
                className="progress-track"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <i style={{ transform: `scaleX(${progress / 100})` }} />
              </div>
            )}
          </div>
        )}
        {failure && (
          <div className="pdf-state" role="alert">
            <strong>{failure.title}</strong>
            <p className="muted">{failure.detail}</p>
            <button type="button" className="button secondary" onClick={() => setAttempt((v) => v + 1)}>
              Coba lagi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
