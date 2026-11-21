// College LMS — AI assistant (Groq). The Groq key lives ONLY in Supabase secrets:
//   supabase secrets set GROQ_API_KEY=gsk_...        (optional: GROQ_MODEL=llama-3.3-70b-versatile)
//   supabase functions deploy ai-assistant
// It is never sent to the browser and never stored in the repository.
const CORS = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const STAFF = ["super_admin","principal","college_admin","sub_admin","hod","class_teacher","subject_teacher","examination_admin","admission_admin","librarian","activity_admin","tpo","accounts"];
const TASKS: Record<string, { roles: string[] | "all"; system: string; json?: boolean }> = {
  quiz_questions: { roles: STAFF, json: true, system:
    'You write multiple-choice questions for Indian college exams. Reply ONLY with JSON: {"questions":[{"q":"...","options":["A","B","C","D"],"answer":0}]} where answer is the 0-based index of the single correct option. Questions must be factually correct, unambiguous and at the requested level.' },
  lesson_plan: { roles: STAFF, system: "You are an experienced college teacher. Write a clear, practical lesson plan with objectives, timing, activities, examples and a short assessment. Use plain headings and bullet points." },
  assignment_ideas: { roles: STAFF, system: "Suggest original assignment tasks for college students with marking criteria. Keep each idea concise." },
  summary: { roles: STAFF, system: "Summarise the given college data for a principal or HOD in short bullet points: key numbers, trends, areas needing attention. Do not invent numbers that are not in the data. Do not decide pass/fail, promotion or disciplinary outcomes; only describe." },
  notice: { roles: STAFF, system: "Draft a short, polite, formal college notice from the details given. Include a title line and the body." },
  explain: { roles: "all", system: "You are a patient tutor for college students. Explain the topic simply, step by step, with one example. Keep it under 300 words." },
  practice: { roles: "all", system: "Give 5 practice questions on the topic with short answers at the end. Number them." },
  study_plan: { roles: "all", system: "Make a realistic day-by-day revision plan from the subjects and dates given. Keep it balanced and include short breaks." },
  ask: { roles: "all", system: "You are the College LMS assistant. Help with studies and college work. Be concise. You cannot see or change records in the system; say so if asked to." },
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) return json({ error: "AI is not configured. Run: supabase secrets set GROQ_API_KEY=..." }, 500);
  let body: { task?: string; input?: string; role?: string; context?: Record<string, unknown>; count?: number };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const t = TASKS[body.task ?? "ask"];
  if (!t) return json({ error: "Unknown task" }, 400);
  const role = String(body.role ?? "student");
  if (t.roles !== "all" && !t.roles.includes(role)) return json({ error: "This AI tool is not available for your role" }, 403);
  const input = String(body.input ?? "").trim().slice(0, 6000);
  if (!input) return json({ error: "Please type what you need" }, 400);
  const ctx = body.context ? "\n\nContext: " + JSON.stringify(body.context).slice(0, 4000) : "";
  const count = Math.min(Math.max(Number(body.count) || 5, 1), 20);
  const user = body.task === "quiz_questions" ? `Write ${count} questions on: ${input}${ctx}` : input + ctx;
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("GROQ_MODEL") ?? "llama-3.3-70b-versatile",
      temperature: t.json ? 0.3 : 0.6, max_tokens: 2048,
      ...(t.json ? { response_format: { type: "json_object" } } : {}),
      messages: [{ role: "system", content: t.system }, { role: "user", content: user }],
    }),
  });
  if (!r.ok) return json({ error: "AI service error (" + r.status + ")" }, 502);
  const d = await r.json();
  const text = d?.choices?.[0]?.message?.content ?? "";
  if (t.json) { try { return json({ ok: true, data: JSON.parse(text) }); } catch { return json({ error: "AI returned an unreadable answer, try again" }, 502); } }
  return json({ ok: true, text });
});
