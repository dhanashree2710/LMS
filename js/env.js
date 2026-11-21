/* Public client settings — safe to commit and deploy.
   The anon key is a PUBLIC key (every visitor's browser receives it); data safety comes from Supabase RLS.
   NEVER put the Groq key or the service_role key here: the Groq key lives only in Supabase secrets
   (supabase secrets set GROQ_API_KEY=...), so it never reaches Git or the browser. */
window.LMS_ENV={
 SUPABASE_URL:'https://usnpfodlshekigfazedi.supabase.co',
 SUPABASE_ANON_KEY:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzbnBmb2Rsc2hla2lnZmF6ZWRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4MDA4MTYsImV4cCI6MjExMDM3NjgxNn0.J8AhD4iU39aHEJoiMGOXuOLQlvBeiunlxjGKYDgIw7w',
 AI_FUNCTION:'ai-assistant'
};
