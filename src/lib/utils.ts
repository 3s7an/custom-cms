import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * For an `href` attribute: without `http://` / `https://` the browser treats the
 * value as relative to the current page. Prepends `https://` unless the value is
 * already an absolute http(s) URL or a protocol-relative `//` URL.
 */
export function toAbsoluteHttpUrl(raw: string | null | undefined): string | null {
  const t = (raw || "").trim();
  if (!t) return null;
  if (/^(https?:|\/\/)/i.test(t)) return t;
  return `https://${t}`;
}
