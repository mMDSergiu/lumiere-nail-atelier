const svg = (body: string) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  nail: svg('<path d="M8 21v-9.5C8 7 9.8 3 12 3s4 4 4 8.5V21"/><path d="M8 15.5c1.2.9 2.6 1.3 4 1.3s2.8-.4 4-1.3"/>'),
  drop: svg('<path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5z"/><path d="M9.2 14.5a2.8 2.8 0 0 0 2.8 2.8"/>'),
  brush: svg(
    '<path d="M18.4 2.6a2 2 0 0 1 2.9 2.9L11.2 15.6l-2.8-2.8z"/><path d="M8 13.5c-2.2 0-3.6 1.6-3.6 3.6 0 1.4-.8 2.4-2.4 2.9 1.2 1 2.8 1.5 4.4 1.5 2.9 0 4.6-2 4.6-4.6"/>',
  ),
  shapes: svg('<circle cx="7.5" cy="7.5" r="4"/><rect x="13" y="13" width="8" height="8" rx="1.5"/><path d="M17 3.5 21 10h-8z"/><path d="M3.5 17.5c1.5-2 3-2 4.5 0s3 2 4.5 0" />'),
  sparkle: svg(
    '<path d="M11 3c.6 3.6 2.4 5.4 6 6-3.6.6-5.4 2.4-6 6-.6-3.6-2.4-5.4-6-6 3.6-.6 5.4-2.4 6-6z"/><path d="M18.5 14.5c.3 1.6 1 2.4 2.5 2.7-1.5.3-2.2 1.1-2.5 2.6-.3-1.5-1-2.3-2.5-2.6 1.5-.3 2.2-1.1 2.5-2.7z"/>',
  ),
  eraser: svg('<path d="M7 21h13"/><path d="M5.6 15.4 14.8 6.2a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L12 19H8.2l-2.6-2.6a.7.7 0 0 1 0-1z"/><path d="m10 11 4.9 4.9"/>'),
  undo: svg('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
  redo: svg('<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>'),
  reset: svg('<path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6"/><path d="M4 4v4.6h4.6"/>'),
  trash: svg('<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4h6v3"/>'),
  copy: svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
  paste: svg('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M9 11h6M9 15h4"/>'),
  all: svg('<path d="M12 3 3 8l9 5 9-5z"/><path d="m3 12.5 9 5 9-5"/><path d="m3 17 9 5 9-5"/>'),
  duplicate: svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a1 1 0 0 1 1-1h9"/><path d="M14.5 12v5M12 14.5h5"/>'),
  flip: svg('<path d="M12 3v18"/><path d="M8.5 7 3.5 17h5z"/><path d="M15.5 7l5 10h-5z"/>'),
  up: svg('<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>'),
  down: svg('<path d="M12 5v14"/><path d="m6 13 6 6 6-6"/>'),
  download: svg('<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>'),
  check: svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  left: svg('<path d="m15 6-6 6 6 6"/>'),
  right: svg('<path d="m9 6 6 6-6 6"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  hand: svg(
    '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11"/><path d="M11 10V4.5a1.5 1.5 0 0 1 3 0V11"/><path d="M14 10.5V6a1.5 1.5 0 0 1 3 0v6.5"/><path d="M17 9.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1.2a6 6 0 0 1-4.6-2.2L4.6 15.4a1.6 1.6 0 0 1 2.4-2.1L8 14.3"/>',
  ),
};
