-- ============================================================
-- 003: AI Brain — Context Files, Memories, Conversations
-- Run in Supabase SQL Editor
-- ============================================================

-- ----------------------------------------
-- AI CONTEXT FILES
-- "Brain files" the AI reads before every action.
-- These are editable documents that define company knowledge,
-- communication style, sales process, etc.
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS ai_context_files (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,                    -- "Company Profile", "Communication Style"
  description TEXT,                             -- what this file is for (shown in UI)
  content     TEXT NOT NULL DEFAULT '',         -- the actual markdown content
  is_active   BOOLEAN NOT NULL DEFAULT true,    -- whether AI reads this file
  sort_order  INTEGER NOT NULL DEFAULT 0,       -- display order
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------
-- AI MEMORIES
-- Everything the AI learns over time:
-- style corrections from edited drafts, lead facts,
-- company knowledge added manually, patterns noticed.
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS ai_memories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type       TEXT NOT NULL,         -- style_correction | lead_fact | company_knowledge | pattern
  title      TEXT NOT NULL,         -- short one-line summary (shown in UI)
  content    TEXT NOT NULL,         -- the full memory content
  lead_id    UUID REFERENCES leads(id) ON DELETE CASCADE,   -- null = global memory
  source     TEXT,                  -- draft_edit | chat | manual | interaction
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_memories_type_idx    ON ai_memories(type);
CREATE INDEX IF NOT EXISTS ai_memories_lead_id_idx ON ai_memories(lead_id);
CREATE INDEX IF NOT EXISTS ai_memories_active_idx  ON ai_memories(is_active);

-- ----------------------------------------
-- AI CONVERSATIONS
-- Persistent chat history so context carries across sessions.
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS ai_conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT,                              -- auto-generated from first message
  messages   JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{role, content, timestamp}]
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------
-- ADD original_body TO email_drafts
-- Needed to detect edits and learn from them.
-- ----------------------------------------
ALTER TABLE email_drafts
  ADD COLUMN IF NOT EXISTS original_body TEXT,
  ADD COLUMN IF NOT EXISTS original_subject TEXT,
  ADD COLUMN IF NOT EXISTS edit_learned BOOLEAN DEFAULT false;

-- Backfill: set original = current body for existing drafts
UPDATE email_drafts SET original_body = body, original_subject = subject WHERE original_body IS NULL;

-- ----------------------------------------
-- RLS POLICIES
-- ----------------------------------------
ALTER TABLE ai_context_files  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_memories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_ai_context_files"  ON ai_context_files  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_ai_memories"       ON ai_memories        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_ai_conversations"  ON ai_conversations   FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------
-- TRIGGERS
-- ----------------------------------------
CREATE TRIGGER ai_context_files_updated_at
  BEFORE UPDATE ON ai_context_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------
-- SEED DEFAULT CONTEXT FILES
-- ----------------------------------------
INSERT INTO ai_context_files (name, description, content, sort_order) VALUES

('Company Profile',
 'Who Gulf Life Concierge is, what they do, their market and values.',
 E'# Gulf Life Concierge — Company Profile\n\n## Who We Are\nGulf Life Concierge is a luxury vacation rental and property management company serving the 30A Gulf Coast of Florida — one of the most sought-after vacation destinations in the Southeast. We specialize in connecting discerning travelers and property owners with premium properties in Rosemary Beach, Alys Beach, WaterColor, WaterSound, Seaside, and surrounding communities.\n\n## What We Do\n- **Vacation Rental Management**: Full-service management of high-end Gulf Coast properties\n- **Concierge Services**: Personalized trip planning, local recommendations, VIP experiences\n- **Property Acquisition Consulting**: Help buyers find investment properties in the 30A corridor\n\n## Our Market\n- High-income families and couples seeking premium Gulf Coast experiences\n- Property investors looking for rental income in the 30A market\n- Repeat guests who have experienced 30A and want a trusted local concierge\n- Average booking value: $3,000–$15,000/week depending on property\n\n## Our Differentiators\n- Deep local knowledge of every neighborhood, beach access point, and hidden gem\n- White-glove service from inquiry to checkout\n- Curated property portfolio — we only represent properties we believe in\n- Personal relationships: our guests know they have a real human they can call',
 1),

('Communication Style',
 'How we write and speak with leads — tone, voice, phrases to use and avoid.',
 E'# Communication Style Guide\n\n## Core Tone\n**Warm, confident, and personal.** We are not a corporate sales team — we are local experts who love where we live and want to share it. Every communication should feel like it came from a knowledgeable friend, not a salesperson.\n\n## Voice Principles\n- **Personal**: Use their name. Reference what they told us. Show we remember them.\n- **Experiential**: Talk about experiences, not just properties. "Waking up to the sound of the Gulf" beats "3BR beachfront property."\n- **Low pressure**: We never push. We invite. Let the destination sell itself.\n- **Concise**: Respect their time. 3 short paragraphs max for emails.\n- **Warm closing**: Always end with a genuine, low-pressure next step.\n\n## Phrases We Use\n- "I wanted to reach out personally..."\n- "Based on what you shared with us..."\n- "This might be exactly what you described..."\n- "Whenever you\'re ready..."\n- "Happy to answer any questions at all."\n\n## Phrases We Avoid\n- "Just following up" (lazy, impersonal)\n- "Circling back" (corporate)\n- "Per my last email" (passive aggressive)\n- "As per our conversation" (formal)\n- "I wanted to touch base" (meaningless)\n- Excessive exclamation points\n- Urgency language ("Act now!", "Limited availability!")\n\n## Signature\nEmails should feel complete without a formal signature block — the warmth carries it. Sign with first name only.',
 2),

('Sales Process',
 'Our pipeline stages, how leads move through them, and how we handle common situations.',
 E'# Sales Process\n\n## Pipeline Stages\n1. **New** — Inquiry received. Goal: respond within 1 hour, qualify budget/dates/group size.\n2. **Contacted** — First contact made. Goal: understand exactly what they want, share 2-3 relevant properties.\n3. **Nurturing** — Interest confirmed but not ready to book. Goal: stay top of mind with value, not pressure. Follow up every 5-7 days.\n4. **Proposal** — Specific property/dates proposed. Goal: answer objections, close within 72 hours.\n5. **Closed Won** — Booking confirmed. Transition to guest experience.\n6. **Closed Lost** — Didn\'t book. Note the reason, leave door open for future.\n\n## Follow-up Cadence\n- New lead: contact within 1 hour\n- Contacted: follow up in 3 days if no response\n- Nurturing: follow up every 5-7 days with something of value (new property, local event, etc.)\n- Proposal: follow up in 48 hours, then 72 hours, then one final check-in at 1 week\n\n## Common Objections\n- **"Too expensive"**: Reframe around value per person per night. Offer smaller property or off-peak dates.\n- **"Not ready to commit"**: Clarify dates, offer to hold tentatively, reduce friction.\n- **"Looking at other options"**: Ask what would make this the right choice. Don\'t compete on price.\n- **"Need to check with spouse/partner"**: Offer a quick call with both, or send something shareable.\n\n## What Closes Deals\n- Personal connection and remembering details\n- Specific property matches to their stated needs\n- Social proof (reviews, past guest experiences)\n- Low-pressure, clear next steps\n- Quick response times',
 3),

('Properties & Market',
 'Key info about the 30A market, property types, pricing ranges, and neighborhoods.',
 E'# 30A Market & Properties\n\n## The 30A Corridor\n30A is a scenic highway along the Gulf Coast of Northwest Florida, running through some of the most exclusive beach communities in the Southeast. Known for sugar-white sand, emerald water, and a collection of planned communities with distinct characters.\n\n## Key Communities\n- **Rosemary Beach**: Upscale, walkable, European-inspired architecture. Premium pricing.\n- **Alys Beach**: Ultra-luxury, all-white architecture. Highest price point on 30A.\n- **WaterColor**: Florida state park adjacent, laid-back luxury, popular with families.\n- **WaterSound**: Quieter, newer, excellent for privacy-seekers.\n- **Seaside**: Famous planned community, vibrant town center, iconic architecture.\n- **Grayton Beach**: More rustic, bohemian feel, old-Florida character.\n\n## Pricing Ranges (weekly rentals)\n- 2BR/smaller: $2,000–$5,000/week\n- 3-4BR standard: $4,000–$8,000/week\n- 4-5BR premium/Gulf-front: $7,000–$15,000/week\n- Large estate/Gulf-front luxury: $15,000–$25,000+/week\n\n## Peak Seasons\n- **Peak**: Memorial Day – Labor Day (June/July highest)\n- **Shoulder**: Spring Break (March-April), Fall breaks (October)\n- **Off-peak**: November–February (excellent value, great for remote workers)\n\n## What Guests Want Most\n1. Gulf-front or Gulf-view\n2. Private pool\n3. Walkability to dining/shops\n4. Large groups (8-16 people)\n5. Pet-friendly',
 4)

ON CONFLICT DO NOTHING;
