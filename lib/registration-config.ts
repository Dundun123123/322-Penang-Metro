import "server-only";
import { getDb } from "@/db";

export type RegistrationConfig = {
  authorityKeyHash: string;
  teamCodeSecret: string;
};

// Always read the shared row so separate website processes use the same settings.
export async function getRegistrationConfig(): Promise<RegistrationConfig | null> {
  try {
    const row = await getDb()
      .prepare(
        "SELECT authority_key_hash AS authorityKeyHash,team_code_secret AS teamCodeSecret FROM registration_config WHERE id=1",
      )
      .get();
    if (
      !row ||
      typeof row.authorityKeyHash !== "string" ||
      typeof row.teamCodeSecret !== "string" ||
      !/^[a-f0-9]{32}:[a-f0-9]{128}$/i.test(row.authorityKeyHash) ||
      !row.teamCodeSecret
    )
      return null;
    return row as RegistrationConfig;
  } catch (error) {
    // Existing installations can keep signing in while the migration is prepared.
    if (error && typeof error === "object" && "code" in error && error.code === "ER_NO_SUCH_TABLE")
      return null;
    throw error;
  }
}
