'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Input, Select, Textarea, useDebouncedValue } from '@plant/ui';
import type { DrawingDetail, DrawingsMasters, MasterItem } from '@plant/contracts';
import { ApiError, getJson, newKey, sendJson } from './client-api';
import { PdfUpload, type Staged } from './pdf-upload';

type Mode = 'create' | 'legacy' | 'edit';
type Person = { id: string; name: string; position: string };
type Props = {
  mode: Mode;
  masters: DrawingsMasters;
  maxMb: number;
  actor: { id: string; name: string };
  drawing?: DrawingDetail;
  /** Edit: metadata dapat diubah (draft sebelum rilis pertama). */
  metadataEditable?: boolean;
  /** Edit: data revisi kerja dapat diubah. */
  revisionEditable?: boolean;
  /** Koreksi metadata Final Drawing oleh admin (alasan wajib). */
  correction?: boolean;
};

const options = (items: MasterItem[], keep?: string | null) => items.filter((m) => m.active || m.id === keep);

export function DrawingForm({
  mode,
  masters,
  maxMb,
  actor,
  drawing,
  metadataEditable,
  revisionEditable,
  correction,
}: Props) {
  const showMetadata = mode !== 'edit' || !!metadataEditable || !!correction;
  const showRevision = mode !== 'edit' || !!revisionEditable;
  const revision = drawing?.current ?? null;
  const [values, setValues] = useState({
    number: drawing?.number ?? '',
    title: drawing?.title ?? '',
    hac: drawing?.hac ?? '',
    disciplineId: drawing?.disciplineId ?? '',
    description: drawing?.description ?? '',
    revisionNo: revision?.revisionNo ?? '0',
    changeNote: revision?.changeNote ?? '',
    ownerId: actor.id,
    legacyNote: '',
    reason: '',
  });
  const [file, setFile] = useState<Staged | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [people, setPeople] = useState<Person[]>([]),
    [suggestions, setSuggestions] = useState<string[]>([]);
  // One key per logical submission: a retry after a network error reuses it, an edit renews it.
  const key = useRef(newKey());
  const set = (field: keyof typeof values) => (e: { target: { value: string } }) => {
    key.current = newKey();
    setValues((v) => ({ ...v, [field]: e.target.value }));
  };
  const hacQuery = useDebouncedValue(values.hac, 250);
  useEffect(() => {
    if (!showMetadata || hacQuery.trim().length < 1) return setSuggestions([]);
    const abort = new AbortController();
    getJson<{ items: string[] }>('hac-suggestions?q=' + encodeURIComponent(hacQuery), abort.signal)
      .then((d) => setSuggestions(d.items))
      .catch(() => undefined);
    return () => abort.abort();
  }, [hacQuery, showMetadata]);
  useEffect(() => {
    if (mode !== 'legacy') return;
    getJson<{ people: Person[] }>('people?for=legacy-owner')
      .then((d) => setPeople(d.people))
      .catch((e) => setError(e.message));
  }, [mode]);
  const disciplineOptions = useMemo(
    () => options(masters.disciplines, drawing?.disciplineId),
    [masters, drawing],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      let id = drawing?.id;
      if (mode === 'create') {
        const r = await sendJson<{ id: string }>(
          'POST',
          'drawings',
          {
            number: values.number,
            title: values.title,
            hac: values.hac,
            disciplineId: values.disciplineId || null,
            description: values.description,
            revisionNo: values.revisionNo,
            changeNote: values.changeNote,
            fileId: file?.fileId ?? null,
          },
          key.current,
        );
        id = r.id;
      } else if (mode === 'legacy') {
        if (!file) throw new ApiError('File PDF wajib diunggah.', 400);
        const r = await sendJson<{ id: string }>(
          'POST',
          'drawings/legacy',
          {
            number: values.number,
            title: values.title,
            hac: values.hac,
            disciplineId: values.disciplineId,
            description: values.description,
            revisionNo: values.revisionNo,
            ownerId: values.ownerId,
            legacyNote: values.legacyNote,
            fileId: file.fileId,
          },
          key.current,
        );
        id = r.id;
      } else if (drawing) {
        const changes: Record<string, unknown> = { expectedVersion: drawing.version };
        if (showMetadata) {
          if (values.number !== (drawing.number ?? '')) changes.number = values.number;
          if (values.title !== (drawing.title ?? '')) changes.title = values.title;
          if (values.hac !== drawing.hac) changes.hac = values.hac;
          if (values.disciplineId !== (drawing.disciplineId ?? ''))
            changes.disciplineId = values.disciplineId || null;
          if (values.description !== drawing.description) changes.description = values.description;
        }
        if (showRevision && revision) {
          if (values.revisionNo !== revision.revisionNo) changes.revisionNo = values.revisionNo;
          if (values.changeNote !== revision.changeNote) changes.changeNote = values.changeNote;
          if (file) changes.fileId = file.fileId;
        }
        if (
          correction &&
          Object.keys(changes).some((k) =>
            ['number', 'title', 'hac', 'disciplineId', 'description'].includes(k),
          )
        )
          changes.reason = values.reason;
        if (Object.keys(changes).length === 1) throw new ApiError('Tidak ada perubahan.', 400);
        await sendJson('PATCH', `drawings/${drawing.id}`, changes);
      }
      location.assign(`/drawings/library/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan.');
      setBusy(false);
    }
  }

  return (
    <form className="form-stack drawing-form" onSubmit={submit} noValidate={false}>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {showMetadata && (
        <fieldset className="form-grid">
          <legend>Data drawing</legend>
          <label>
            Drawing Number
            <Input
              required
              maxLength={100}
              value={values.number}
              onChange={set('number')}
              autoComplete="off"
            />
          </label>
          <label>
            Drawing Name
            <Input required maxLength={255} value={values.title} onChange={set('title')} />
          </label>
          <label>
            HAC/SAC
            <Input
              required
              maxLength={40}
              list="hac-suggestions"
              value={values.hac}
              onChange={set('hac')}
              autoComplete="off"
              spellCheck={false}
            />
            <datalist id="hac-suggestions">
              {suggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>
          <label>
            Discipline{mode === 'legacy' ? '' : ' (wajib saat Submit)'}
            <Select required={mode === 'legacy'} value={values.disciplineId} onChange={set('disciplineId')}>
              <option value="">Pilih Discipline</option>
              {disciplineOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name + (d.active ? '' : ' (nonaktif)')}
                </option>
              ))}
            </Select>
          </label>
          <label className="full">
            Description
            <Textarea maxLength={2000} rows={3} value={values.description} onChange={set('description')} />
          </label>
        </fieldset>
      )}
      {showRevision && (
        <fieldset className="form-grid">
          <legend>{mode === 'legacy' ? 'Revisi dan Final Drawing' : 'Current Revision'}</legend>
          <label>
            Revision Number
            <Input
              required
              maxLength={20}
              pattern="[A-Za-z0-9.\-]{1,20}"
              title="Huruf, angka, titik atau tanda hubung"
              value={values.revisionNo}
              onChange={set('revisionNo')}
            />
          </label>
          {mode === 'legacy' ? (
            <label>
              Drawn by
              <Select required value={values.ownerId} onChange={set('ownerId')}>
                <option value={actor.id}>{actor.name} (saya)</option>
                {people
                  .filter((p) => p.id !== actor.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name + (p.position ? ` — ${p.position}` : '')}
                    </option>
                  ))}
              </Select>
            </label>
          ) : (
            <label className="full">
              Change Note
              <Textarea maxLength={1000} rows={2} value={values.changeNote} onChange={set('changeNote')} />
            </label>
          )}
          {mode === 'legacy' && (
            <label className="full">
              Legacy Ready Note
              <Textarea
                required
                maxLength={1000}
                rows={2}
                value={values.legacyNote}
                onChange={set('legacyNote')}
              />
            </label>
          )}
          <div className="full">
            {mode === 'edit' && revision?.hasFile && (
              <p className="fine">
                File saat ini: <strong>{revision.fileName}</strong>. Unggah file baru untuk menggantinya.
              </p>
            )}
            <PdfUpload
              maxMb={maxMb}
              label={mode === 'edit' && revision?.hasFile ? 'Ganti file PDF' : 'File PDF'}
              onStaged={(f) => {
                key.current = newKey();
                setFile(f);
              }}
            />
          </div>
        </fieldset>
      )}
      {correction && (
        <label>
          Alasan koreksi metadata (wajib bila metadata diubah)
          <Textarea maxLength={500} rows={2} value={values.reason} onChange={set('reason')} />
        </label>
      )}
      <div className="form-actions">
        <Button className="primary" busy={busy}>
          {mode === 'create' ? 'Save Draft' : mode === 'legacy' ? 'Upload Old Drawing' : 'Simpan perubahan'}
        </Button>
        <a
          className="button secondary"
          href={drawing ? `/drawings/library/${drawing.id}` : '/drawings/library'}
        >
          Batal
        </a>
      </div>
    </form>
  );
}
