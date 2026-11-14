'use client';
import { useState } from 'react';
import { Button, Input, Toast } from '@plant/ui';
import type { DrawingsMasters, MasterItem } from '@plant/contracts';
import { getJson, sendJson } from './client-api';

const kinds = [
  { id: 'areas', label: 'Area', hint: 'Area dimulai kosong. Tambahkan area pabrik sebelum drawing dibuat.' },
  { id: 'disciplines', label: 'Discipline', hint: 'Discipline wajib dipilih saat Submit.' },
] as const;

/** Master Area/Discipline. Nonaktifkan, bukan hapus: data lama tetap menampilkan nilainya. */
export function MastersManager({ initial }: { initial: DrawingsMasters }) {
  const [masters, setMasters] = useState(initial),
    [names, setNames] = useState({ areas: '', disciplines: '' }),
    [busy, setBusy] = useState(''),
    [error, setError] = useState(''),
    [toast, setToast] = useState('');
  const reload = async () => setMasters(await getJson<DrawingsMasters>('masters'));
  async function act(id: string, task: () => Promise<unknown>, success: string) {
    setBusy(id);
    setError('');
    try {
      await task();
      await reload();
      setToast(success);
    } catch (e) {
      setError((e as Error).message);
      await reload().catch(() => undefined);
    } finally {
      setBusy('');
    }
  }
  return (
    <>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <div className="masters-grid">
        {kinds.map((k) => (
          <section className="panel" key={k.id} aria-label={k.label}>
            <h2>{k.label}</h2>
            <p className="fine">{k.hint}</p>
            <form
              className="master-add"
              onSubmit={(e) => {
                e.preventDefault();
                void act(
                  'add-' + k.id,
                  async () => {
                    const items = masters[k.id];
                    await sendJson('POST', `masters/${k.id}`, {
                      name: names[k.id],
                      sortOrder: items.reduce((m, x) => Math.max(m, x.sortOrder), 0) + 10,
                    });
                    setNames((n) => ({ ...n, [k.id]: '' }));
                  },
                  `${k.label} ditambahkan.`,
                );
              }}
            >
              <label>
                <span className="sr-only">Nama {k.label} baru</span>
                <Input
                  required
                  maxLength={100}
                  placeholder={`Nama ${k.label} baru`}
                  value={names[k.id]}
                  onChange={(e) => setNames((n) => ({ ...n, [k.id]: e.target.value }))}
                />
              </label>
              <Button className="primary" busy={busy === 'add-' + k.id}>
                Tambah
              </Button>
            </form>
            {!masters[k.id].length ? (
              <p className="muted">Belum ada {k.label}.</p>
            ) : (
              <ul className="revision-list">
                {masters[k.id].map((m: MasterItem) => (
                  <li key={m.id} className="revision-row">
                    <span className="master-name">{m.name}</span>
                    {!m.active && <span className="badge neutral">Nonaktif</span>}
                    <Button
                      className="small secondary"
                      busy={busy === m.id}
                      onClick={() =>
                        void act(
                          m.id,
                          () =>
                            sendJson('PATCH', `masters/${k.id}/${m.id}`, {
                              expectedVersion: m.version,
                              active: !m.active,
                            }),
                          `${m.name} ${m.active ? 'dinonaktifkan' : 'diaktifkan'}.`,
                        )
                      }
                    >
                      {m.active ? 'Nonaktifkan' : 'Aktifkan'}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      {toast && <Toast message={toast} onDismiss={() => setToast('')} />}
    </>
  );
}
