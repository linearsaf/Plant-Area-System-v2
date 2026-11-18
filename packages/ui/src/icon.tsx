import type { SVGProps } from 'react';
const paths = {
  box: 'm3 7 9-5 9 5v10l-9 5-9-5Zm0 0 9 5 9-5m-9 5v10M7.5 4.5l9 5',
  receipt: 'M5 3h14v18l-3-2-4 2-4-2-3 2Zm4 5h6m-6 4h6',
  issue: 'M4 4h10v4M4 4v16h10v-4m-4-4h12m-4-4 4 4-4 4',
  home: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  user: 'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  settings: 'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  sun: 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  moon: 'M21 13a9 9 0 0 1-10-10 9 9 0 1 0 10 10',
  monitor: 'M3 3h18v14H3zM8 21h8m-4-4v4',
  chevron: 'm9 5 7 7-7 7',
  collapse: 'm11 6-6 6 6 6m8-12-6 6 6 6',
  menu: 'M4 6h16M4 12h16M4 18h16',
  x: 'm6 6 12 12M6 18 18 6',
  check: 'm5 12 4 4L19 6',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  clock: 'M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  plus: 'M12 4v16M4 12h16',
  minus: 'M4 12h16',
  rotate: 'M20 12a8 8 0 1 1-2.34-5.66L20 8.7M20 3.5v5.2h-5.2',
  move: 'M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3',
  expand: 'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7',
  shrink: 'M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7',
  print: 'M7 9V3h10v6M7 17H4v-8h16v8h-3M7 14h10v7H7z',
  download: 'M12 3v12m-5-5 5 5 5-5M4 21h16',
  upload: 'M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4',
  external: 'M14 4h6v6m0-6-9 9m7 1v6H4V6h6',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  swap: 'M7 4 3 8l4 4M3 8h14m0 12 4-4-4-4m4 4H7',
  calendar: 'M4 5h16v16H4zM8 2v6m8-6v6M4 11h16',
  filter: 'M3 4h18l-7 8v7l-4 2v-9Z',
  drawing: 'M6 3h8l4 4v14H6Zm8 0v4h4M9 12h6m-6 4h4',
  rca: 'M3 12h14m0 0 4-4m-4 4 4 4M7 6l4 6-4 6m6-12 4 6-4 6',
  cost: 'M12 3H5a2 2 0 0 0-2 2v7l9 9 9-9-9-9ZM8 8h.01',
  info: 'M12 11v6m0-10v1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  logout: 'M10 17v4H3V3h7v4m4 1 4 4-4 4m-6-4h13',
} as const;
export type IconName = keyof typeof paths;
export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
