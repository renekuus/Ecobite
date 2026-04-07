-- EcoBite Platform v2 — Master Schema Reference
-- Human-readable consolidated view. Migrations/ are the executable source of truth.
-- To recreate from scratch: run migrations 001–021 in order.
--
-- Prerequisites:
--   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--   CREATE EXTENSION IF NOT EXISTS "postgis";      -- for zone polygons
--
-- ─────────────────────────────────────────────────────────────────────────────
-- IDENTITY & AUTH
-- ─────────────────────────────────────────────────────────────────────────────

-- customers
-- id, email, phone, name, status, stripe_customer_id, locale, created_at, updated_at

-- customer_addresses
-- id, customer_id→customers, label, street, city, postal_code, country, lat, lng, is_default

-- couriers
-- id, email, phone, name, status[active|inactive|on_shift|suspended],
-- vehicle_type[bike|cargo_bike|scooter|walk], rating, stripe_account_id,
-- device_token, created_at

-- courier_shifts
-- id, courier_id→couriers, started_at, ended_at, status[active|completed|abandoned]

-- ─────────────────────────────────────────────────────────────────────────────
-- MERCHANT SIDE
-- ─────────────────────────────────────────────────────────────────────────────

-- merchants
-- id, name, slug[unique], group[qsr|restaurant|darkstore|other], status,
-- lat, lng, address, commission_rate, delivery_fee_fixed, min_order_value,
-- prep_time_estimate_min, s3_logo_key, operating_hours[JSONB], created_at, updated_at

-- merchant_users
-- id, merchant_id→merchants, email, role[owner|staff|view_only], password_hash, created_at

-- products
-- id, merchant_id→merchants, name, description, category, price,
-- s3_image_key, is_available, is_archived, dietary_flags[JSONB], sort_order, created_at, updated_at

-- product_modifiers
-- id, product_id→products, name, price_delta, is_required, max_select, sort_order

-- ─────────────────────────────────────────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────────────────────────────────────────

-- orders
-- id[UUID default uuid_generate_v4()], order_number[unique generated],
-- customer_id→customers, merchant_id→merchants, courier_id→couriers[nullable],
-- status[placed|confirmed|preparing|ready|assigned|picked_up|delivering|delivered|cancelled|failed],
-- delivery_address_id→customer_addresses,
-- delivery_address_snapshot[JSONB],    -- frozen at order time: street, city, lat, lng
-- subtotal, delivery_fee, service_fee, tip,
-- commission_amount, gross_profit,
-- estimated_delivery_at, actual_delivered_at,
-- notes, cancellation_reason, created_at, updated_at

-- order_items
-- id, order_id→orders, product_id→products[nullable on delete set null],
-- product_name_snapshot, price_snapshot,   -- frozen at order time
-- quantity, modifier_snapshot[JSONB], line_total

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIPS
-- ─────────────────────────────────────────────────────────────────────────────

-- trips
-- id[UUID], courier_id→couriers, status[pending|active|completed|cancelled],
-- started_at, completed_at, total_km, courier_payout, created_at

-- trip_stops
-- id, trip_id→trips, order_id→orders[nullable], merchant_id→merchants[nullable],
-- stop_type[pickup|dropoff], sequence_number,
-- address_snapshot[JSONB],   -- lat, lng, street
-- arrived_at, completed_at, distance_from_previous_km

-- ─────────────────────────────────────────────────────────────────────────────
-- AUDIT / EVENT LOG
-- ─────────────────────────────────────────────────────────────────────────────

-- order_events
-- id, order_id→orders, actor_type[customer|courier|merchant|system], actor_id[nullable],
-- from_status, to_status, created_at, metadata[JSONB]

-- trip_events
-- id, trip_id→trips, courier_id→couriers[nullable], from_status, to_status,
-- created_at, metadata[JSONB]

-- ─────────────────────────────────────────────────────────────────────────────
-- PAYMENTS & PAYOUTS
-- ─────────────────────────────────────────────────────────────────────────────

-- payments
-- id, order_id→orders[unique], customer_id→customers, amount, currency,
-- stripe_payment_intent_id[unique], status[pending|succeeded|failed|refunded], created_at

-- payouts
-- id, recipient_type[courier|merchant], recipient_id,
-- period_from, period_to, amount, currency,
-- stripe_transfer_id[unique nullable], status[pending|processing|paid|failed], created_at

-- ─────────────────────────────────────────────────────────────────────────────
-- REVIEWS
-- ─────────────────────────────────────────────────────────────────────────────

-- reviews
-- id, order_id→orders[unique], customer_id→customers,
-- courier_id→couriers[nullable], merchant_id→merchants[nullable],
-- courier_rating[1-5], merchant_rating[1-5], comment, created_at

-- ─────────────────────────────────────────────────────────────────────────────
-- GEOGRAPHY & PRICING
-- ─────────────────────────────────────────────────────────────────────────────

-- zones
-- id, name, type[delivery_zone|pricing_zone|surge_zone],
-- polygon[GEOMETRY(POLYGON, 4326)],   -- PostGIS
-- is_active, created_at

-- pricing_rules
-- id, zone_id→zones[nullable], merchant_group[nullable],
-- delivery_fee, surge_multiplier, valid_from, valid_to

-- ─────────────────────────────────────────────────────────────────────────────
-- PLATFORM CONFIG
-- ─────────────────────────────────────────────────────────────────────────────

-- settings
-- id, key[unique], value[JSONB], description, updated_at, updated_by

-- notifications
-- id, recipient_type[customer|courier|merchant_user], recipient_id,
-- channel[push|sms|email], template, payload[JSONB],
-- sent_at, delivered_at, failed_at, created_at

-- ─────────────────────────────────────────────────────────────────────────────
-- EXTENSIONS & SHARED ENUM TYPES  (001)
-- ─────────────────────────────────────────────────────────────────────────────
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- CREATE EXTENSION IF NOT EXISTS "pg_trgm";
-- CREATE EXTENSION IF NOT EXISTS postgis;   -- loaded in 018
--
-- CREATE TYPE merchant_group AS ENUM ('qsr','restaurant','darkstore','other');
-- CREATE TYPE vehicle_type   AS ENUM ('bike','cargo_bike','scooter','walk');
-- CREATE TYPE order_status   AS ENUM ('placed','confirmed','preparing','ready',
--   'assigned','picked_up','delivering','delivered','cancelled','failed');
-- CREATE TYPE trip_status    AS ENUM ('pending','active','completed','cancelled');
-- CREATE TYPE courier_status AS ENUM ('active','on_shift','inactive','suspended');
-- CREATE TYPE stop_type      AS ENUM ('pickup','dropoff');
-- CREATE TYPE actor_type     AS ENUM ('customer','courier','merchant','system');
-- CREATE TYPE payment_status AS ENUM ('pending','succeeded','failed','refunded');
-- CREATE TYPE payout_status  AS ENUM ('pending','processing','paid','failed');
-- CREATE TYPE payout_recipient_type       AS ENUM ('courier','merchant');
-- CREATE TYPE notification_channel        AS ENUM ('push','sms','email');
-- CREATE TYPE notification_recipient_type AS ENUM ('customer','courier','merchant_user');
-- CREATE TYPE zone_type      AS ENUM ('delivery_zone','pricing_zone','surge_zone');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE INDEX
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration  Table                  MVP-essential?  Notes
-- 001        customers              YES
-- 002        customer_addresses     YES
-- 003        merchants              YES
-- 004        merchant_users         YES
-- 005        products               YES
-- 006        product_modifiers      YES
-- 007        couriers               YES
-- 008        courier_shifts         YES
-- 009        orders                 YES             Central entity
-- 010        order_items            YES
-- 011        trips                  YES
-- 012        trip_stops             YES
-- 013        order_events           YES             Audit trail
-- 014        trip_events            YES             Audit trail
-- 015        payments               YES
-- 016        payouts                LATER           Weekly batch job
-- 017        reviews                LATER           Post-MVP feature
-- 018        zones                  LATER           Geo-fencing, surge pricing
-- 019        pricing_rules          LATER           Dynamic pricing
-- 020        settings               YES             Platform config
-- 021        notifications          YES
