-- ============================================================
--  GAMMAL TECH SALARY TRACKER — Database Schema
--  Supabase / PostgreSQL Schema
--  Generated: 2026-06-01
-- ============================================================

-- Enable UUID extension (already on by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. ENUM TYPES
-- ============================================================

-- Role enum: controls what a user can do inside the app
CREATE TYPE user_role AS ENUM ('admin', 'instructor');

-- Report lifecycle states
CREATE TYPE report_status AS ENUM ('pending', 'approved', 'rejected');


-- ============================================================
-- 2. TABLE: users
--
-- WHY IT EXISTS:
--   Central identity table. Supabase Auth handles login tokens,
--   but we keep our own `users` row so we can store app-level
--   data (role, display name) and use it in RLS policies and
--   foreign-key relationships without depending on auth.users
--   column internals.
-- ============================================================

CREATE TABLE users (
    id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name   TEXT          NOT NULL,
    email       TEXT          NOT NULL,
    role        user_role     NOT NULL DEFAULT 'instructor',
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_full_name_not_empty CHECK (TRIM(full_name) <> '')
);

-- Fast lookup by email (auth flow) and by role (admin dashboards)
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role  ON users (role);

COMMENT ON TABLE  users               IS 'Application-level user profiles for admins and instructors.';
COMMENT ON COLUMN users.id            IS 'UUID primary key, matches auth.users.id when using Supabase Auth.';
COMMENT ON COLUMN users.role          IS 'admin = can approve/reject reports; instructor = can submit reports.';


-- ============================================================
-- 3. TABLE: daily_reports
--
-- WHY IT EXISTS:
--   Each day, an instructor submits a single daily report that
--   acts as a container / header for all session line-items
--   worked that day. Keeping the header separate from the items
--   lets admins approve/reject at the report level, add notes,
--   and query aggregates efficiently without scanning every item.
-- ============================================================

CREATE TABLE daily_reports (
    id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    instructor_id UUID          NOT NULL,
    report_date   DATE          NOT NULL,
    status        report_status NOT NULL DEFAULT 'pending',
    admin_note    TEXT,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    -- One instructor, one report per day
    CONSTRAINT daily_reports_unique_per_day UNIQUE (instructor_id, report_date),

    -- Referential integrity
    CONSTRAINT fk_daily_reports_instructor
        FOREIGN KEY (instructor_id)
        REFERENCES users (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    -- Sanity: no future dates
    CONSTRAINT daily_reports_date_not_future
        CHECK (report_date <= CURRENT_DATE)
);

-- Queries: "all reports for instructor X", "all pending reports", date range filters
CREATE INDEX idx_daily_reports_instructor_id ON daily_reports (instructor_id);
CREATE INDEX idx_daily_reports_report_date   ON daily_reports (report_date  DESC);
CREATE INDEX idx_daily_reports_status        ON daily_reports (status);

COMMENT ON TABLE  daily_reports               IS 'One row per instructor per working day; acts as the report envelope.';
COMMENT ON COLUMN daily_reports.instructor_id IS 'FK → users.id; only users with role=instructor should create rows here.';
COMMENT ON COLUMN daily_reports.status        IS 'Lifecycle: pending → approved | rejected by an admin.';
COMMENT ON COLUMN daily_reports.admin_note    IS 'Optional feedback from the admin when approving or rejecting.';


-- ============================================================
-- 4. TABLE: report_items
--
-- WHY IT EXISTS:
--   A single daily report may cover multiple session types
--   (e.g., group session vs. one-on-one) each with a different
--   rate. This child table holds one row per session-type block,
--   allowing flexible, per-line billing while keeping the parent
--   report clean.
--
--   total_amount is a GENERATED ALWAYS column — PostgreSQL
--   computes it automatically from session_count × session_rate.
--   This guarantees mathematical consistency at the DB layer and
--   removes the risk of application-level drift.
-- ============================================================

CREATE TABLE report_items (
    id             UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id      UUID           NOT NULL,
    session_count  INTEGER        NOT NULL,
    session_rate   NUMERIC(10, 2) NOT NULL,

    -- Auto-computed: session_count × session_rate
    total_amount   NUMERIC(12, 2)
        GENERATED ALWAYS AS (session_count * session_rate) STORED,

    CONSTRAINT fk_report_items_report
        FOREIGN KEY (report_id)
        REFERENCES daily_reports (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT report_items_session_count_positive
        CHECK (session_count > 0),

    CONSTRAINT report_items_session_rate_positive
        CHECK (session_rate > 0)
);

-- Core query: "all items for report X" (used by every report detail view)
CREATE INDEX idx_report_items_report_id ON report_items (report_id);

COMMENT ON TABLE  report_items               IS 'Line-items within a daily report; each row = one session-type block.';
COMMENT ON COLUMN report_items.session_count IS 'Number of sessions of this type conducted that day.';
COMMENT ON COLUMN report_items.session_rate  IS 'Rate (in currency units) charged per session.';
COMMENT ON COLUMN report_items.total_amount  IS 'Auto-calculated: session_count × session_rate. Never set manually.';


-- ============================================================
-- 5. HELPER VIEW: report_totals
--
-- WHY IT EXISTS:
--   Provides a quick, pre-aggregated summary per report —
--   total sessions and grand total amount — without requiring
--   the application layer to do SUM() every time. Safe to query
--   from the frontend via Supabase's REST / JS client.
-- ============================================================

CREATE OR REPLACE VIEW report_totals AS
SELECT
    dr.id                       AS report_id,
    dr.instructor_id,
    dr.report_date,
    dr.status,
    u.full_name                 AS instructor_name,
    COALESCE(SUM(ri.session_count),  0)    AS total_sessions,
    COALESCE(SUM(ri.total_amount),   0.00) AS grand_total
FROM daily_reports dr
JOIN users         u  ON u.id  = dr.instructor_id
LEFT JOIN report_items ri ON ri.report_id = dr.id
GROUP BY dr.id, dr.instructor_id, dr.report_date, dr.status, u.full_name;

COMMENT ON VIEW report_totals IS 'Aggregated totals per daily report — use this for dashboard/list views.';


-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_items  ENABLE ROW LEVEL SECURITY;

-- Helper function to break infinite recursion when checking admin roles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_role user_role;
BEGIN
    SELECT role INTO user_role FROM public.users WHERE id = auth.uid();
    RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── users ────────────────────────────────────────────────────

-- Every authenticated user can read their own profile
CREATE POLICY "users: read own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

-- Admins can read all profiles (e.g., instructor list on dashboards)
CREATE POLICY "users: admins read all"
    ON users FOR SELECT
    USING (public.is_admin());

-- ── daily_reports ────────────────────────────────────────────

-- Instructors can only see their own reports
CREATE POLICY "daily_reports: instructor reads own"
    ON daily_reports FOR SELECT
    USING (instructor_id = auth.uid());

-- Admins can see all reports
CREATE POLICY "daily_reports: admins read all"
    ON daily_reports FOR SELECT
    USING (public.is_admin());

-- Instructors can insert their own pending reports
CREATE POLICY "daily_reports: instructor insert own"
    ON daily_reports FOR INSERT
    WITH CHECK (
        instructor_id = auth.uid()
        AND status = 'pending'
    );

-- Only admins can update status/admin_note (approval workflow)
CREATE POLICY "daily_reports: admins update"
    ON daily_reports FOR UPDATE
    USING (public.is_admin());

-- ── report_items ─────────────────────────────────────────────

-- Read: if you can see the parent report, you can see its items
CREATE POLICY "report_items: read via parent report"
    ON report_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM daily_reports dr
            WHERE dr.id = report_id
              AND (
                dr.instructor_id = auth.uid()
                OR public.is_admin()
              )
        )
    );

-- Insert: instructor can only add items to their own pending reports
CREATE POLICY "report_items: instructor insert own"
    ON report_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM daily_reports dr
            WHERE dr.id = report_id
              AND dr.instructor_id = auth.uid()
              AND dr.status = 'pending'
        )
    );

-- Delete: instructor can remove items from their own pending reports
CREATE POLICY "report_items: instructor delete own pending"
    ON report_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM daily_reports dr
            WHERE dr.id = report_id
              AND dr.instructor_id = auth.uid()
              AND dr.status = 'pending'
        )
    );


-- ============================================================
-- 6.5. AUTOMATIC USER PROFILE CREATION (TRIGGERS)
-- ============================================================

-- Function to handle new user profile insertion
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_name TEXT;
BEGIN
    -- Extract full name from metadata, fallback to email username, then default label
    default_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
        SPLIT_PART(NEW.email, '@', 1),
        'Gammal Tech User'
    );

    INSERT INTO public.users (id, full_name, email, role)
    VALUES (
        NEW.id,
        default_name,
        NEW.email,
        'instructor' -- Default role
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run handle_new_user when an auth.user is created
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 7. SEED DATA (optional — remove before production)
-- ============================================================

-- Admin user
INSERT INTO users (id, full_name, email, role)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Admin User',
    'admin@example.com',
    'admin'
);

-- Instructor user
INSERT INTO users (id, full_name, email, role)
VALUES (
    'b0000000-0000-0000-0000-000000000002',
    'Instructor Ahmed',
    'ahmed@example.com',
    'instructor'
);

-- Daily report for instructor
INSERT INTO daily_reports (id, instructor_id, report_date, status)
VALUES (
    'c0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000002',
    CURRENT_DATE - INTERVAL '1 day',
    'pending'
);

-- Two session types on that report
INSERT INTO report_items (report_id, session_count, session_rate)
VALUES
    ('c0000000-0000-0000-0000-000000000003', 3, 150.00),  -- total_amount = 450.00
    ('c0000000-0000-0000-0000-000000000003', 1, 250.00);  -- total_amount = 250.00

-- Grand total for that report = 700.00
-- Verify with: SELECT * FROM report_totals;
