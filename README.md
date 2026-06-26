# Gulf Life CRM

Internal sales CRM for Gulf Life Concierge. Built with Next.js 15 + Supabase.

---

## Setup (5 steps)

### 1. Install dependencies
```bash
cd "John's-CRM"
npm install
```

### 2. Run the database schema
1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/anglubpxgtsecnvroznl/sql/new)
2. Paste the contents of `supabase/migrations/001_initial_schema.sql`
3. Click **Run**

### 3. Get your API keys
Go to [Project Settings → API](https://supabase.com/dashboard/project/anglubpxgtsecnvroznl/settings/api) and copy:
- `anon` public key
- `service_role` secret key (keep this private)

### 4. Fill in `.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=https://anglubpxgtsecnvroznl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=paste_anon_key
SUPABASE_SERVICE_ROLE_KEY=paste_service_role_key
```

### 5. Create your first user
1. Go to [Supabase Auth](https://supabase.com/dashboard/project/anglubpxgtsecnvroznl/auth/users)
2. Click **Add user → Create new user**
3. Fill in email + password
4. After creating, run this in the SQL editor to make them the owner:
```sql
UPDATE profiles SET role = 'owner', full_name = 'John' WHERE id = 'paste-user-id-here';
```

### Run locally
```bash
npm run dev
# Open http://localhost:3000
```

---

## What's built

| Page | URL | Description |
|------|-----|-------------|
| Login | `/login` | Email/password auth |
| Dashboard | `/crm` | Pipeline stats, recent leads, follow-up queue |
| Leads | `/crm/leads` | Kanban board — drag leads between stages |
| Lead Detail | `/crm/leads/:id` | Full lead profile, activity timeline, notes, status control |
| Sequences | `/crm/sequences` | Phase 2 — drip campaigns |
| Settings | `/crm/settings` | Profile + workspace info |

## Pipeline stages
`New → Contacted → Nurturing → Proposal → Won / Lost`

## Phase 2 (next build)
- [ ] Twilio SMS automation
- [ ] Resend email sequences
- [ ] OpenAI AI follow-up drafts
- [ ] Daily morning digest via iMessage
- [ ] Lead scoring
- [ ] Owner vs sales rep permissions enforcement
