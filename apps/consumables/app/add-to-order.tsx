'use client';
import { useState } from 'react';
import { Button, cartKey, cartLineKey, readCart, writeCart } from '@plant/ui';
import {
  canConsume,
  decimalUnits,
  decimalString,
  isSharedWorkArea,
  localDecimal,
  workAreaLabel,
  type Identity,
  type InventoryItem,
} from '@plant/contracts';
import { QuantityDialog } from './quantity-dialog';

export function AddToOrder({
  identity,
  item,
  onAdded,
  onCartChanged,
}: {
  identity: Identity;
  item: InventoryItem;
  onAdded?: (message: string, href: string) => void;
  onCartChanged?: () => void;
}) {
  const [type, setType] = useState<'consume' | 'return' | null>(null),
    [notice, setNotice] = useState(''),
    [link, setLink] = useState('');
  const canIssue = canConsume(identity, 'issue');
  const canReturn = canConsume(identity, 'return');
  if (!canIssue && !canReturn) return null;

  const ready = item.initialized && item.inventoryActive && item.active;
  const zeroStock = item.initialized && decimalUnits(item.quantity) === 0n;
  const consumeDisabled = !ready || zeroStock;
  const returnDisabled = !ready;

  let disabledReason = '';
  if (!item.active || !item.inventoryActive) {
    disabledReason = 'Material atau daftar stok sedang nonaktif.';
  } else if (!item.initialized) {
    disabledReason = 'Saldo awal belum dikonfirmasi admin — hubungi admin sebelum digunakan.';
  } else if (zeroStock && canIssue) {
    disabledReason = 'Stok di Area Kerja ini nol — tidak dapat ditambahkan langsung ke Consume Order.';
  }

  const targetKey = item.inventoryId || item.id;
  const existing = type
    ? readCart(cartKey(identity.id, type)).lines.find((l) => cartLineKey(l) === targetKey)?.quantity || '0'
    : '0';

  return (
    <div className="r22-stock-order-block">
      <div className="r22-stock-actions">
        {canIssue && (
          <Button
            type="button"
            className="primary"
            disabled={consumeDisabled}
            onClick={() => setType('consume')}
          >
            Tambah ke Consume Order
          </Button>
        )}
        {canReturn && (
          <Button
            type="button"
            className="secondary"
            disabled={returnDisabled}
            onClick={() => setType('return')}
          >
            Tambah ke Return Order
          </Button>
        )}
      </div>
      {disabledReason && <p className="r22-disabled-hint">{disabledReason}</p>}
      {!onAdded && link && (
        <p className="notice">
          {notice} <a href={link}>Buka keranjang</a>
        </p>
      )}
      <QuantityDialog
        material={type ? item : null}
        onClose={() => setType(null)}
        consume={type === 'consume'}
        already={existing}
        onAdd={(m, q) => {
          const key = cartKey(identity.id, type!),
            draft = readCart(key),
            lineKey = m.inventoryId || m.id,
            line = draft.lines.find((l) => cartLineKey(l) === lineKey);
          if (!line && draft.lines.length >= 50) throw Error('Maksimal 50 baris stok per order.');
          const sum = decimalString(decimalUnits(localDecimal(line?.quantity || '0')) + decimalUnits(q))
            .replace(/\.?0+$/, '')
            .replace('.', ',');
          writeCart(key, {
            ...draft,
            workArea: draft.workArea || (type === 'return' || !isSharedWorkArea(m.rack) ? m.rack || '' : ''),
            lines: line
              ? draft.lines.map((l) => (cartLineKey(l) === lineKey ? { material: m, quantity: sum } : l))
              : [...draft.lines, { material: m, quantity: sum }],
          });
          const msg = `${m.commonName || m.description} (${workAreaLabel(m.rack)}) ditambahkan ke ${type === 'consume' ? 'Consume Order' : 'Return Order'}.`;
          const href = `/consumables/${type}`;
          onCartChanged?.();
          if (onAdded) onAdded(msg, href);
          else {
            setNotice(msg);
            setLink(href);
          }
        }}
      />
    </div>
  );
}
