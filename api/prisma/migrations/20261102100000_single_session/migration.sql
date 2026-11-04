-- One phone per candidate account (owner decision 2026-11-02).
--
-- Every candidate login writes a fresh key here and stamps it into the tokens
-- it issues; requests carrying an older key are refused, which signs the
-- previous phone out.
--
-- Additive only, and NULL for every existing account: nobody is logged out by
-- the deploy itself. The rule takes hold on each account's next login.

ALTER TABLE "User" ADD COLUMN "sessionKey" TEXT;
