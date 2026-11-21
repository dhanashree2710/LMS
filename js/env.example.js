/* Copy to js/env.js and fill in. js/env.js is gitignored.
   The anon key is a public client key; data protection comes from Supabase RLS, never from hiding this key.
   NEVER put the Groq key or the service_role key here — the Groq key lives only in Supabase secrets. */
window.LMS_ENV={
 SUPABASE_URL:'https://YOUR-PROJECT.supabase.co',
 SUPABASE_ANON_KEY:'YOUR-ANON-KEY',
 AI_FUNCTION:'ai-assistant'
};
