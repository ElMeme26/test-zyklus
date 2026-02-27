-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.assets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tag text,
  name text NOT NULL,
  description text,
  category text,
  brand text,
  model text,
  serial text,
  part_number text,
  project text,
  commercial_value numeric,
  invoice text,
  import_type text,
  status text DEFAULT 'Operativa'::text,
  image text,
  location text,
  maintenance_period_days integer DEFAULT 180,
  next_maintenance_date date,
  created_at timestamp with time zone DEFAULT now(),
  bundle_id uuid,
  usage_count integer DEFAULT 0,
  maintenance_usage_threshold integer DEFAULT 10,
  maintenance_alert boolean DEFAULT false,
  CONSTRAINT assets_pkey PRIMARY KEY (id),
  CONSTRAINT assets_bundle_id_fkey FOREIGN KEY (bundle_id) REFERENCES public.bundles(id)
);
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  timestamp timestamp with time zone DEFAULT now(),
  action text CHECK (action = ANY (ARRAY['CREATE'::text, 'APPROVE'::text, 'REJECT'::text, 'CHECKOUT'::text, 'CHECKIN'::text, 'UPDATE'::text, 'ALERT'::text, 'MAINTENANCE'::text])),
  actor_id uuid,
  actor_name text,
  target_id text NOT NULL,
  target_type text CHECK (target_type = ANY (ARRAY['REQUEST'::text, 'ASSET'::text, 'USER'::text, 'INSTITUTION'::text])),
  details text,
  metadata jsonb,
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.bundles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bundles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.external_loan_items (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  loan_id uuid,
  asset_id uuid,
  return_condition text,
  is_damaged boolean DEFAULT false,
  CONSTRAINT external_loan_items_pkey PRIMARY KEY (id),
  CONSTRAINT external_loan_items_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.external_loans(id),
  CONSTRAINT external_loan_items_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id)
);
CREATE TABLE public.external_loans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_id bigint,
  status text CHECK (status = ANY (ARRAY['PENDING'::text, 'ACTIVE'::text, 'RETURNED'::text, 'OVERDUE'::text])),
  loan_duration_days integer,
  qr_code text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  checkout_at timestamp with time zone,
  checkin_at timestamp with time zone,
  security_check_step integer DEFAULT 0,
  security_notes text,
  CONSTRAINT external_loans_pkey PRIMARY KEY (id),
  CONSTRAINT external_loans_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
  CONSTRAINT external_loans_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.institutions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT institutions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.maintenance_logs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  asset_id uuid,
  reported_by_user_id uuid,
  issue_description text,
  cost numeric,
  status text DEFAULT 'OPEN'::text,
  created_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  CONSTRAINT maintenance_logs_pkey PRIMARY KEY (id),
  CONSTRAINT maintenance_logs_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id),
  CONSTRAINT maintenance_logs_reported_by_user_id_fkey FOREIGN KEY (reported_by_user_id) REFERENCES public.users(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  request_id bigint,
  asset_id uuid,
  type text DEFAULT 'INFO'::text CHECK (type = ANY (ARRAY['WARNING'::text, 'ALERT'::text, 'INFO'::text, 'CRITICAL'::text])),
  channel text DEFAULT 'IN_APP'::text CHECK (channel = ANY (ARRAY['IN_APP'::text, 'CHAT'::text, 'EMAIL'::text])),
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT notifications_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id),
  CONSTRAINT notifications_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id)
);
CREATE TABLE public.requests (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  asset_id uuid,
  user_id uuid,
  institution_id bigint,
  requester_name text,
  requester_disciplina text,
  days_requested integer,
  motive text,
  status text DEFAULT 'PENDING'::text CHECK (status = ANY (ARRAY['PENDING'::text, 'ACTION_REQUIRED'::text, 'APPROVED'::text, 'ACTIVE'::text, 'OVERDUE'::text, 'RETURNED'::text, 'MAINTENANCE'::text, 'REJECTED'::text, 'CANCELLED'::text])),
  created_at timestamp with time zone DEFAULT now(),
  approved_at timestamp with time zone,
  checkout_at timestamp with time zone,
  expected_return_date timestamp with time zone,
  returned_at timestamp with time zone,
  return_condition text,
  feedback_log text,
  security_check_step integer DEFAULT 0,
  security_notes text,
  rejection_feedback text,
  qr_code text,
  qr_expires_at timestamp with time zone,
  digital_signature text,
  is_damaged boolean DEFAULT false,
  damage_notes text,
  checkin_at timestamp with time zone,
  bundle_group_id text,
  CONSTRAINT requests_pkey PRIMARY KEY (id),
  CONSTRAINT requests_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id),
  CONSTRAINT requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT requests_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id)
);
CREATE TABLE public.system_settings (
  key text NOT NULL,
  value text NOT NULL,
  description text,
  CONSTRAINT system_settings_pkey PRIMARY KEY (key)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text CHECK (role = ANY (ARRAY['AUDITOR'::text, 'ADMIN_PATRIMONIAL'::text, 'LIDER_EQUIPO'::text, 'USUARIO'::text, 'GUARDIA'::text])),
  disciplina text,
  avatar text,
  phone text,
  manager_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  password_hash text,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(id)
);