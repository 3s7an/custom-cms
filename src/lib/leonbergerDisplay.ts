/** Shared display helpers for Leonberger public + admin-aligned health JSON */

export type LeonbergerListMode = "chovne_psy" | "chovne_feny" | "veterani";

export type HealthJson = {
  lpn1?: string;
  lpn2?: string;
  lpn3?: string;
  lemp?: string;
  hd?: { left?: string; right?: string };
  ed?: { left?: string; right?: string };
};

export function parseLeonbergerListMode(v: string | null | undefined): LeonbergerListMode | null {
  if (v === "chovne_psy" || v === "chovne_feny" || v === "veterani") return v;
  return null;
}

export function safeHealth(v: unknown): HealthJson {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  return v as HealthJson;
}

/**
 * Pre atribút `href`: bez `http://` / `https://` by prehliadač považoval cestu za relatívnu k aktuálnej stránke
 * (napr. /leonberger/.../www.domena.sk). Doplní `https://` ak už nie je http(s) alebo `//`.
 */
export function toAbsoluteHttpUrl(raw: string | null | undefined): string | null {
  const t = (raw || "").trim();
  if (!t) return null;
  if (/^(https?:|\/\/)/i.test(t)) return t;
  return `https://${t}`;
}

const skDateFmt = new Intl.DateTimeFormat("sk-SK", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatDateSk(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return skDateFmt.format(d);
}

const decFmtSk = new Intl.NumberFormat("sk-SK", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatHeightCm(cm: number | null | undefined): string | null {
  if (cm == null || Number.isNaN(Number(cm))) return null;
  return `${decFmtSk.format(Number(cm))} cm`;
}

export function formatWeightKg(kg: number | null | undefined): string | null {
  if (kg == null || Number.isNaN(Number(kg))) return null;
  return `${decFmtSk.format(Number(kg))} kg`;
}

export type HealthStripItem = {
  id: string;
  label: string;
  value: string;
};

/** Ordered labels for card strip + detail (matches admin field semantics) */
export function healthStripItems(health: unknown): HealthStripItem[] {
  const h = safeHealth(health);
  const out: HealthStripItem[] = [];

  const hdL = (h.hd?.left || "").trim();
  const hdR = (h.hd?.right || "").trim();
  if (hdL || hdR) {
    const pair = hdL && hdR ? `${hdL}/${hdR}` : hdL || hdR;
    out.push({ id: "hd", label: "DBK/HD", value: pair });
  }

  const edL = (h.ed?.left || "").trim();
  const edR = (h.ed?.right || "").trim();
  if (edL || edR) {
    const pair = edL && edR ? `${edL}/${edR}` : edL || edR;
    out.push({ id: "ed", label: "DLK/ED", value: pair });
  }

  const lpn1 = (h.lpn1 || "").trim();
  if (lpn1) out.push({ id: "lpn1", label: "LPN1", value: lpn1 });

  const lpn2 = (h.lpn2 || "").trim();
  if (lpn2) out.push({ id: "lpn2", label: "LPN2", value: lpn2 });

  const lemp = (h.lemp || "").trim();
  if (lemp) out.push({ id: "lemp", label: "LEMP", value: lemp });

  const lpn3 = (h.lpn3 || "").trim();
  if (lpn3) out.push({ id: "lpn3", label: "LPPN3", value: lpn3 });

  return out;
}

/** Full sentence lines for detail block */
export function healthDetailLines(health: unknown): string[] {
  return healthStripItems(health).map((x) => `${x.label}: ${x.value}`);
}
