'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  EmptyState,
  Input,
  Select,
  TableSkeleton,
  Textarea,
  useConfirmation,
  useDebouncedValue,
} from '@plant/ui';
import {
  requestStatusLabels,
  requestStatuses,
  requestStatusTone,
  type RequestDetail,
  type RequestListItem,
  type RequestScope,
} from '@plant/contracts';
import { formatWib, getJson, newKey, sendJson } from './client-api';
import { ImageUpload } from './image-upload';
import { ToneBadge } from './status-badge';

const scopeLabels: Record<RequestScope, string> = {
  mine: 'Request saya',
  assigned: 'Ditugaskan ke saya',
  all: 'Semua request',
};
type Page = {
  scope: RequestScope;
  scopes: RequestScope[];
  items: RequestListItem[];
  nextCursor: string | null;
};

export function RequestBadge({ status }: { status: RequestListItem['status'] }) {
  return <ToneBadge label={requestStatusLabels[status]} tone={requestStatusTone(status)} status={status} />;
}

/** Daftar Drawing Request sesuai cakupan role (PRD §4.6). */
export function RequestList({ scopes }: { scopes: RequestScope[] }) {
  const [scope, setScope] = useState<RequestScope>(scopes[scopes.length - 1]),
    [status, setStatus] = useState(''),
    [q, setQ] = useState(''),
    [items, setItems] = useState<RequestListItem[] | null>(null),
    [cursor, setCursor] = useState<string | null>(null),
    [error, setError] = useState('');
  const query = useDebouncedValue(q, 250);
  const path = useCallback(
    (next: string | null) => {
      const p = new URLSearchParams({ scope });
      if (status) p.set('status', status);
      if (query.trim()) p.set('q', query.trim());
      if (next) p.set('cursor', next);
      return 'requests?' + p;
    },
    [scope, status, query],
  );
  useEffect(() => {
    const abort = new AbortController();
    setItems(null);
    setError('');
    getJson<Page>(path(null), abort.signal)
      .then((d) => {
        setItems(d.items);
        setCursor(d.nextCursor);
      })
      .catch((e) => !abort.signal.aborted && setError(e.message));
    return () => abort.abort();
  }, [path]);
  return (
    <section className="panel drawing-library">
      <div className="library-head">
        {scopes.length > 1 && (
          <div role="tablist" aria-label="Cakupan request" className="segmented">
            {scopes.map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={scope === s}
                className={scope === s ? 'is-active' : ''}
                onClick={() => setScope(s)}
              >
                {scopeLabels[s]}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="form-grid library-filter-grid">
        <label>
          Cari
          <Input
            type="search"
            placeholder="Nomor DRQ atau HAC/SAC"
            maxLength={40}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <label>
          Status
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Semua status</option>
            {requestStatuses.map((s) => (
              <option key={s} value={s}>
                {requestStatusLabels[s]}
              </option>
            ))}
          </Select>
        </label>
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {!items ? (
        <TableSkeleton />
      ) : !items.length ? (
        <EmptyState
          title="Belum ada request"
          description="Drawing Request dalam cakupan Anda akan tampil di sini."
        />
      ) : (
        <div className="table-scroll" role="region" aria-label="Daftar request" tabIndex={0}>
          <table className="drawing-table stack-table">
            <thead>
              <tr>
                <th scope="col">Nomor</th>
                <th scope="col">HAC/SAC</th>
                <th scope="col">Description</th>
                <th scope="col">Status</th>
                <th scope="col">Pemohon</th>
                <th scope="col">Drafter</th>
                <th scope="col">Diperbarui</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td data-cell="num">
                    <a className="code-text row-link" href={`/drawings/requests/${r.id}`}>
                      {r.number}
                    </a>
                  </td>
                  <td className="code-text" data-cell="hac">
                    {r.hac}
                  </td>
                  <td data-cell="desc">
                    {r.description.length > 120 ? r.description.slice(0, 117) + '…' : r.description}
                  </td>
                  <td data-cell="status">
                    <RequestBadge status={r.status} />
                  </td>
                  <td data-label="Pemohon">{r.requester.name}</td>
                  <td data-label="Drafter">{r.drafter?.name ?? '–'}</td>
                  <td data-label="Diperbarui">{formatWib(r.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {cursor && (
        <div className="form-actions">
          <Button
            className="secondary"
            onClick={async () => {
              const d = await getJson<Page>(path(cursor));
              setItems((v) => [...(v ?? []), ...d.items]);
              setCursor(d.nextCursor);
            }}
          >
            Muat lagi
          </Button>
        </div>
      )}
    </section>
  );
}

/** Form Drawing Request: HAC/SAC, Description, Keperluan, maksimal 10 gambar referensi. */
export function RequestForm() {
  const [values, setValues] = useState({ hac: '', description: '', purpose: '' }),
    [images, setImages] = useState<string[]>([]),
    [suggestions, setSuggestions] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const key = useRef(newKey());
  const onImages = useCallback((ids: string[]) => {
    key.current = newKey();
    setImages(ids);
  }, []);
  const set = (field: keyof typeof values) => (e: { target: { value: string } }) => {
    key.current = newKey();
    setValues((v) => ({ ...v, [field]: e.target.value }));
  };
  const hac = useDebouncedValue(values.hac, 250);
  useEffect(() => {
    if (!hac.trim()) return setSuggestions([]);
    getJson<{ items: string[] }>('hac-suggestions?q=' + encodeURIComponent(hac))
      .then((d) => setSuggestions(d.items))
      .catch(() => undefined);
  }, [hac]);
  return (
    <form
      className="form-stack drawing-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
          const r = await sendJson<{ id: string }>(
            'POST',
            'requests',
            { ...values, imageIds: images },
            key.current,
          );
          location.assign(`/drawings/requests/${r.id}`);
        } catch (err) {
          setError((err as Error).message);
          setBusy(false);
        }
      }}
    >
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <label>
        HAC/SAC
        <Input
          required
          maxLength={40}
          list="request-hac"
          value={values.hac}
          onChange={set('hac')}
          autoComplete="off"
          spellCheck={false}
          aria-describedby="request-hac-hint"
        />
        <small id="request-hac-hint" className="field-hint">
          Kode area atau peralatan yang digambar. Ketik beberapa karakter untuk melihat kode yang sudah ada.
        </small>
        <datalist id="request-hac">
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </label>
      <label>
        Description
        <Textarea
          required
          maxLength={2000}
          rows={4}
          value={values.description}
          onChange={set('description')}
          aria-describedby="request-description-hint"
        />
        <small id="request-description-hint" className="field-hint">
          Objek yang perlu digambar, misalnya bagian peralatan, jenis gambar, dan ukuran penting yang sudah
          diketahui.
        </small>
      </label>
      <label>
        Keperluan
        <Textarea
          required
          maxLength={1000}
          rows={3}
          value={values.purpose}
          onChange={set('purpose')}
          aria-describedby="request-purpose-hint"
        />
        <small id="request-purpose-hint" className="field-hint">
          Untuk apa drawing ini dibutuhkan, misalnya perbaikan, modifikasi, atau pengadaan suku cadang.
        </small>
      </label>
      <ImageUpload onChange={onImages} label="Gambar referensi (opsional)" />
      <div className="form-actions">
        <Button className="primary" busy={busy}>
          Kirim request
        </Button>
        <a className="button secondary" href="/drawings/requests">
          Batal
        </a>
      </div>
    </form>
  );
}

type Person = { id: string; name: string; position: string };
/** Detail request beserta aksi sesuai peran: batal, review/assign, jawaban Drafter. */
export function RequestView({ request }: { request: RequestDetail }) {
  const confirm = useConfirmation();
  const [note, setNote] = useState(''),
    [drafter, setDrafter] = useState(''),
    [people, setPeople] = useState<Person[]>([]),
    [busy, setBusy] = useState(''),
    [error, setError] = useState(''),
    [key, setKey] = useState(newKey());
  useEffect(() => {
    if (!request.can.review) return;
    getJson<{ people: Person[] }>('people?for=drafter')
      .then((d) => setPeople(d.people))
      .catch((e) => setError(e.message));
  }, [request.can.review]);
  async function run(path: string, body: Record<string, unknown>, label: string, danger = false) {
    if (!(await confirm(`${label}?`, { confirmLabel: label, variant: danger ? 'danger' : 'primary' })))
      return;
    setBusy(path + label);
    setError('');
    try {
      const r = await sendJson<{ drawingId?: string }>(
        'POST',
        `requests/${request.id}/${path}`,
        { expectedVersion: request.version, ...body },
        key,
      );
      location.assign(
        r.drawingId ? `/drawings/library/${r.drawingId}/edit` : `/drawings/requests/${request.id}`,
      );
    } catch (e) {
      setError((e as Error).message);
      setBusy('');
      setKey(newKey());
    }
  }
  return (
    <div className="drawing-detail">
      <section className="panel">
        <h2>Permintaan</h2>
        <dl className="meta-list">
          <dt>Status</dt>
          <dd>
            <RequestBadge status={request.status} />
          </dd>
          <dt>HAC/SAC</dt>
          <dd className="code-text">{request.hac}</dd>
          <dt>Description</dt>
          <dd>{request.description}</dd>
          <dt>Keperluan</dt>
          <dd>{request.purpose}</dd>
          <dt>Pemohon</dt>
          <dd>
            {request.requester.name} · {formatWib(request.createdAt)}
          </dd>
          {request.reviewer && (
            <>
              <dt>Review</dt>
              <dd>
                {request.reviewer.name}
                {request.reviewNote ? ` — ${request.reviewNote}` : ''}
              </dd>
            </>
          )}
          {request.drafter && (
            <>
              <dt>Drafter</dt>
              <dd>
                {request.drafter.name}
                {request.drafterNote ? ` — ${request.drafterNote}` : ''}
              </dd>
            </>
          )}
          {request.closeReason && (
            <>
              <dt>Ditutup</dt>
              <dd>
                {request.closeReason} · {formatWib(request.closedAt)}
              </dd>
            </>
          )}
          {request.drawing && (
            <>
              <dt>Drawing</dt>
              <dd>
                <a href={`/drawings/library/${request.drawing.id}`}>
                  {request.drawing.number ?? 'Draft tanpa nomor'}
                  {request.drawing.title ? ` · ${request.drawing.title}` : ''}
                </a>
              </dd>
            </>
          )}
        </dl>
        {!!request.images.length && (
          <>
            <h3>Gambar referensi</h3>
            <ul className="attachment-list">
              {request.images.map((f) => (
                <li key={f.id}>
                  <a href={`/drawings/api/attachments/${f.id}`} target="_blank" rel="noopener">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/drawings/api/attachments/${f.id}`} alt={f.name} loading="lazy" />
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      {(request.can.cancel || request.can.review || request.can.drafterDecision) && (
        <section className="panel">
          <h2>Tindakan</h2>
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <div className="form-stack">
            {request.can.review && (
              <label>
                Tugaskan ke Drafter
                <Select value={drafter} onChange={(e) => setDrafter(e.target.value)}>
                  <option value="">Pilih Drafter</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name + (p.position ? ` — ${p.position}` : '')}
                    </option>
                  ))}
                </Select>
              </label>
            )}
            {(request.can.review || request.can.drafterDecision || request.can.cancel) && (
              <label>
                {request.can.cancel ? 'Alasan pembatalan (opsional)' : 'Catatan (wajib bila menolak)'}
                <Textarea maxLength={1000} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
              </label>
            )}
            {(request.can.review || request.can.drafterDecision) && (
              <p id="request-action-hint" className="fine">
                {request.can.review
                  ? 'Pilih Drafter untuk menugaskan. Isi catatan untuk menolak request.'
                  : 'Isi catatan untuk menolak request.'}
              </p>
            )}
            <div className="detail-actions">
              {request.can.review && (
                <>
                  <Button
                    className="primary"
                    disabled={!drafter}
                    busy={busy === 'reviewTugaskan'}
                    onClick={() =>
                      void run('review', { decision: 'assign', drafterId: drafter, note }, 'Tugaskan')
                    }
                  >
                    Tugaskan
                  </Button>
                  <Button
                    className="danger"
                    disabled={!note.trim()}
                    busy={busy === 'reviewTolak request'}
                    onClick={() => void run('review', { decision: 'reject', note }, 'Tolak request', true)}
                  >
                    Tolak request
                  </Button>
                </>
              )}
              {request.can.drafterDecision && (
                <>
                  <Button
                    className="primary"
                    busy={busy === 'drafter-decisionTerima'}
                    onClick={() => void run('drafter-decision', { decision: 'accept', note }, 'Terima')}
                  >
                    Terima dan buat draft
                  </Button>
                  <Button
                    className="danger"
                    disabled={!note.trim()}
                    busy={busy === 'drafter-decisionTolak'}
                    onClick={() => void run('drafter-decision', { decision: 'reject', note }, 'Tolak', true)}
                  >
                    Tolak
                  </Button>
                </>
              )}
              {request.can.cancel && (
                <Button
                  className="danger"
                  busy={busy === 'cancelBatalkan request'}
                  onClick={() => void run('cancel', { reason: note }, 'Batalkan request', true)}
                >
                  Batalkan request
                </Button>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
