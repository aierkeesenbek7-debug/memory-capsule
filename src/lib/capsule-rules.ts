// Pure capsule rules shared by the UI and tests. The database enforces the same
// rules (future opening date, sealed contents) — these only give early feedback.

export const HUES = ["aqua", "coral", "amber", "lime", "rose", "sky"] as const;
export type Hue = (typeof HUES)[number];

export const MAX_FILE_BYTES = 50 * 1024 * 1024;

export function asHue(value: string | null | undefined): Hue {
  return (HUES as readonly string[]).includes(value ?? "") ? (value as Hue) : "aqua";
}

export function isCapsuleOpen(openAt: string | Date, now: Date = new Date()): boolean {
  return new Date(openAt).getTime() <= now.getTime();
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

export function getCountdownParts(openAt: string | Date, now: Date = new Date()): CountdownParts {
  const diff = Math.max(0, new Date(openAt).getTime() - now.getTime());
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    done: diff === 0,
  };
}

export function formatCountdownShort(openAt: string | Date, now: Date = new Date()): string {
  const p = getCountdownParts(openAt, now);
  if (p.done) return "Ready to open";
  if (p.days >= 365) {
    const years = Math.floor(p.days / 365);
    const days = p.days % 365;
    return `Opens in ${years}y ${days}d`;
  }
  if (p.days > 0) return `Opens in ${p.days}d ${p.hours}h`;
  if (p.hours > 0) return `Opens in ${p.hours}h ${p.minutes}m`;
  return `Opens in ${p.minutes}m ${p.seconds}s`;
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export interface CapsuleDraft {
  title: string;
  openAt: string; // datetime-local or ISO
  musicUrl: string;
  visibility: "personal" | "shared";
  invites: string[];
}

export function validateCapsuleDraft(draft: CapsuleDraft, now: Date = new Date()): string[] {
  const errors: string[] = [];
  const title = draft.title.trim();
  if (!title) errors.push("Give your capsule a title.");
  if (title.length > 120) errors.push("Keep the title under 120 characters.");
  if (!draft.openAt) {
    errors.push("Choose when the capsule opens.");
  } else if (Number.isNaN(new Date(draft.openAt).getTime())) {
    errors.push("The opening date is not valid.");
  } else if (new Date(draft.openAt).getTime() <= now.getTime()) {
    errors.push("The opening date must be in the future.");
  }
  if (draft.musicUrl.trim() && !isHttpUrl(draft.musicUrl)) {
    errors.push("The music link must start with http:// or https://.");
  }
  if (draft.visibility === "shared") {
    if (draft.invites.length === 0) errors.push("Invite at least one person to a shared capsule.");
    const bad = draft.invites.filter((e) => !isEmail(e));
    if (bad.length) errors.push(`These emails look wrong: ${bad.join(", ")}`);
  }
  return errors;
}

export function getMusicEmbed(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtube.com" || host === "music.youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (host === "youtu.be") {
      const v = u.pathname.slice(1);
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (host === "open.spotify.com") {
      const m = u.pathname.match(/\/(track|album|playlist|episode)\/([A-Za-z0-9]+)/);
      if (m) return `https://open.spotify.com/embed/${m[1]}/${m[2]}`;
    }
  } catch {
    return null;
  }
  return null;
}
