DROP TABLE IF EXISTS "posts";

DROP INDEX IF EXISTS "users_stripe_customer_id_key";
DROP INDEX IF EXISTS "users_stripe_subscription_id_key";

ALTER TABLE "users"
  DROP COLUMN IF EXISTS "stripe_customer_id",
  DROP COLUMN IF EXISTS "stripe_subscription_id",
  DROP COLUMN IF EXISTS "stripe_price_id",
  DROP COLUMN IF EXISTS "stripe_current_period_end";
