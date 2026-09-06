export type Panel = "about" | "music";
export type SiteAction =
  | { readonly type: "panel"; readonly panel: Panel }
  | { readonly type: "link"; readonly url: string };

export const site = {
  title: "kate",
  description: "kate is an engineer & musician based in nyc.",
  url: "https://kate.garden",
} as const;

export const links: readonly { readonly label: string; readonly action: SiteAction }[] = [
  { label: "about", action: { type: "panel", panel: "about" } },
  { label: "music", action: { type: "panel", panel: "music" } },
  { label: "photo", action: { type: "link", url: "https://instagram.com/katejiang__" } },
  { label: "code", action: { type: "link", url: "https://github.com/kate-jiang" } },
];
