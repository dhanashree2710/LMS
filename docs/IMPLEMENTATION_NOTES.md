# LMS responsive, navigation and hierarchy update

## What was changed in this package

### Shell / responsive (items 1, 2, 4)
- Desktop / tablet / mobile layout corrections to reduce empty white space and horizontal overflow.
- Sidebar (drawer) scroll position is persisted per user so the selected tab stays in view when you switch pages.
- **← Back** and **↻ Refresh** buttons appear on every page (except dashboard). Refresh re-runs the current view.

### Stay on same page after CRUD (items 3, 27)
- After add / edit / delete / archive the list is re-rendered and scroll position of the page and the sidebar is restored.
- Null-safe handling for card/table explorer elements to avoid `Cannot set properties of null (setting 'textContent')`.

### Full-page hierarchy instead of popups (items 5–8 and “don’t pop up”)
Card clicks now open a **full page** inside the main area (same shell, sidebar stays).  
Hierarchy:

**Department → Course → Class → Semester → Subject (full syllabus)**

Also applied to Course, Semester, Class and Subject detail views.  
Small edit forms (e.g. syllabus editor) may still use a light modal; the main drill path does not.

### Empty state messaging
When no data is present the UI shows a clear message:  
“No records found. Please add data using the form above or enter it in Supabase.”

### User-friendly toasts (item 31)
Common Supabase / Postgres errors are translated into plain language (duplicate, foreign key, required fields, permission, network, storage).

### Subject allocation (item 9)
Form includes department and semester filters; classes are filtered by department; subjects by department/semester; duplicate allocations are blocked. Cards show teacher, class, semester, department and roster.

### Parent linking (item 28)
Student selection uses Course → Academic Year → Class filters before the student list.

## How to test
1. Unzip and open (or host) the folder.
2. Ensure `js/config.js` has your Supabase URL and anon key.
3. Run `supabase/schema_additions.sql` in the Supabase SQL Editor (creates missing columns, tables and storage buckets).
4. Sign in and:
   - Open Departments → click a department card → course → class → semester → subject (full page each time).
   - Confirm Back / Refresh work and sidebar does not jump.
   - Add / delete a record and confirm you stay on the list view.
   - Check empty states and toast messages.

## Not fully verified live
- Storage uploads (study materials, assignments, quizzes) need the buckets from schema_additions.sql and correct CORS/policies.
- Role-scoped portals, placement ads with apply flow, fees hierarchy, results charts by department, and “already allocated” visual tags can be extended further on the same full-page drill pattern.
