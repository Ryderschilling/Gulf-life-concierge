-- ============================================================
-- John's CRM — Initial Schema
-- Run this in: Supabase Dashboard > SQL Editor
-- Project: https://anglubpxgtsecnvroznl.supabase.co
-- ============================================================

-- -------------------------------------------------------
-- PROFILES (extends auth.users — one row per user)
-- -------------------------------------------------------
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  role text not null check (role in ('owner', 'sales_rep')) default 'sales_rep',
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'sales_rep')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- -------------------------------------------------------
-- LEADS
-- -------------------------------------------------------
create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  -- Core info
  name text not null,
  email text,
  phone text,
  company text,
  -- CRM fields
  status text not null check (
    status in ('new', 'contacted', 'nurturing', 'proposal', 'closed_won', 'closed_lost')
  ) default 'new',
  source text check (
    source in ('website', 'referral', 'cold_call', 'social', 'email', 'other')
  ),
  assigned_to uuid references profiles(id) on delete set null,
  -- Property-specific context
  property_interest text,
  budget_range text,
  move_in_timeline text,
  -- Tracking
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  -- Meta
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leads_updated_at
  before update on leads
  for each row execute procedure update_updated_at();

-- -------------------------------------------------------
-- LEAD NOTES
-- -------------------------------------------------------
create table if not exists lead_notes (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references leads(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete set null,
  body text not null,
  created_at timestamptz default now() not null
);

-- -------------------------------------------------------
-- LEAD ACTIVITIES (full timeline)
-- -------------------------------------------------------
create table if not exists lead_activities (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references leads(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete set null,
  type text not null check (
    type in ('note', 'email_sent', 'email_received', 'sms_sent', 'sms_received', 'call', 'status_change', 'ai_draft', 'created')
  ),
  body text,
  metadata jsonb, -- e.g. { "from_status": "new", "to_status": "contacted" }
  created_at timestamptz default now() not null
);

-- -------------------------------------------------------
-- SEQUENCES (drip campaign templates)
-- -------------------------------------------------------
create table if not exists sequences (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  trigger_status text check (
    trigger_status in ('new', 'contacted', 'nurturing', 'proposal')
  ),
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create trigger sequences_updated_at
  before update on sequences
  for each row execute procedure update_updated_at();

-- -------------------------------------------------------
-- SEQUENCE STEPS
-- -------------------------------------------------------
create table if not exists sequence_steps (
  id uuid default gen_random_uuid() primary key,
  sequence_id uuid references sequences(id) on delete cascade not null,
  step_number int not null,
  channel text not null check (channel in ('email', 'sms')),
  delay_days int not null default 0,
  subject text, -- email only
  body text not null,
  created_at timestamptz default now() not null,
  unique(sequence_id, step_number)
);

-- -------------------------------------------------------
-- LEAD ENROLLMENTS (leads enrolled in a sequence)
-- -------------------------------------------------------
create table if not exists lead_enrollments (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references leads(id) on delete cascade not null,
  sequence_id uuid references sequences(id) on delete cascade not null,
  current_step int not null default 0,
  status text not null check (
    status in ('active', 'paused', 'completed', 'cancelled')
  ) default 'active',
  enrolled_at timestamptz default now() not null,
  next_step_at timestamptz,
  unique(lead_id, sequence_id)
);

-- -------------------------------------------------------
-- ROW LEVEL SECURITY
-- -------------------------------------------------------
alter table profiles enable row level security;
alter table leads enable row level security;
alter table lead_notes enable row level security;
alter table lead_activities enable row level security;
alter table sequences enable row level security;
alter table sequence_steps enable row level security;
alter table lead_enrollments enable row level security;

-- Profiles: users see their own profile; owners see all
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Owners can view all profiles" on profiles
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Leads: all authenticated users can read and write
create policy "Authenticated users can view leads" on leads
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert leads" on leads
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update leads" on leads
  for update using (auth.role() = 'authenticated');

create policy "Owners can delete leads" on leads
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

-- Lead notes: all authenticated users
create policy "Authenticated users can manage lead_notes" on lead_notes
  for all using (auth.role() = 'authenticated');

-- Lead activities: all authenticated users
create policy "Authenticated users can manage lead_activities" on lead_activities
  for all using (auth.role() = 'authenticated');

-- Sequences: all authenticated users can view, owners can manage
create policy "Authenticated users can view sequences" on sequences
  for select using (auth.role() = 'authenticated');

create policy "Owners can manage sequences" on sequences
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

-- Sequence steps
create policy "Authenticated users can view sequence_steps" on sequence_steps
  for select using (auth.role() = 'authenticated');

create policy "Owners can manage sequence_steps" on sequence_steps
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

-- Lead enrollments
create policy "Authenticated users can manage lead_enrollments" on lead_enrollments
  for all using (auth.role() = 'authenticated');

-- -------------------------------------------------------
-- INDEXES for performance
-- -------------------------------------------------------
create index if not exists leads_status_idx on leads(status);
create index if not exists leads_assigned_to_idx on leads(assigned_to);
create index if not exists leads_created_at_idx on leads(created_at desc);
create index if not exists lead_notes_lead_id_idx on lead_notes(lead_id);
create index if not exists lead_activities_lead_id_idx on lead_activities(lead_id);
create index if not exists lead_activities_created_at_idx on lead_activities(created_at desc);
create index if not exists lead_enrollments_lead_id_idx on lead_enrollments(lead_id);

-- -------------------------------------------------------
-- SEED: sample data (remove before production)
-- -------------------------------------------------------
-- Uncomment to add sample leads for testing:
-- insert into leads (name, email, phone, status, source, property_interest, budget_range)
-- values
--   ('Sarah Mitchell', 'sarah@example.com', '850-555-0101', 'new', 'website', 'Beach Front', '$3,000-5,000/mo'),
--   ('Tom Reynolds', 'tom@example.com', '850-555-0102', 'contacted', 'referral', 'Homes With Private Pools', '$4,000-6,000/mo'),
--   ('Jennifer Walsh', 'jen@example.com', '850-555-0103', 'nurturing', 'social', 'Resort Vacation', '$2,000-3,000/mo'),
--   ('Mike Davidson', 'mike@example.com', '850-555-0104', 'proposal', 'cold_call', 'Beach Front', '$5,000+/mo'),
--   ('Lisa Chen', 'lisa@example.com', '850-555-0105', 'closed_won', 'referral', 'Beach Front', '$4,500/mo');
