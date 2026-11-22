'use client';
import { memo } from 'react';
import {
  ageBucket,
  ageHours,
  bagAgeScaleDays,
  bagColor,
  displayCompartment,
  positionKey,
  rowDividerBefore,
  rowOrder,
  type Equipment,
  type Position,
} from '@plant/contracts';

/** Stable callbacks; the monitor routes them to its current handlers. */
export type OverviewActions = {
  hover: (p: Position, event: React.PointerEvent<HTMLButtonElement>) => void;
  leave: () => void;
  toggle: (p: Position, event: React.MouseEvent<HTMLButtonElement>) => void;
  show: (side: Position['side'], compartment: number) => void;
};

/** Age filter value a cell matches; `[data-age-filter]` on the panel dims the others in CSS. */
export const cellAgeBucket = (age: number | null) => (age === null ? 'empty' : String(ageBucket(age)));

/**
 * One compartment of the whole-equipment map. The map holds thousands of cells, so each
 * compartment re-renders only when its own data changes: `picked` is the compartment's selected
 * keys joined into one string, and the age filter is applied by CSS rather than by props.
 */
export const OverviewCompartment = memo(function OverviewCompartment({
  eq,
  band,
  index,
  local,
  active,
  latest,
  now,
  picked,
  actions,
}: {
  eq: Equipment;
  band: Position['side'];
  index: number;
  local: number;
  active: boolean;
  latest: ReadonlyMap<string, { installedAt: string }>;
  now: number;
  picked: string;
  actions: OverviewActions;
}) {
  const letters = eq.columns,
    display = displayCompartment({ side: band, compartment: local }, eq),
    pickedKeys = new Set(picked ? picked.split(',') : []);
  const title = (
    <button
      className="overview-title"
      aria-current={active ? 'true' : undefined}
      aria-label={`Buka detail kompartemen ${display}`}
      onClick={() => actions.show(band, local)}
    >
      <span className="overview-title-full">Comp. </span>
      {display}
    </button>
  );
  const labels = (
    <div className="overview-labels">
      <span />
      {letters.split('').map((letter) => (
        <span key={letter}>{letter}</span>
      ))}
    </div>
  );
  return (
    <div className="overview-compartment" data-active={active}>
      {index === 1 && title}
      {eq.centeredLabels && index === 1 && labels}
      <div className="overview-matrix">
        {rowOrder(eq, band).map((row) => (
          <div
            className={`overview-line${rowDividerBefore(eq, band, row) ? ' overview-stiffener' : ''}`}
            key={row}
          >
            <span className="overview-row-number" data-even={row % 2 === 0 || undefined}>
              {row}
            </span>
            {Array.from({ length: 8 }, (_, c) => {
              const p = { side: band, compartment: local, column: c + 1, row },
                key = positionKey(p),
                age = ageHours(latest.get(key)?.installedAt || null, now);
              return (
                <button
                  key={c}
                  className={`overview-cell${age !== null && age >= bagAgeScaleDays * 24 ? ' is-old' : ''}`}
                  data-position-key={key}
                  data-age-bucket={cellAgeBucket(age)}
                  tabIndex={-1}
                  style={{ background: bagColor(age) }}
                  aria-label={`${display} ${letters[c]}${row}`}
                  onPointerEnter={(e) => actions.hover(p, e)}
                  onPointerLeave={actions.leave}
                  aria-pressed={pickedKeys.has(key)}
                  onClick={(event) => actions.toggle(p, event)}
                />
              );
            })}
          </div>
        ))}
      </div>
      {(!eq.centeredLabels || index === 0) && labels}
      {index === 0 && title}
    </div>
  );
});
