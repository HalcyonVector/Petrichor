const BASE = {
  width: 14,
  height: 14,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function IconRecord() {
  return (
    <svg {...BASE}>
      <circle cx="8" cy="8" r="4.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconStopRecord() {
  return (
    <svg {...BASE}>
      <rect x="4.5" y="4.5" width="7" height="7" rx="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconSliders() {
  return (
    <svg {...BASE}>
      <path d="M2.5 4.5h6.5M12 4.5h1.5M2.5 11.5H4M7 11.5h6.5" />
      <circle cx="10.5" cy="4.5" r="1.6" />
      <circle cx="5.5" cy="11.5" r="1.6" />
    </svg>
  );
}

export function IconClose() {
  return (
    <svg {...BASE}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

export function IconDownload() {
  return (
    <svg {...BASE}>
      <path d="M8 2.5v7.5M4.8 7l3.2 3.2L11.2 7M3 13.2h10" />
    </svg>
  );
}
