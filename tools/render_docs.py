"""Renders the sample documents referenced by the seed data (PDF, SVG, XLSX) and sample import files."""
import os, csv, hashlib, random, datetime as dt
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, white
from reportlab.pdfgen import canvas
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

NAVY, BLUE, TEAL, MUT = HexColor('#163A5F'), HexColor('#2563A6'), HexColor('#20A6A6'), HexColor('#5B6B80')
COLLEGE = 'ATSS College of Business Studies & Computer Application'
ADDR = 'Service Rd, Anna Sahib Nagar, Chinchwad, Pimpri-Chinchwad 411019 · Affiliated to Savitribai Phule Pune University'
W, H = A4

def wrap(c, text, width, font='Helvetica', size=10.5):
    words, line, out = str(text).split(), '', []
    for w in words:
        t = (line + ' ' + w).strip()
        if c.stringWidth(t, font, size) > width: out.append(line); line = w
        else: line = t
    if line: out.append(line)
    return out

class Doc:
    def __init__(self, path, title, subtitle=''):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        self.c = canvas.Canvas(path, pagesize=A4, pageCompression=1); self.c.setTitle(title); self.c.setAuthor(COLLEGE)
        self.title, self.subtitle = title, subtitle; self.page()
    def page(self):
        c = self.c; c.setFillColor(NAVY); c.rect(0, H - 92, W, 92, fill=1, stroke=0)
        c.setFillColor(TEAL); c.rect(0, H - 96, W, 4, fill=1, stroke=0)
        c.setFillColor(white); c.setFont('Helvetica-Bold', 15); c.drawString(40, H - 42, COLLEGE)
        c.setFont('Helvetica', 8.5); c.drawString(40, H - 58, ADDR)
        c.setFont('Helvetica-Bold', 11); c.drawString(40, H - 78, self.title[:90])
        c.setFillColor(MUT); c.setFont('Helvetica', 7.5)
        c.drawString(40, 26, 'Sample document generated for the College LMS demonstration dataset.')
        c.drawRightString(W - 40, 26, self.subtitle[:80])
        self.y = H - 125
    def need(self, h):
        if self.y - h < 50: self.c.showPage(); self.page()
    def kv(self, pairs, cols=2):
        c = self.c; cw = (W - 80) / cols
        for i in range(0, len(pairs), cols):
            self.need(30)
            for j, (k, v) in enumerate(pairs[i:i + cols]):
                x = 40 + j * cw
                c.setFillColor(MUT); c.setFont('Helvetica', 8); c.drawString(x, self.y, k.upper())
                c.setFillColor(NAVY); c.setFont('Helvetica-Bold', 10.5); c.drawString(x, self.y - 13, str(v)[:48])
            self.y -= 32
    def h(self, text):
        self.need(34); self.y -= 6; c = self.c; c.setFillColor(BLUE); c.setFont('Helvetica-Bold', 12); c.drawString(40, self.y, text)
        c.setStrokeColor(HexColor('#dfe7f1')); c.line(40, self.y - 5, W - 40, self.y - 5); self.y -= 22
    def p(self, text, size=10.5, indent=0):
        for ln in wrap(self.c, text, W - 80 - indent, size=size):
            self.need(16); self.c.setFillColor(HexColor('#1f2d3d')); self.c.setFont('Helvetica', size); self.c.drawString(40 + indent, self.y, ln); self.y -= size + 4.5
        self.y -= 4
    def table(self, head, rows, widths):
        c = self.c; self.need(22); x0 = 40
        c.setFillColor(HexColor('#EAF1F9')); c.rect(x0, self.y - 6, sum(widths), 20, fill=1, stroke=0)
        c.setFillColor(NAVY); c.setFont('Helvetica-Bold', 9); x = x0
        for t, w in zip(head, widths): c.drawString(x + 4, self.y, str(t)); x += w
        self.y -= 20; c.setFont('Helvetica', 9)
        for r in rows:
            self.need(16); x = x0; c.setFillColor(HexColor('#1f2d3d'))
            for t, w in zip(r, widths): c.drawString(x + 4, self.y, str(t)[:int(w / 5)]); x += w
            self.y -= 15
        self.y -= 8
    def sign(self, left, right):
        self.need(70); self.y -= 30; c = self.c; c.setStrokeColor(MUT)
        c.line(40, self.y, 200, self.y); c.line(W - 200, self.y, W - 40, self.y)
        c.setFillColor(MUT); c.setFont('Helvetica', 9); c.drawString(40, self.y - 13, left); c.drawRightString(W - 40, self.y - 13, right); self.y -= 30
    def save(self): self.c.save()

def fd(d): return dt.date.fromisoformat(str(d)[:10]).strftime('%d %b %Y')

def syllabus(path, s, X):
    d = Doc(path, f"Syllabus — {s['code']} {s['name']}", 'Board of Studies')
    info = X['SUBINFO'][s['id']]; prog = X['PROG'][info['prog']]
    d.kv([('Programme', prog['name']), ('Semester', info['sem']), ('Subject code', s['code']), ('Credits', s['credits']), ('Teaching hours', s['teaching_hours']), ('Evaluation', 'Internal 30 + University 70')])
    d.h('Course description'); d.p(s['syllabus_text'])
    d.h('Course objectives'); [d.p(x) for x in s['objectives'].split('\n')]
    d.h('Units')
    for i, u in enumerate(s['units'].split('\n')):
        d.p(u, 11); d.p(f"Lectures: {s['teaching_hours'] // 4} · Topics covered in this unit include key definitions, worked examples and a short case discussion, followed by a tutorial.", 9.5, 14)
    d.h('Assessment scheme'); d.table(['Component', 'Marks', 'Mode'], [['Mid-semester test', 30, 'Written'], ['Assignments (2)', 20, 'Submission'], ['Attendance & participation', 10, 'Continuous'], ['University examination', 70, 'Written, 3 hours']], [200, 80, 235])
    d.h('Reference books'); d.p(s['reference_books']); d.save()

def notes(path, x, X):
    s = x['subject']; d = Doc(path, f"Unit notes — {s['name']}", x['cls'])
    d.kv([('Subject', f"{s['code']} · {s['name']}"), ('Class', x['cls']), ('Prepared by', x['by']), ('Units', 'I – IV')])
    for i, u in enumerate(s['units'].split('\n'), 1):
        d.h(u)
        d.p(f"This unit develops the ideas of {s['name'].lower()} step by step. Begin with the definitions given in class, then work through the solved examples before attempting the exercises.")
        d.p(f"Key points: (1) state the core concept precisely; (2) explain it with a diagram or example; (3) relate it to a practical application relevant to the programme.")
        d.p(f"Practice: write short notes on two topics from Unit {['I','II','III','IV'][i-1]} and solve the end-of-chapter questions from the prescribed textbook.")
    d.save()

def assignment(path, x, X):
    a, s = x['a'], x['subject']; d = Doc(path, a['title'], x['cls'])
    d.kv([('Subject', f"{s['code']} · {s['name']}"), ('Class', x['cls']), ('Faculty', x['by']), ('Maximum marks', a['max_marks']), ('Deadline', fd(a['deadline'])), ('Late penalty', f"{a['late_penalty_per_day']} mark per day · grace {a['grace_hours']} h")])
    d.h('Instructions'); d.p(a['instructions'])
    d.h('Questions')
    qs = [f"Explain the fundamental concepts of {s['name']} with suitable examples. (5 marks)",
          f"Discuss one real-world application of {s['name']} and analyse its benefits and limitations. (5 marks)",
          f"Solve the problem set given in Unit I of the prescribed textbook and show all steps. (5 marks)",
          f"Write a short note on recent developments related to {s['name']}. (5 marks)"]
    for i, q in enumerate(qs, 1): d.p(f"Q{i}. {q}")
    d.h('Submission'); d.p('Upload a single PDF through the LMS (Assignments → Submit file). Accepted formats: ' + ', '.join(a['allowed_file_types']) + '.'); d.save()

def submission(path, x, X):
    a, st, s, sub = x['a'], x['st'], x['subject'], x['sub']; d = Doc(path, f"Answer sheet — {a['title']}", st['roll_number'])
    d.kv([('Student', st['full_name']), ('Roll number', st['roll_number']), ('Subject', s['name']), ('Submitted', fd(sub['submitted_at']) + (' (late)' if sub['is_late'] else ''))])
    for i in range(1, 5):
        d.h(f"Answer {i}")
        d.p(f"{s['name']} can be understood by first defining its core terms and then applying them to a structured example. In this answer I outline the concept, illustrate it with a worked case and summarise the key takeaways discussed in class.")
    d.h('Evaluation'); d.kv([('Marks awarded', f"{sub['final_marks']} / {a['max_marks']}"), ('Penalty', sub['penalty']), ('Feedback', sub['feedback'])]); d.save()

def application(path, x, X):
    a, st = x['a'], x['st']; d = Doc(path, 'Application for admission ' + ('— approved' if a['status'] == 'approved' else '— ' + a['status'].replace('_', ' ')), a['full_name'])
    pe = a['previous_education'] or {}
    d.kv([('Applicant', a['full_name']), ('Date of birth', fd(a['dob']) if a['dob'] else '—'), ('Email', a['email'] or '—'), ('Student mobile', a['student_mobile'] or '—'),
          ('Parent mobile', a['parent_mobile'] or '—'), ('Address', a['address'] or '—'), ('Previous qualification', pe.get('qualification', '—')), ('Percentage', pe.get('percentage', '—')),
          ('OTP — student', 'Verified' if a['student_otp_verified'] else 'Pending'), ('OTP — parent', 'Verified' if a['parent_otp_verified'] else 'Pending'),
          ('Documents', a['docs_status']), ('Status', a['status'].replace('_', ' ').title())])
    if st: d.kv([('Roll number allotted', st['roll_number']), ('Class', X['CLASSN'].get(st['class_id'], ''))])
    d.h('Declaration'); d.p('I declare that the information furnished above is true to the best of my knowledge. I agree to abide by the rules of the college and the affiliating university.')
    if a['review_notes']: d.h('Office remarks'); d.p(a['review_notes'])
    d.sign('Signature of applicant', 'Admission office'); d.save()

def certificate(path, x, X):
    cr, st = x['c'], x['st']; d = Doc(path, f"{cr['type']} certificate", cr['certificate_number'])
    d.kv([('Certificate no.', cr['certificate_number']), ('Issued on', fd(cr['issued_on'])), ('Student', st['full_name']), ('Roll number', st['roll_number'])])
    d.h('To whom it may concern'); cls = X['CLASSN'].get(st['class_id'], '')
    body = {'Bonafide': f"This is to certify that {st['full_name']} (roll no. {st['roll_number']}) is a bonafide student of this college, studying in {cls} during the academic year 2026-27. This certificate is issued on request for official purposes.",
            'Transcript': f"This transcript records the academic performance of {st['full_name']} (roll no. {st['roll_number']}) as maintained in the college records up to the academic year 2025-26.",
            'Transfer': f"This is to certify that {st['full_name']} (roll no. {st['roll_number']}) was a student of this college. Conduct and character during the period of study were good.",
            'Course completion': f"This is to certify that {st['full_name']} has completed the prescribed course of study."}[cr['type']]
    d.p(body); d.sign('Office superintendent', 'Principal'); d.save()

def activity(path, x, X):
    m, st = x['m'], x['st']; d = Doc(path, 'Certificate of participation', m['activity_type'] or '')
    d.y -= 20; d.c.setFillColor(NAVY); d.c.setFont('Helvetica-Bold', 22); d.c.drawCentredString(W / 2, d.y, st['full_name']); d.y -= 26
    d.c.setFont('Helvetica', 11); d.c.setFillColor(MUT); d.c.drawCentredString(W / 2, d.y, f"Roll no. {st['roll_number']}"); d.y -= 34
    d.p(f"has participated in “{m['title']}” ({m['activity_type']}) organised by the college and has been awarded {m['marks']} out of {m['max_marks']} activity marks.")
    d.sign('Activity coordinator', 'Principal'); d.save()

def tpo(path, r, X):
    d = Doc(path, r['title'], r['type']); d.kv([('Type', r['type']), ('Organisation', r['organization']), ('Date', fd(r['event_date'])), ('Status', r['status'].title()), ('Students', r['student_count'] or 'Registration open')])
    d.h('About'); d.p(r['description']); d.h('Schedule'); d.table(['Time', 'Session'], [['10:00', 'Welcome and briefing'], ['10:30', 'Main session'], ['13:00', 'Lunch break'], ['14:00', 'Assessment / interviews'], ['16:30', 'Closing and feedback']], [100, 415])
    d.h('Contact'); d.p('Training & Placement Cell · tpo@atss-lms.in'); d.save()

PAL = ['#163A5F', '#2563A6', '#20A6A6', '#7C3AED', '#D97706', '#0F766E', '#BE185D', '#1D4ED8']
def photo(path, st, X):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    ini = ''.join(w[0] for w in st['full_name'].split()[:2]).upper(); h = int(hashlib.md5(st['full_name'].encode()).hexdigest()[:4], 16)
    a, b = PAL[h % len(PAL)], PAL[(h // 8 + 2) % len(PAL)]
    open(path, 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient></defs><rect width="240" height="240" rx="36" fill="url(#g)"/><circle cx="120" cy="96" r="44" fill="#ffffff33"/><path d="M40 220c8-46 42-70 80-70s72 24 80 70" fill="#ffffff33"/><text x="120" y="112" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="44" font-weight="700" fill="#fff">{ini}</text></svg>')

HEAD = ['roll_number', 'student_name', 'subject_code', 'subject_name', 'semester', 'internal', 'external', 'total', 'grade', 'result']
def workbook(path, rows, title):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    wb = Workbook(); ws = wb.active; ws.title = 'Results'; ws.append(HEAD)
    for c in ws[1]: c.font = Font(bold=True, color='FFFFFF'); c.fill = PatternFill('solid', fgColor='163A5F'); c.alignment = Alignment(horizontal='center')
    for r in rows: ws.append(r)
    for col, w in zip('ABCDEFGHIJ', [12, 22, 12, 34, 10, 10, 10, 8, 8, 8]): ws.column_dimensions[col].width = w
    ws.freeze_panes = 'A2'; wb.save(path)

def render(project, DOCS, RES_ROWS, X):
    X['CLASSN'] = {r['id']: r['name'] for r in X['ROWS']['classes']}
    base = os.path.join(project, 'assets', 'docs')
    fn = dict(syllabus=syllabus, notes=notes, assignment=assignment, submission=submission, application=application, certificate=certificate, activity=activity, tpo=tpo, photo=photo)
    for rel, kind, payload in DOCS: fn[kind](os.path.join(base, rel), payload, X)
    workbook(os.path.join(base, 'results', 'SPPU-result-2025-26.xlsx'), RES_ROWS, '2025-26')
    # ---- sample files the user can upload to try "Upload → extract → preview → import"
    sd = os.path.join(project, 'samples'); os.makedirs(sd, exist_ok=True)
    rnd = random.Random(7)
    fy = [s for s in X['STU'] if s['code'] == 'BCOM' and s['yn'] == 1]
    rows = []
    for s in fy:
        weak = s['roll_number'] in ('BCOMFY03', 'BCOMFY07', 'BCOMFY11'); vweak = s['roll_number'] == 'BCOMFY11'
        for k, sid in enumerate(X['SUB'][('BCOM', 1)]):
            fail = (weak and k == 1) or (vweak and k in (0, 1, 2))
            inn = rnd.randint(8, 13) if fail else rnd.randint(16, 29); ext = rnd.randint(15, 25) if fail else rnd.randint(30, 66)
            rows.append([s['roll_number'], s['full_name'], X['SUBINFO'][sid]['code'], X['SUBINFO'][sid]['name'], 1, inn, ext, inn + ext, '', 'F' if fail else 'P'])
    rows.append(['BCOMFY99', 'Unknown Student', 'BCOM101', 'Financial Accounting I', 1, 20, 40, 60, '', 'P'])     # deliberate error row
    rows.append([fy[0]['roll_number'], fy[0]['full_name'], 'XYZ999', 'Unknown subject', 1, 20, 40, 60, '', 'P'])  # deliberate error row
    for r in rows: r[8] = next(g for g, m in (('O', 90), ('A+', 80), ('A', 70), ('B+', 60), ('B', 55), ('C', 50), ('P', 40), ('F', 0)) if r[7] >= m)
    workbook(os.path.join(sd, 'university_result_FY_BCOM_sem1_2026-27.xlsx'), rows, '2026-27')
    wb = Workbook(); ws = wb.active; ws.title = 'Students'
    ws.append(['Roll Number', 'Full Name', 'Email', 'Mobile', 'Course', 'Academic Year', 'Class', 'Semester', 'Password'])
    for i, (n, l) in enumerate([('Ira', 'Karkhanis'), ('Arnav', 'Bhide'), ('Meher', 'Sathe'), ('Rudra', 'Patankar'), ('Anvi', 'Karandikar'), ('Shaurya', 'Phadke')], 13):
        ws.append([f'BBAFY{i:02d}', f'{n} {l}', f'{n.lower()}.{l.lower()}@student.atss-lms.in', f'98{rnd.randint(10000000, 99999999)}', 'BBA', '2026-27', 'BBA - FY', 'Semester 1', 'Welcome@123'])
    ws.append(['BBAFY19', 'Row With Bad Class', '', '', 'BBA', '2026-27', 'ZZ BBA', 'Semester 1', 'Welcome@123'])
    wb.save(os.path.join(sd, 'students_import_FY_BBA.xlsx'))
    with open(os.path.join(sd, 'library_books_import.csv'), 'w', newline='') as f:
        w = csv.writer(f); w.writerow(['Title', 'Author', 'ISBN', 'Copies'])
        for t, a, c in [('Learning SQL', 'Alan Beaulieu', 4), ('Eloquent JavaScript', 'Marijn Haverbeke', 3), ('Cracking the Coding Interview', 'Gayle Laakmann McDowell', 5),
                        ('Principles of Marketing', 'Philip Kotler, Gary Armstrong', 4), ('Accounting for Management', 'S. N. Maheshwari', 3), ('Indian Economy', 'Ramesh Singh', 6),
                        ('Business Analytics', 'James R. Evans', 2), ('', 'Missing title row', 1)]:
            w.writerow([t, a, '', c])
    wbq = Workbook(); wq = wbq.active; wq.title = 'Quiz'
    wq.append(['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct answer', 'Marks'])
    for row in [('Which SQL clause removes duplicate rows from a result?', 'UNIQUE', 'DISTINCT', 'GROUP', 'FILTER', 'B', 1), ('Which normal form removes transitive dependency?', '1NF', '2NF', '3NF', 'BCNF', 'C', 1),
                ('A foreign key refers to which key of another table?', 'Primary key', 'Candidate key', 'Composite key', 'Super key', 'A', 1), ('Which command saves a transaction permanently?', 'SAVE', 'COMMIT', 'ROLLBACK', 'END', 'B', 1),
                ('Which join returns all rows from the left table?', 'INNER JOIN', 'RIGHT JOIN', 'LEFT JOIN', 'CROSS JOIN', 'C', 1), ('Row with a missing answer', 'x', 'y', '', '', 'Z', 1)]:
        wq.append(list(row))
    wbq.save(os.path.join(sd, 'quiz_upload_DBMS.xlsx'))
    print('documents:', len(DOCS) + 1, 'sample uploads: 4')
