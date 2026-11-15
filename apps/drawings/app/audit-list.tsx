'use client';
import { useEffect, useState } from 'react';
import { Button, TableSkeleton } from '@plant/ui';
import { formatWib, getJson } from './client-api';

type Item = {
  id: string;
  action: string;
  actor: { name: string };
  targetType: string;
  targetId: string;
  drawingId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
};
type Page = { items: Item[]; nextCursor: string | null };

export function AuditList() {
  const [items, setItems] = useState<Item[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const load = async (next: string | null) => {
    setLoading(true);
    try {
      const d = await getJson<Page>('audit' + (next ? '?cursor=' + encodeURIComponent(next) : ''));
      setItems((v) => (next ? [...v, ...d.items] : d.items));
      setCursor(d.nextCursor);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load(null);
  }, []);
  return (
    <section className="panel">
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {loading && !items.length ? (
        <TableSkeleton />
      ) : (
        <div className="table-scroll">
          <table className="drawing-table">
            <thead>
              <tr>
                <th scope="col">Waktu</th>
                <th scope="col">Pelaku</th>
                <th scope="col">Aksi</th>
                <th scope="col">Target</th>
                <th scope="col">Detail</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td>{formatWib(i.createdAt)}</td>
                  <td>{i.actor.name}</td>
                  <td className="code-text">{i.action}</td>
                  <td>
                    {i.drawingId ? (
                      <a href={`/drawings/library/${i.drawingId}`}>{i.targetType}</a>
                    ) : (
                      i.targetType
                    )}
                  </td>
                  <td>
                    <code className="audit-details">{JSON.stringify(i.details).slice(0, 240)}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {cursor && (
        <div className="form-actions">
          <Button className="secondary" busy={loading} onClick={() => void load(cursor)}>
            Muat lagi
          </Button>
        </div>
      )}
    </section>
  );
}
