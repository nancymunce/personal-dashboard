# Personal Dashboard

Nancy Munce's personal links dashboard — the same layout as the IDEAS dashboard,
but for personal links. GitHub Pages hosts the page; Supabase holds the links,
so clearing your browser cache never loses them.

- Live site: https://nancymunce.github.io/personal-dashboard/
- Repo: https://github.com/nancymunce/personal-dashboard
- Data: Supabase table `public.personal_dashboard_resources`
  (project `desygsdzinuvofjufvft.supabase.co` — the same project as the
  Reseller Command Center)

## Features

- Category cards on the home view; click a category to see its links
- Global search (name, description, tag, category) plus search within a category
- Favorites view with star toggles
- Add Resource dialog, including a "＋ New category…" option
- Edit and Delete (with confirmation) on every card
- Manage data: Export Updated Resources (JSON backup), Import, Reload from Supabase
- Viewing works without signing in. Adding, editing, deleting, and starring
  require signing in (same email as the Reseller Command Center, magic link
  or password).
- No data is stored in browser localStorage.

## One-time setup (Nancy)

The page is already live. Two quick steps in Supabase turn on saving:

### 1. Create the table — run `supabase.sql`

1. Open https://supabase.com/dashboard and open the project.
2. Go to **SQL Editor → New query**.
3. Open `supabase.sql` in this repo, copy the whole file, paste it in, and
   click **Run**.
4. The last line should report **22** rows — that's the seed list.
5. Reload https://nancymunce.github.io/personal-dashboard/ — the setup
   banner should be gone, and "saved in Supabase" should appear.

Until step 1 is done, the site shows the same 22 links from
`data/resources.json` in read-only mode, so nothing is lost.

### 2. Allow the magic-link sign-in to come back to this site

1. In Supabase, go to **Authentication → URL Configuration**.
2. Under **Redirect URLs**, add:
   `https://nancymunce.github.io/personal-dashboard/`
3. Save.

(If you sign in with a password instead of a magic link, this step isn't
needed — but add it anyway so both ways work.)

### 3. Turn on GitHub Pages (if it isn't on yet)

1. In this repo, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **Deploy from a branch**,
   branch **main**, folder **/(root)**, then **Save**.
3. The site appears at https://nancymunce.github.io/personal-dashboard/
   within a minute or two.

## Files

- `index.html` — the dashboard page
- `assets/styles.css` — styling (light/dark, WCAG 2.2)
- `assets/app.js` — Supabase loading, search, favorites, add/edit/delete
- `supabase-config.js` — Supabase URL + publishable key (public by design,
  same as the Reseller Command Center; Row Level Security protects the data)
- `data/resources.json` — the published 22-link seed list, used until
  Supabase is connected and as a backup
- `supabase.sql` — table + RLS policies + seed inserts

## Accessibility

Built to WCAG 2.2: real heading structure, labeled form controls, visible
keyboard focus, sufficient color contrast, descriptive link text, and native
keyboard-navigable dialogs.
