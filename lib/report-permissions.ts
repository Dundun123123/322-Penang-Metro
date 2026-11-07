import type { LocalUser } from "@/lib/auth";
export function canViewReportPhoto(user: LocalUser | null, ownerUserId: string | null) {
  return Boolean(
    user && (user.role === "team" || user.role === "authority" || user.id === ownerUserId),
  );
}
