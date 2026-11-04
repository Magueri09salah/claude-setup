import { prisma } from "../src/prisma";

/**
 * ONE-TIME cleanup for the one-phone rule (owner decision 2026-11-02).
 *
 * The rule itself only acts on a login, so an account that was already open on
 * two phones when it shipped would stay that way until somebody logged in
 * again. The owner chose to close those right away: for every candidate account
 * with more than one live session, keep the MOST RECENTLY USED phone and sign
 * the others out.
 *
 * "Most recently used" = the newest live refresh token. Tokens rotate on every
 * refresh, so each signed-in phone holds exactly one live row, created the last
 * time that phone talked to the server.
 *
 * Dry run by default. From /api on the server:
 *   npx tsx prisma/single-session-cleanup.ts            # shows what it would do
 *   npx tsx prisma/single-session-cleanup.ts --apply    # does it
 * Safe to run again: a second run only finds what the first one missed.
 *
 * MUST RUN AFTER THE DEPLOY. The rows are revoked WITHOUT a successor, which
 * the new refresh code treats as a plain sign-out. The old code treated ANY
 * revoked token as theft, so the signed-out phone's next refresh would have
 * revoked the kept phone too. The migration check below enforces the order.
 *
 * Staff are left alone, like the rule itself.
 */
const APPLY = process.argv.includes("--apply");
const RULE_MIGRATION = "20261102100000_single_session";

async function main() {
  const applied = await prisma.$queryRaw<{ ok: number }[]>`
    SELECT 1 AS ok FROM "_prisma_migrations"
    WHERE migration_name = ${RULE_MIGRATION} AND finished_at IS NOT NULL`;
  if (applied.length === 0) {
    console.error(
      `Migration ${RULE_MIGRATION} is not applied. Run ./scripts/deploy.sh first, then this script.`,
    );
    process.exitCode = 1;
    return;
  }

  const live = await prisma.refreshToken.findMany({
    where: { revokedAt: null, expiresAt: { gt: new Date() }, user: { role: "USER" } },
    select: { id: true, userId: true },
    orderBy: [{ userId: "asc" }, { createdAt: "desc" }],
  });

  // Newest first within each account: the first row seen is the phone kept.
  const accounts = new Set<string>();
  const shared = new Set<string>();
  const toRevoke: string[] = [];
  for (const token of live) {
    if (!accounts.has(token.userId)) {
      accounts.add(token.userId);
      continue;
    }
    shared.add(token.userId);
    toRevoke.push(token.id);
  }

  console.log(
    `${accounts.size} candidate account(s) signed in; ${shared.size} on more than one phone; ` +
      `${toRevoke.length} extra phone(s) to sign out.`,
  );
  if (!APPLY) {
    console.log("Dry run: nothing changed. Run again with --apply to sign them out.");
    return;
  }

  // `revokedAt: null` again: a row that rotated or logged out since the read
  // above is left as it is (a rotated row must keep its successor link).
  const { count } = await prisma.refreshToken.updateMany({
    where: { id: { in: toRevoke }, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  console.log(`Signed out ${count} phone(s).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
