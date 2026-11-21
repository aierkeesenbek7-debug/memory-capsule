import { describe, expect, it } from "vitest";
import {
  getCountdownParts,
  getMusicEmbed,
  isCapsuleOpen,
  validateCapsuleDraft,
} from "./capsule-rules";

const now = new Date("2026-11-21T12:00:00Z");
const base = { title: "Summer 2026", musicUrl: "", visibility: "personal" as const, invites: [] };

describe("capsule opening rules", () => {
  it("is locked before the opening date and open at/after it", () => {
    expect(isCapsuleOpen("2026-11-21T12:00:01Z", now)).toBe(false);
    expect(isCapsuleOpen("2026-11-21T12:00:00Z", now)).toBe(true);
  });

  it("rejects an opening date that is not in the future", () => {
    expect(validateCapsuleDraft({ ...base, openAt: "2026-11-21T11:59:00Z" }, now)).toContain(
      "The opening date must be in the future.",
    );
    expect(validateCapsuleDraft({ ...base, openAt: "2027-01-01T00:00:00Z" }, now)).toEqual([]);
  });

  it("requires at least one valid invite for a shared capsule", () => {
    const shared = { ...base, openAt: "2027-01-01T00:00:00Z", visibility: "shared" as const };
    expect(validateCapsuleDraft(shared, now)).toContain(
      "Invite at least one person to a shared capsule.",
    );
    expect(validateCapsuleDraft({ ...shared, invites: ["mom@example.com"] }, now)).toEqual([]);
  });

  it("counts down days, hours, minutes and seconds", () => {
    const p = getCountdownParts("2026-11-23T13:01:05Z", now);
    expect([p.days, p.hours, p.minutes, p.seconds, p.done]).toEqual([2, 1, 1, 5, false]);
  });

  it("embeds YouTube and Spotify music links", () => {
    expect(getMusicEmbed("https://www.youtube.com/watch?v=abc123")).toBe(
      "https://www.youtube.com/embed/abc123",
    );
    expect(getMusicEmbed("https://open.spotify.com/track/XYZ9")).toBe(
      "https://open.spotify.com/embed/track/XYZ9",
    );
  });
});
