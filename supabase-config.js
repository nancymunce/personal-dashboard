// Supabase connection for the Personal Dashboard.
// The publishable key is safe to use in browser code. Database access is
// enforced by Supabase Authentication and Row Level Security (RLS).
// Same pattern as the Reseller Command Center.
const SUPABASE_URL = "https://desygsdzinuvofjufvft.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_iw1n9EupBt8qFZUNrvPrBA_UEnA8bqn";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
// `const` at the top level does not attach to `window`, so expose it
// explicitly — app.js looks it up as window.supabaseClient.
window.supabaseClient = supabaseClient;
