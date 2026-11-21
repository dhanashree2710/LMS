# College LMS — ATSS College of Business Studies & Computer Application

One platform for learning and college administration. It is built with HTML, CSS and vanilla JavaScript on Supabase.

## Setup (run in this order)

1. `js/env.js` already holds your Supabase URL and **anon** key. To use another project, edit it (template: `js/env.example.js`).
2. In the Supabase **SQL Editor**, run:
   1. `supabase/00_schema.sql`: all tables (safe on an existing database).
   2. `supabase/01_schema_additions.sql`: run this again even if you ran it before. It now adds the `feedback_forms` and `feedback_responses` tables.
   3. `supabase/02_seed_data.sql`: **reset and load fresh data** (see the warning below). If the editor struggles with the file size, run `supabase/seed_parts/part1…`, then `part2…`, then `part3…` instead.
   4. `supabase/03_linked_delete_rules.sql`: makes edits and deletes update linked tables automatically (safe to run again).
3. Deploy the AI assistant (optional, see *AI assistant (Groq)* below).
4. Open `index.html` on any static host (Live Server, `npx serve`, Netlify and so on).

### ⚠️ What `02_seed_data.sql` deletes

The script deletes all data **except**:

- the college **ATSS01** (`6d246a80-83cc-4531-8c5e-b32949fc1089`), kept exactly as it is;
- its departments **Science (SCI)** and **Commerce (COMM)**;
- the two HOD accounts linked to those departments;
- your Super Admin account(s).

Everything else is deleted: other colleges, users, students, marks, fees and so on. The script then loads fresh, fully linked data. It stops without changing anything if the college or departments are missing, and it can be run again. **Take a backup first** (Supabase → Database → Backups).

## Sign-in

Every new account uses the password `Lms@2026`. The HOD and Super Admin passwords are not changed.

| Role | Sign in with |
|---|---|
| College admin | admin@atss-lms.in |
| Principal / Sub admin | principal@atss-lms.in / subadmin@atss-lms.in |
| Admission · Accounts · Exams | admission@ · accounts@ · exam@atss-lms.in |
| Library · TPO · Activities | library@ · tpo@ · activity@atss-lms.in |
| Class teacher (BCA - SY) | rohit.jadhav@atss-lms.in |
| Subject teacher | girish.pillai@atss-lms.in |
| HODs | your existing HOD logins (Science, Commerce) |
| Student | roll number **BCASY01** (any roll such as BCOMFY03 or MSCCSSY02 also works) |
| Parent of BCASY01 | vijay.patil@parents.atss-lms.in |

## The data follows the college flow

**Department → Course → Class → Semester → Subject → Teacher → Timetable → Students → Teaching → Exams → Results**

| Department | Courses | Classes (2026-27) |
|---|---|---|
| Science (SCI) | BCA, B.Sc CS, M.Sc CS | BCA - FY / SY / TY · B.Sc CS - FY / SY / TY · M.Sc CS - FY / SY |
| Commerce (COMM) | B.Com, BBA, M.Com | B.Com - FY / SY / TY · BBA - FY / SY / TY · M.Com - FY / SY |

- **Structure:** 32 semesters and 128 subjects (each with a syllabus PDF), plus classes for 2024-25 and 2025-26 to give promotion history.
- **People:** 9 office staff, 23 teachers and your 2 HODs. There are 184 students, each with a parent login. No name or email is repeated.
- **Teaching:** 64 teacher–subject allocations and a clash-free timetable of 320 periods. About 15,000 attendance records come from that timetable.
- **Learning:** assignments with evaluated submissions, unit notes, 21 quizzes, and 22 feedback forms with responses.
- **Exams and results:** exams with marks; BBA - TY International Business is still awaiting approval. 2025-26 results are PASS, ATKT or FAIL with backlogs; 2026-27 is pending.
- **Other modules:** fees with receipts, library, placements, clubs, competitions, activity marks, certificates and targeted notices.
- **Files:** 1,765 real documents in `assets/docs/` (syllabus, notes, task sheets, answer sheets, certificates, application forms, photos). Each has an Open link and a ⬇ Download button.

## What changed in this version

- **Navigation:** College Setup tabs run Workflow → College profile → Academic years → Departments → Courses → Classes → Semesters → Subjects. Forms ask in the same order (Department → Course → Class → Semester → Subject).
- **Workflow:** replaces Journey. It shows every step of the college flow with live counts, plus a Department → Course → Class → Semester → Subject tree.
- **Filters:** Department → Course → Class → Semester dropdowns on every data page are built from real records and are linked to each other. Semesters are labelled by course (e.g. "BCA · Semester 3") until a course is picked.
- **Class names:** they display as **"B.Sc CS - TY"**. Older names such as "B.Sc CS-Year 3" or "TY BSc" are shown in the new format automatically.
- **Timetable:** a weekly grid for each class (time × day), with no cards. A period list is still available.
- **Attendance:** a register per class, subject and month, showing students × dates with P / A / L / E, totals and % (below 75% in red), with no cards. With no class chosen, a summary by class is shown.
- **Internal marks and Marks entry & approval:** step cards go Department → Course → Class → Semester, then the student list. Marks can be approved and published for a whole class at once.
- **Edit everywhere:** an Edit button on every table row and card (✎ on hover) opens an edit popup. Staff & users has a proper edit form covering name, email, phone, role, active status and password reset.
- **Automatic refresh:** after any save, edit, upload or delete, the page and its dropdowns refresh by themselves.
- **Fixed:** "Cannot set properties of null (setting 'textContent')" and the error at `crud.js:46`. The Save button had no `type="submit"`.
- **Refresh button:** it reloads the page and no longer reopens a popup you have closed.
- **Class teacher:** the picker lists every teacher with their role. Assigning someone makes them a class teacher (their role is upgraded if they were only a subject teacher).
- **Students:** they see only their own class and semester (subjects, timetable, exams, notes, quizzes, assignments and feedback).
- **Dashboard:** every role sees a **My details** card. Students see roll number, department, course, class, semester and class teacher; teachers see department, classes and subjects; parents see their children.
- **Notices:** a scrolling notice bar on every page, and a pop-up for new notices that is shown once and closes after 20 seconds.
- **Feedback:** staff create a form (Department → Course → Class → Semester, plus an optional subject and teacher, and questions rated 1–5). Only that class sees it. Students fill it in once, and staff see the responses and averages in a table and can download an Excel sheet.
- **Quizzes:** download the quiz template, fill one question per row, upload it, check the preview table, then save. Sample: `samples/quiz_upload_DBMS.xlsx`.

## Upload → extract → preview → import

**Upload sheet** works on every data page. It reads Excel or CSV files, matches your columns to the page's fields, shows each row as ✓ ready or ✗ with the reason (you can click any cell to fix it), then imports the ready rows. **📊 Import university result** matches roll numbers and subject codes and works out PASS / ATKT / FAIL. The files in `samples/` let you try it.

## Keys and secrets (safe for Git)

| Key | Where it lives | In Git? |
|---|---|---|
| Supabase URL + **anon** key | `js/env.js` | Yes. It is a public key; every visitor's browser receives it anyway |
| **Groq** API key | Supabase Edge Function secret `GROQ_API_KEY` | **Never.** It is in no project file and never reaches the browser |
| Supabase **service_role** key | Not used by the app | Never |

Deploying needs no setup: push to GitHub and import into Vercel or Netlify, or upload to any web server. The build step (`npm run build`) uses the committed `js/env.js`. If you set `SUPABASE_URL` and `SUPABASE_ANON_KEY` on the host, the build uses those instead. Real data protection comes from Row Level Security (see below), not from hiding the anon key.

## AI assistant (Groq)

The ✨ **AI** button (bottom right, every role except Super Admin) gives:

- **Teachers and staff:** lesson plans, assignment ideas, notice drafts and "Summarise this page".
- **Students and parents:** topic explanations, practice questions and revision plans.

The Create quiz form also has **✨ Generate with AI**, which adds MCQs you review before saving. AI never changes marks, results or records.

The browser calls the Supabase Edge Function `ai-assistant`. Only that function knows the Groq key:

```bash
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase secrets set GROQ_API_KEY=your_groq_key GROQ_MODEL=llama-3.3-70b-versatile
supabase functions deploy ai-assistant
```

For local testing, copy `supabase/functions/.env.example` to `supabase/functions/.env` (gitignored) and run `supabase functions serve`.

## Linked add / edit / delete

After `03_linked_delete_rules.sql`:

- Deleting a student, subject, exam, quiz, assignment, fee, book, club, competition, parent or feedback form also deletes its linked rows (attendance, marks, submissions, payments and so on).
- Deleting a class deletes its timetable, allocations, materials and exams, but only when no students remain in it.
- Departments, courses, semesters and academic years cannot be deleted while anything uses them. The app tells you what still uses them.
- Editing a student's or parent's name, email or mobile also updates their login. Deleting them removes their login.
- Students and parents added without a password (form or upload) get the default password `Lms@2026`. Change it under **Passwords**.

## Security: read before going live

Sign-in still checks the `password` column in `public.users`, and Row Level Security is off. Before using real student data, move to Supabase Auth with RLS (see `docs/SECURITY_REVIEW.md`), and change the shared sample password.
