'use client';
import { memo, useState } from 'react';
import { formatDate, positionKey, positionLabel, type Equipment, type Position } from '@plant/contracts';
import { CancellationNotice, type BatchRecord } from './batch-cancellation';

/** Stable callbacks; the monitor routes them to its current handlers. */
export type HistoryActions = {
  coordinate: (p: Position) => void;
  cancel: (batch: BatchRecord, trigger: HTMLButtonElement) => void;
};

const VISIBLE_COORDINATES = 12;

/**
 * One batch in "Riwayat pekerjaan". Memoised so map hover and selection do not rebuild the list,
 * and the coordinates past the first twelve render only once their <details> is opened: a large
 * batch otherwise keeps thousands of hidden buttons in the DOM. The search field above the list
 * still finds batches by coordinate on the server.
 */
export const HistoryItem = memo(function HistoryItem({
  batch,
  eq,
  cancellable,
  busy,
  actions,
}: {
  batch: BatchRecord;
  eq: Equipment;
  cancellable: boolean;
  busy: boolean;
  actions: HistoryActions;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const link = (p: Position) => (
    <button key={positionKey(p)} onClick={() => actions.coordinate(p)}>
      {positionLabel(p, eq)}
    </button>
  );
  const hidden = batch.positions.length - VISIBLE_COORDINATES;
  return (
    <article className="history-item" data-batch-id={batch.id}>
      <span className="history-count">{batch.positionCount}</span>
      <div>
        <strong>
          {batch.wo || 'Tanpa WO'} · {batch.positionCount} bag
        </strong>
        <small>
          {batch.reason} · dipasang {formatDate(batch.installedAt)} WIB
        </small>
        <small>Brand/Pabrikan: {batch.brand || 'Belum tercatat'}</small>
        <small>
          {batch.actorName} · dicatat {formatDate(batch.createdAt)} WIB
        </small>
        {batch.cancellation && <CancellationNotice cancellation={batch.cancellation} />}
        {cancellable && batch.status === 'active' && (
          <button
            type="button"
            className="ghost small cancel-record-action"
            disabled={busy}
            onClick={(event) => actions.cancel(batch, event.currentTarget)}
          >
            Batalkan record
          </button>
        )}
        <div className="coordinate-links">
          {batch.positions.slice(0, VISIBLE_COORDINATES).map(link)}
          {hidden > 0 && (
            <details onToggle={(event) => setMoreOpen(event.currentTarget.open)}>
              <summary>{hidden} koordinat lainnya</summary>
              {moreOpen && (
                <div className="coordinate-links">{batch.positions.slice(VISIBLE_COORDINATES).map(link)}</div>
              )}
            </details>
          )}
        </div>
      </div>
    </article>
  );
});
