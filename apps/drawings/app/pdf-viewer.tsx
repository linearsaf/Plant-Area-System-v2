'use client';
import dynamic from 'next/dynamic';
import type { PdfViewerProps } from './pdf-viewer-core';
export type { PdfViewerProps };
// PDF.js runs only in the browser; no server rendering of documents (PRD §7).
const Core = dynamic(() => import('./pdf-viewer-core'), {
  ssr: false,
  loading: () => (
    <div className="pdf-frame" aria-busy="true">
      <div className="pdf-toolbar" />
      <div className="pdf-stage">
        <div className="pdf-state" role="status">
          <span className="skeleton pdf-skeleton" />
          <p className="muted">Menyiapkan viewer…</p>
        </div>
      </div>
    </div>
  ),
});
export function PdfViewer(props: PdfViewerProps) {
  return <Core {...props} />;
}
