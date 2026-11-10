/** One line icon set for the navigation: 24-unit box, 1.75 stroke, round caps and joins, no fills. Keys are the destination keys of the host, provider and admin menus. */
export type NavShape =
  | { readonly t: 'path'; readonly d: string }
  | { readonly t: 'circle'; readonly cx: number; readonly cy: number; readonly r: number }
  | { readonly t: 'rect'; readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly rx: number };

const home: readonly NavShape[] = [{ t: 'path', d: 'M4 11 L12 4 L20 11 V19 A1 1 0 0 1 19 20 H15 V14 H9 V20 H5 A1 1 0 0 1 4 19 Z' }];
const people: readonly NavShape[] = [
  { t: 'circle', cx: 9, cy: 8, r: 3 }, { t: 'path', d: 'M3.5 19.5 C3.5 16 6 14 9 14 C12 14 14.5 16 14.5 19.5' },
  { t: 'circle', cx: 17, cy: 9, r: 2.4 }, { t: 'path', d: 'M16.5 14 C19.3 14 20.8 15.8 20.8 18.5' }
];
const gift: readonly NavShape[] = [
  { t: 'rect', x: 3.5, y: 8, w: 17, h: 4, rx: 1 }, { t: 'path', d: 'M5 12 V19 A1 1 0 0 0 6 20 H18 A1 1 0 0 0 19 19 V12' }, { t: 'path', d: 'M12 8 V20' },
  { t: 'path', d: 'M12 8 C10 8 8 7.2 8 5.8 C8 4.6 9.2 4.2 10.2 4.8 C11.2 5.4 12 8 12 8 C12 8 12.8 5.4 13.8 4.8 C14.8 4.2 16 4.6 16 5.8 C16 7.2 14 8 12 8' }
];
const envelope: readonly NavShape[] = [{ t: 'rect', x: 3, y: 5.5, w: 18, h: 13, rx: 2 }, { t: 'path', d: 'M3.5 7.5 L12 13.5 L20.5 7.5' }];
const bell: readonly NavShape[] = [{ t: 'path', d: 'M6 17 V11 A6 6 0 0 1 18 11 V17 L19.5 18.5 H4.5 Z' }, { t: 'path', d: 'M10 21 H14' }];
const sliders: readonly NavShape[] = [
  { t: 'path', d: 'M4 7 H8 M14 7 H20' }, { t: 'circle', cx: 11, cy: 7, r: 2.2 },
  { t: 'path', d: 'M4 12 H14 M19 12 H20' }, { t: 'circle', cx: 16.5, cy: 12, r: 2.2 },
  { t: 'path', d: 'M4 17 H6 M12 17 H20' }, { t: 'circle', cx: 9, cy: 17, r: 2.2 }
];
const tag: readonly NavShape[] = [{ t: 'path', d: 'M4 12.5 V5 A1 1 0 0 1 5 4 H12.5 L20 11.5 L12.5 19 Z' }, { t: 'circle', cx: 8.5, cy: 8.5, r: 1.3 }];
const calendar: readonly NavShape[] = [{ t: 'rect', x: 4, y: 5.5, w: 16, h: 14.5, rx: 2 }, { t: 'path', d: 'M4 10 H20 M8.5 3.5 V7.5 M15.5 3.5 V7.5' }];
const user: readonly NavShape[] = [{ t: 'circle', cx: 12, cy: 8.5, r: 3.5 }, { t: 'path', d: 'M5 20 C5 16 8 14 12 14 C16 14 19 16 19 20' }];
const shield: readonly NavShape[] = [{ t: 'path', d: 'M12 3.5 L19 6 V11.5 C19 15.6 16 18.8 12 20.5 C8 18.8 5 15.6 5 11.5 V6 Z' }, { t: 'path', d: 'M9 12 L11.2 14.2 L15.2 10' }];
const grid: readonly NavShape[] = [
  { t: 'rect', x: 4, y: 4, w: 7, h: 7, rx: 1.5 }, { t: 'rect', x: 13, y: 4, w: 7, h: 7, rx: 1.5 },
  { t: 'rect', x: 4, y: 13, w: 7, h: 7, rx: 1.5 }, { t: 'rect', x: 13, y: 13, w: 7, h: 7, rx: 1.5 }
];

const more: readonly NavShape[] = [{ t: 'circle', cx: 5.5, cy: 12, r: 1.4 }, { t: 'circle', cx: 12, cy: 12, r: 1.4 }, { t: 'circle', cx: 18.5, cy: 12, r: 1.4 }];

const plus: readonly NavShape[] = [{ t: 'path', d: 'M12 5 V19 M5 12 H19' }];
const check: readonly NavShape[] = [{ t: 'path', d: 'M5 12.5 L10 17.5 L19 7' }];
const close: readonly NavShape[] = [{ t: 'path', d: 'M6 6 L18 18 M18 6 L6 18' }];
const trash: readonly NavShape[] = [{ t: 'path', d: 'M4.5 7 H19.5 M9.5 7 V4.5 H14.5 V7' }, { t: 'path', d: 'M6.5 7 L7.5 19 A1 1 0 0 0 8.5 20 H15.5 A1 1 0 0 0 16.5 19 L17.5 7' }];
const arrow: readonly NavShape[] = [{ t: 'path', d: 'M5 12 H19 M13 6 L19 12 L13 18' }];
const back: readonly NavShape[] = [{ t: 'path', d: 'M19 12 H5 M11 6 L5 12 L11 18' }];
const refresh: readonly NavShape[] = [{ t: 'path', d: 'M19.5 12 A7.5 7.5 0 1 1 17 6.4' }, { t: 'path', d: 'M19 3.5 V7.5 H15' }];
const copy: readonly NavShape[] = [{ t: 'rect', x: 8.5, y: 8.5, w: 11, h: 11, rx: 2 }, { t: 'path', d: 'M15.5 8.5 V6.5 A2 2 0 0 0 13.5 4.5 H6.5 A2 2 0 0 0 4.5 6.5 V13.5 A2 2 0 0 0 6.5 15.5 H8.5' }];
const logout: readonly NavShape[] = [{ t: 'path', d: 'M10 4.5 H6.5 A2 2 0 0 0 4.5 6.5 V17.5 A2 2 0 0 0 6.5 19.5 H10' }, { t: 'path', d: 'M10 12 H20 M16 8 L20 12 L16 16' }];
const moon: readonly NavShape[] = [{ t: 'path', d: 'M19.5 14.5 A8 8 0 1 1 9.5 4.5 A6.5 6.5 0 0 0 19.5 14.5 Z' }];
const search: readonly NavShape[] = [{ t: 'circle', cx: 11, cy: 11, r: 6.5 }, { t: 'path', d: 'M16 16 L20 20' }];
const share: readonly NavShape[] = [{ t: 'path', d: 'M12 15 V4.5 M8 8.5 L12 4.5 L16 8.5' }, { t: 'path', d: 'M5 13 V18 A1.5 1.5 0 0 0 6.5 19.5 H17.5 A1.5 1.5 0 0 0 19 18 V13' }];
const upload: readonly NavShape[] = [{ t: 'path', d: 'M12 16 V5 M8 9 L12 5 L16 9 M5 19.5 H19' }];

export const NAV_ICONS: Readonly<Record<string, readonly NavShape[]>> = {
  home, guests: people, gifts: gift, invitation: envelope, alerts: bell, settings: sliders,
  overview: home, offers: tag, agenda: calendar, clients: people, profile: user,
  review: shield, catalog: grid, people, operation: sliders, more,
  plus, check, close, trash, arrow, back, refresh, copy, logout, moon, search, share, upload
};
export const NAV_ICON_STROKE = 1.75;
