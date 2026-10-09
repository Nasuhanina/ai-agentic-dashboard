import type { Role } from "./types";

export type SectionKey =
  | "demographics"
  | "activity"
  | "interactions"
  | "driving"
  | "sentiment"
  | "loyalty"
  | "insurance"
  | "segments"
  | "likelihood"
  | "campaign"
  | "users";

const ACCESS: Record<Role, SectionKey[]> = {
  admin: [
    "demographics",
    "activity",
    "interactions",
    "driving",
    "sentiment",
    "loyalty",
    "insurance",
    "segments",
    "likelihood",
    "campaign",
    "users",
  ],
  customer: ["demographics", "activity", "driving", "loyalty"],
};

export function canAccess(role: Role, section: SectionKey): boolean {
  return ACCESS[role].includes(section);
}
