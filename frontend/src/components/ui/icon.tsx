import type { SVGProps } from "react";

const ICON_PATHS = {
  film: "M4 3h16v18H4z M4 7h4m-4 5h4m-4 5h4M16 7h4m-4 5h4m-4 5h4M8 3v18M16 3v18",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  play: "M9 6v12l10-6z",
  info: "M12 11v6m0-10v1 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  calendar: "M4 5h16v16H4zM4 10h16M8 2v6m8-6v6",
  gift: "M3 8h18v5H3zM5 13v8h14v-8M12 8v13M12 8S4 8 6 3c2-3 6 5 6 5s8 0 6-5c-2-3-6 5-6 5",
  heart: "M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-5 5 8 15 8 15S25 10 20 5z",
  sun: "M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0",
  school: "m2 9 10-5 10 5-10 5zM6 11v6c4 3 8 3 12 0v-6M22 9v8",
  user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 22v-3a8 8 0 0 1 16 0v3",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "m6 6 12 12M6 18 18 6",
  search: "M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0m-2 4 7 7",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  "eye-off": "m3 3 18 18 M10.6 5.2A10.4 10.4 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-2.2 3.1M6.2 6.2C3.5 8.1 2 12 2 12s4 7 10 7c1.4 0 2.7-.4 3.8-1 M9.9 9.9a3 3 0 0 0 4.2 4.2",
};
export type IconName = keyof typeof ICON_PATHS;
export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={ICON_PATHS[name]} /></svg>;
}
