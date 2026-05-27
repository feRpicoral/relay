-- Distinguish operator-canceled campaigns from naturally-completed ones.
-- `completed_at` previously was reused for both, which obscured analytics
-- ("why did this campaign end early?").

ALTER TABLE "campaigns" ADD COLUMN "canceled_at" TIMESTAMP(3);
