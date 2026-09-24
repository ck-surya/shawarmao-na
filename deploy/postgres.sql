BEGIN;
CREATE SCHEMA IF NOT EXISTS restaurant;
REVOKE ALL ON SCHEMA restaurant FROM PUBLIC;
CREATE TABLE IF NOT EXISTS restaurant.menu_items (
  id uuid PRIMARY KEY, ordinal bigint GENERATED ALWAYS AS IDENTITY, data jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS restaurant.orders (
  id uuid PRIMARY KEY, ordinal bigint GENERATED ALWAYS AS IDENTITY,
  number text UNIQUE NOT NULL, token text UNIQUE NOT NULL,
  request_key uuid UNIQUE NOT NULL, request_hash text NOT NULL, data jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS restaurant.order_status_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES restaurant.orders(id), status text NOT NULL, at text NOT NULL
);
CREATE INDEX IF NOT EXISTS history_order_idx ON restaurant.order_status_history(order_id,id);
CREATE TABLE IF NOT EXISTS restaurant.sessions (token text PRIMARY KEY, expires bigint NOT NULL);
CREATE TABLE IF NOT EXISTS restaurant.rate_limits (key text PRIMARY KEY,count integer NOT NULL, expires bigint NOT NULL);
ALTER TABLE restaurant.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant.rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA restaurant FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA restaurant FROM PUBLIC;
-- The server connects as the schema owner. No browser-facing Supabase API has access.
COMMIT;
