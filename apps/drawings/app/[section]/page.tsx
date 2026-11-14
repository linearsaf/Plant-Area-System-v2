import { notFound } from 'next/navigation';
import { pageIdentity } from '@plant/server';
import { canOpenDrawingsSection, drawingsSections } from '@plant/contracts';
import { Shell, Heading, EmptyState } from '@plant/ui';
import { maxPdfBytes } from '@plant/drawings-core';
import { PdfUpload } from '../pdf-upload';
export const dynamic = 'force-dynamic';
const pages: Record<string, { title: string; description: string }> = {
  library: {
    title: 'Drawing Library',
    description:
      'Cari Final Drawing dan drawing yang sedang diproses berdasarkan nomor, nama, HAC/SAC atau area.',
  },
  tasks: {
    title: 'Tugas saya',
    description: 'Draft, pemeriksaan, dan approval yang menunggu tindakan Anda.',
  },
  requests: {
    title: 'Drawing Requests',
    description: 'Permintaan drawing baru beserta status review dan pengerjaannya.',
  },
  new: { title: 'Create Drawing', description: 'Buat drawing baru sebagai draft lalu kirim ke Check.' },
  legacy: {
    title: 'Upload Old Drawing',
    description: 'Unggah drawing lama sebagai Final Drawing berlabel Legacy Ready.',
  },
  manage: { title: 'Pengelolaan', description: 'Kelola master Area dan Discipline Drawing Database.' },
  audit: {
    title: 'Audit',
    description: 'Telusuri perubahan drawing, revisi, file dan master beserta pencatatnya.',
  },
};
export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!drawingsSections.includes(section) || !pages[section]) notFound();
  const identity = await pageIdentity(`/drawings/${section}`);
  const page = pages[section];
  return (
    <Shell identity={identity} active="drawings" activePath={`/drawings/${section}`}>
      <Heading eyebrow="Drawing Database" title={page.title} description={page.description} />
      {canOpenDrawingsSection(identity, section) ? (
        section === 'new' || section === 'legacy' ? (
          <section className="panel">
            <h2>File PDF</h2>
            <p className="fine">
              PDF diperiksa server (format, halaman, enkripsi, uji stamp) lalu disimpan sebagai file sementara
              milik Anda selama 24 jam. Isian data drawing tersedia pada tahap berikutnya.
            </p>
            <PdfUpload maxMb={maxPdfBytes() / 1024 / 1024} />
          </section>
        ) : (
          <section className="panel">
            <EmptyState
              title="Halaman sedang disiapkan"
              description="Fitur ini tersedia pada tahap implementasi berikutnya."
            />
          </section>
        )
      ) : (
        <p className="notice error" role="alert">
          Anda tidak memiliki akses untuk halaman ini.
        </p>
      )}
    </Shell>
  );
}
