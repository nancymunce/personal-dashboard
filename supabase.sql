-- Personal Dashboard — Supabase setup
-- Run this in your Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Project: desygsdzinuvofjufvft.supabase.co (same project as the Reseller Command Center)
--
-- What it does:
--   1. Creates public.personal_dashboard_resources
--   2. Turns on Row Level Security (RLS)
--   3. Public read (these are public links), authenticated-only insert/update/delete
--   4. Seeds the 22 links from the Personal Dashboard
-- Safe to run twice: CREATE TABLE / CREATE POLICY use IF NOT EXISTS guards
-- (policies are dropped and recreated), and the seed only inserts when the
-- table is empty.

create table if not exists public.personal_dashboard_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  url text not null,
  category text not null,
  description text not null default '',
  type text not null default '',
  tags text[] not null default '{}',
  favorite boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.personal_dashboard_resources enable row level security;

-- Anyone can read the links (they are all public websites).
drop policy if exists "Public read" on public.personal_dashboard_resources;
create policy "Public read"
  on public.personal_dashboard_resources for select using (true);

-- Only a signed-in user can add, change, or delete links.
-- (Same idea as the Reseller Command Center: writes are auth-gated.)
drop policy if exists "Authenticated insert" on public.personal_dashboard_resources;
create policy "Authenticated insert"
  on public.personal_dashboard_resources for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated update" on public.personal_dashboard_resources;
create policy "Authenticated update"
  on public.personal_dashboard_resources for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated delete" on public.personal_dashboard_resources;
create policy "Authenticated delete"
  on public.personal_dashboard_resources for delete
  using (auth.role() = 'authenticated');

-- Seed the 22 links (only when the table is empty, so re-running is safe).
insert into public.personal_dashboard_resources
  (name, url, category, description, type, tags, favorite, sort_order)
select name, url, category, description, type, tags, favorite, sort_order
from (values
  ('Etsy — a flourishing lifestyle', 'https://flourishinglifestyle.etsy.com', 'Resale & Shops', 'Your Etsy shop, ''a flourishing lifestyle''.', 'Shop', ARRAY['etsy', 'shop', 'vintage', 'selling']::text[], true, 0),
  ('eBay', 'https://www.ebay.com/', 'Resale & Shops', 'Buy and sell on eBay — listings, sold comps, and orders.', 'Marketplace', ARRAY['ebay', 'selling', 'comps', 'marketplace']::text[], false, 1),
  ('Facebook Marketplace', 'https://www.facebook.com/marketplace/', 'Resale & Shops', 'Local buying and selling on Facebook Marketplace.', 'Marketplace', ARRAY['facebook', 'marketplace', 'local', 'selling']::text[], false, 2),
  ('Poshmark', 'https://poshmark.com/', 'Resale & Shops', 'Your Poshmark closet for clothing and accessories.', 'Marketplace', ARRAY['poshmark', 'closet', 'clothing', 'selling']::text[], false, 3),
  ('Vendoo', 'https://www.vendoo.co', 'Resale & Shops', 'Cross-listing tool — list once and post to eBay, Poshmark, Facebook Marketplace, and more.', 'Cross-listing Tool', ARRAY['resale', 'cross-listing', 'selling']::text[], false, 4),
  ('aflourishinglifestyle.com', 'https://aflourishinglifestyle.com', 'My Sites & Projects', 'Your ''A Flourishing Lifestyle'' website.', 'Website', ARRAY['website', 'blog', 'brand']::text[], false, 5),
  ('GLF AI', 'https://glfai.co', 'My Sites & Projects', 'GLF AI (Gap Learning Forensics) — your accessibility project site.', 'Website', ARRAY['glf', 'accessibility', 'project', 'ai']::text[], false, 6),
  ('IDEAS Dashboard', 'https://nancymunce.github.io/IDEAS-dashboard/', 'My Sites & Projects', 'Your IDEAS work dashboard at SPC.', 'Dashboard', ARRAY['ideas', 'work', 'spc', 'dashboard']::text[], false, 7),
  ('Reseller Command Center', 'https://nancymunce.github.io/reseller-command-center/index.html#dashboard', 'My Sites & Projects', 'Reseller Command Center', 'Dashboard', ARRAY['reseller']::text[], false, 8),
  ('Sample Affordable Portfolio', 'https://nancymunce.github.io/investment-dashboard-affordable/', 'My Sites & Projects', 'Sample Affordable Portfolio', 'Dashboard', ARRAY['investing', 'affordable']::text[], false, 9),
  ('Sample Expensive Portfolio', 'https://nancymunce.github.io/investment-dashboard/', 'My Sites & Projects', 'Sample Expensive Portfolio', 'Dashboard', ARRAY['investing', 'expensive']::text[], false, 10),
  ('GitHub', 'https://github.com/nancymunce', 'My Sites & Projects', 'Your GitHub profile — Reseller Command Center, IDEAS dashboard, and other repos.', 'Code', ARRAY['github', 'code', 'repos']::text[], false, 11),
  ('Supabase', 'https://supabase.com/dashboard', 'My Sites & Projects', 'Supabase dashboard — the backend database for the Reseller Command Center.', 'Backend', ARRAY['supabase', 'database', 'backend']::text[], false, 12),
  ('Walmart', 'https://www.walmart.com/', 'Shopping & Everyday', 'Walmart grocery delivery and everyday shopping.', 'Shopping', ARRAY['groceries', 'delivery', 'shopping']::text[], true, 13),
  ('Amazon', 'https://www.amazon.com/', 'Shopping & Everyday', 'Amazon shopping and orders.', 'Shopping', ARRAY['shopping', 'orders', 'delivery']::text[], false, 14),
  ('Function Health', 'https://functionhealth.com/', 'Health', 'Function Health lab testing and your results.', 'Health', ARRAY['labs', 'health', 'bloodwork']::text[], false, 15),
  ('Orlando Health', 'https://www.orlandohealth.com/', 'Health', 'Orlando Health — providers, locations, and patient care.', 'Health', ARRAY['doctor', 'medical', 'portal']::text[], false, 16),
  ('Quest Diagnostics', 'https://www.questdiagnostics.com/', 'Health', 'Quest Diagnostics lab appointments and results.', 'Health', ARRAY['labs', 'tests', 'results']::text[], false, 17),
  ('ChatGPT', 'https://chatgpt.com/', 'AI & Tools', 'ChatGPT — your AI design and thinking partner.', 'AI Tool', ARRAY['ai', 'chat', 'assistant']::text[], false, 18),
  ('Claude', 'https://claude.ai/new', 'AI & Tools', 'Claude — start a new conversation.', 'AI Tool', ARRAY['ai', 'chat', 'assistant']::text[], false, 19),
  ('Gemini', 'https://gemini.google.com/app', 'AI & Tools', 'Google Gemini AI assistant.', 'AI Tool', ARRAY['ai', 'google', 'assistant']::text[], false, 20),
  ('NotebookLM', 'https://notebooklm.google.com/', 'AI & Tools', 'NotebookLM — research and notes grounded in your sources.', 'AI Tool', ARRAY['ai', 'research', 'notes', 'google']::text[], false, 21)
) as seed(name, url, category, description, type, tags, favorite, sort_order)
where not exists (select 1 from public.personal_dashboard_resources);

-- Check: should return 22 rows.
select count(*) as personal_dashboard_resources from public.personal_dashboard_resources;
