'use client';
// PDF viewer in-page (PRD §7, K11) dari komponen resmi pdfjs-dist/web/pdf_viewer
// (PDFViewer, EventBus, PDFLinkService, PDFFindController), mengikuti contoh simpleviewer.
import 'pdfjs-dist/web/pdf_viewer.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@plant/ui';
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import type { EventBus, PDFFindController, PDFViewer } from 'pdfjs-dist/web/pdf_viewer.mjs';

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
    eventBus = useRef<EventBus | null>(null),
    finder = useRef<PDFFindController | null>(null);
  const [attempt, setAttempt] = useState(0),
    [progress, setProgress] = useState<number | null>(0),
    [failure, setFailure] = useState<Failure | null>(null),
    [ready, setReady] = useState(false),
    [page, setPage] = useState(1),
    [pageInput, setPageInput] = useState('1'),
    [pages, setPages] = useState(0),
    [scale, setScale] = useState(1),
    [preset, setPreset] = useState('auto'),
    [query, setQuery] = useState(''),
    [matches, setMatches] = useState<{ current: number; total: number } | null>(null),
    [fullscreen, setFullscreen] = useState(false),
    [panning, setPanning] = useState(true);

  useEffect(() => {
    if (!url) return;
    let cancelled = false,
      task: PDFDocumentLoadingTask | null = null;
    setFailure(null);
    setReady(false);
    setProgress(0);
    setMatches(null);
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
      const find = new components.PDFFindController({ eventBus: bus, linkService: links });
      const instance = new components.PDFViewer({
        container: container.current,
        viewer: viewerElement.current,
        eventBus: bus,
        linkService: links,
        findController: find,
        removePageBorders: false,
        enableDetailCanvas: true,
        maxCanvasPixels: 16_777_216,
        enableAutoLinking: false,
        supportsPinchToZoom: true,
      });
      links.setViewer(instance);
      viewer.current = instance;
      eventBus.current = bus;
      finder.current = find;
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
      bus.on(
        'updatefindmatchescount',
        ({ matchesCount }: { matchesCount: { current: number; total: number } }) => setMatches(matchesCount),
      );
      bus.on(
        'updatefindcontrolstate',
        ({ matchesCount }: { matchesCount: { current: number; total: number } }) => setMatches(matchesCount),
      );
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
      finder.current = null;
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
  const find = (findPrevious = false, again = true) => {
    eventBus.current?.dispatch('find', {
      source: null,
      type: again ? 'again' : '',
      query,
      caseSensitive: false,
      entireWord: false,
      highlightAll: true,
      findPrevious,
      matchDiacritics: false,
    });
  };
  const rotate = () => {
    if (viewer.current) viewer.current.pagesRotation = (viewer.current.pagesRotation + 90) % 360;
  };
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await frame.current?.requestFullscreen();
    } catch {}
  };
  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === frame.current);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

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
  };
  const pointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const element = container.current;
    if (!drag.current || !element) return;
    element.scrollLeft = drag.current.left - (e.clientX - drag.current.x);
    element.scrollTop = drag.current.top - (e.clientY - drag.current.y);
  };
  const pointerUp = () => (drag.current = null);

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
      className={`pdf-frame${fullscreen ? ' is-fullscreen' : ''}`}
      style={height ? ({ '--pdf-height': height } as React.CSSProperties) : undefined}
      onKeyDown={keyDown}
    >
      <div className="pdf-toolbar" role="toolbar" aria-label={`Kontrol viewer ${title}`}>
        <div className="pdf-toolbar-group">
          <button
            type="button"
            className="icon-button"
            aria-label="Halaman sebelumnya"
            disabled={!ready || page <= 1}
            onClick={() => goTo(page - 1)}
          >
            <Icon name="chevron" style={{ transform: 'rotate(90deg)' }} />
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
            disabled={!ready || page >= pages}
            onClick={() => goTo(page + 1)}
          >
            <Icon name="chevron" style={{ transform: 'rotate(-90deg)' }} />
          </button>
        </div>
        <div className="pdf-toolbar-group">
          <button
            type="button"
            className="icon-button"
            aria-label="Perkecil"
            disabled={!ready || scale <= MIN_SCALE}
            onClick={() => zoom(-1)}
          >
            <span aria-hidden="true">−</span>
          </button>
          <select
            aria-label="Zoom"
            className="pdf-zoom"
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
            className="icon-button"
            aria-label="Perbesar"
            disabled={!ready || scale >= MAX_SCALE}
            onClick={() => zoom(1)}
          >
            <Icon name="plus" />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Putar 90 derajat"
            disabled={!ready}
            onClick={rotate}
          >
            <span aria-hidden="true">⟳</span>
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={panning ? 'Mode pilih teks' : 'Mode geser'}
            aria-pressed={!panning}
            title={panning ? 'Pilih teks' : 'Geser halaman'}
            disabled={!ready}
            onClick={() => setPanning((v) => !v)}
          >
            <span aria-hidden="true">{panning ? 'T' : '✋'}</span>
          </button>
        </div>
        <form
          className="pdf-toolbar-group pdf-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            find(false, false);
          }}
        >
          <input
            type="search"
            aria-label="Cari teks dalam PDF"
            placeholder="Cari teks"
            value={query}
            maxLength={200}
            disabled={!ready}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && matches?.total) {
                e.preventDefault();
                find(e.shiftKey);
              }
            }}
          />
          <span className="pdf-matches" aria-live="polite">
            {matches && query ? (matches.total ? `${matches.current}/${matches.total}` : '0 hasil') : ''}
          </span>
          <button
            type="button"
            className="icon-button"
            aria-label="Hasil sebelumnya"
            disabled={!matches?.total}
            onClick={() => find(true)}
          >
            <Icon name="chevron" style={{ transform: 'rotate(180deg)' }} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Hasil berikutnya"
            disabled={!matches?.total}
            onClick={() => find(false)}
          >
            <Icon name="chevron" />
          </button>
        </form>
        <div className="pdf-toolbar-group">
          <button
            type="button"
            className="icon-button"
            aria-label={fullscreen ? 'Keluar layar penuh' : 'Layar penuh'}
            onClick={() => void toggleFullscreen()}
          >
            <span aria-hidden="true">{fullscreen ? '⤡' : '⤢'}</span>
          </button>
          {url && (
            <a
              className="icon-button"
              href={url}
              target="_blank"
              rel="noopener"
              aria-label="Buka di tab baru"
            >
              <Icon name="arrow" />
            </a>
          )}
          {printUrl && (
            <a className="icon-button" href={printUrl} target="_blank" rel="noopener" aria-label="Print">
              <span aria-hidden="true">⎙</span>
            </a>
          )}
          {downloadUrl && (
            <a className="icon-button" href={downloadUrl} aria-label="Download">
              <span aria-hidden="true">⤓</span>
            </a>
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
