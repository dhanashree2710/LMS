#!/usr/bin/env python3
"""Generates supabase/02_seed_data.sql: a fully linked, realistic dataset for College LMS."""
import uuid, random, json, sys, datetime as dt
from collections import defaultdict

random.seed(2026)
NS = uuid.UUID('a7550001-2026-4c55-9a11-0c0ffee2a026')
def U(*k): return str(uuid.uuid5(NS, ':'.join(map(str, k))))

OUT = []
def q(v):
    if v is None: return 'null'
    if isinstance(v, bool): return 'true' if v else 'false'
    if isinstance(v, (int, float)): return repr(v)
    if isinstance(v, (dict, list)) and not isinstance(v, PGArr): return q(json.dumps(v)) + '::jsonb'
    if isinstance(v, PGArr): return v.sql()
    return "'" + str(v).replace("'", "''") + "'"
class PGArr(list):
    def __init__(self, items, typ): super().__init__(items); self.typ = typ
    def sql(self):
        return "'{}'::%s[]" % self.typ if not self else "array[%s]::%s[]" % (','.join(q(x) for x in self), self.typ)

ROWS = defaultdict(list)   # table -> list of dicts (keeps column order of first row)
def add(t, **r): ROWS[t].append(r); return r

def emit(t, rows):
    if not rows: return
    cols = list(rows[0].keys())
    for i in range(0, len(rows), 200):
        chunk = rows[i:i+200]
        OUT.append(f"insert into public.{t} ({','.join(cols)}) values\n" +
                   ',\n'.join('(' + ','.join(q(r.get(c)) for c in cols) + ')' for r in chunk) + ';')

PW = 'Lms@2026'
TODAY = dt.date(2026, 11, 20)
def ts(d, h=10, m=0): return f"{d.isoformat()} {h:02d}:{m:02d}:00+05:30"
def rdate(a, b): return a + dt.timedelta(days=random.randint(0, (b - a).days))
def phone(): return '9' + str(random.randint(100000000, 999999999))

FIRST_M = ['Aarav','Vivaan','Aditya','Arjun','Sai','Reyansh','Krishna','Ishaan','Rohan','Kabir','Om','Yash','Pranav','Siddharth','Atharva','Tanmay','Omkar','Harsh','Nikhil','Aniket','Rahul','Sahil','Varun','Kunal','Shubham','Ritesh','Mihir','Dev','Parth','Soham','Akash','Manas','Tejas','Vedant','Chinmay','Saurabh','Gaurav','Abhishek','Ajinkya','Neeraj']
FIRST_F = ['Ananya','Diya','Saanvi','Aadhya','Isha','Pari','Anika','Riya','Sneha','Pooja','Neha','Kavya','Shruti','Tanvi','Mrunal','Sakshi','Prachi','Rutuja','Vaishnavi','Gauri','Aishwarya','Shravani','Janhavi','Nikita','Priya','Komal','Siddhi','Ishita','Mansi','Radhika','Sanika','Asmita','Purva','Ketaki','Rasika','Apurva','Bhakti','Sayali','Madhura','Tejal']
LAST = ['Patil','Deshmukh','Kulkarni','Joshi','Shinde','Pawar','Jadhav','More','Chavan','Gaikwad','Bhosale','Kale','Sawant','Kadam','Deshpande','Mehta','Shah','Iyer','Nair','Reddy','Sharma','Verma','Gupta','Singh','Rao','Menon','Pillai','Bose','Das','Banerjee','Mishra','Pandey','Thakur','Naik','Salunkhe','Mane','Wagh','Shirke','Gokhale','Apte']
PARENT_M = ['Suresh','Ramesh','Mahesh','Prakash','Sanjay','Vijay','Anil','Sunil','Rajendra','Dilip','Ashok','Vinod','Santosh','Milind','Deepak','Nitin','Sudhir','Ravindra','Shrikant','Uday','Arvind','Bharat','Chandrakant','Dattatray','Ganesh','Hemant','Jayant','Kishor','Mohan','Narendra','Pandurang','Rajesh','Sachin','Tukaram','Vasant','Yogesh']

used_emails = set()
def email_for(first, last, domain):
    base = f"{first}.{last}".lower(); e = f"{base}@{domain}"; n = 2
    while e in used_emails: e = f"{base}{n}@{domain}"; n += 1
    used_emails.add(e); return e

def mk_user(key, name, email, role, college, created, ph=None):
    uid = U('user', key)
    add('users', id=uid, full_name=name, email=email, phone=ph or phone(), password=PW, is_active=True, created_at=created, updated_at=created)
    add('profiles', id=uid, email=email, full_name=name, phone=ph, created_at=created, updated_at=created)
    add('user_roles', id=U('role', key, role), user_id=uid, college_id=college, role=role, is_active=True, created_at=created)
    return uid

# ------------------------------------------------------------------ the existing college, departments and HODs (kept as they are)
KD = '6d246a80-83cc-4531-8c5e-b32949fc1089'
DOM = 'atss-lms.in'
D0 = dt.date(2024, 5, 10)
STAFF = {}
for key, name, role in [('admin', 'Rajesh Kulkarni', 'college_admin'), ('principal', 'Dr. Sunita Deshpande', 'principal'),
                        ('subadmin', 'Meera Joshi', 'sub_admin'), ('admission', 'Amit Pawar', 'admission_admin'),
                        ('accounts', 'Kiran Shah', 'accounts'), ('exam', 'Prof. Vandana Iyer', 'examination_admin'),
                        ('library', 'Sharad Gokhale', 'librarian'), ('tpo', 'Prof. Nilesh Mehta', 'tpo'),
                        ('activity', 'Prof. Snehal Naik', 'activity_admin')]:
    em = f"{key}@{DOM}"; used_emails.add(em)
    STAFF[key] = mk_user('atss-' + key, name, em, role, KD, ts(D0))
DEPT = {'SCI': dict(id='39cfae1d-7e4f-486f-a868-905fa364946e', hod='450e991b-a38a-47fc-8622-1a805730facf'),
        'COMM': dict(id='d424a1e3-11b6-4eed-a0b7-ef7f060e9fa0', hod='99e16ad1-e772-47a5-a025-60d460276f50')}
for d in DEPT.values(): d['teachers'] = [d['hod']]
TEACH = {'SCI': (8, 4), 'COMM': (8, 3)}   # (class teachers, subject teachers)
TNAMES = ['Prof. Ashwini Chavan','Prof. Rohit Jadhav','Prof. Pallavi More','Prof. Sachin Gaikwad','Prof. Deepali Shinde','Prof. Manoj Kadam',
          'Prof. Swati Pandey','Prof. Ajay Verma','Prof. Revati Apte','Prof. Sandeep Rao','Prof. Kavita Menon','Prof. Hemant Thakur',
          'Prof. Archana Mane','Prof. Yogesh Wagh','Prof. Shweta Gupta','Prof. Mahendra Salunkhe','Prof. Leena Nair','Prof. Tushar Shirke',
          'Prof. Rupali Das','Prof. Anand Mishra','Prof. Varsha Reddy','Prof. Girish Pillai','Prof. Neha Kulkarni','Prof. Sameer Bhide','Prof. Madhavi Phadke']
TROLE = {}
ti = 0
for code, (nct, nst) in TEACH.items():
    for j in range(nct + nst):
        name = TNAMES[ti]; ti += 1
        f, l = name.replace('Prof. ', '').split()
        role = 'class_teacher' if j < nct else 'subject_teacher'
        uid = mk_user(f'teacher-{code}-{j}', name, email_for(f, l, DOM), role, KD, ts(D0 + dt.timedelta(days=j)))
        DEPT[code]['teachers'].append(uid); TROLE[uid] = role

# ------------------------------------------------------------------ academic years
YEARS = {}
for name, s, e, act in [('2024-25', dt.date(2024, 6, 15), dt.date(2025, 4, 30), False), ('2025-26', dt.date(2025, 6, 15), dt.date(2026, 4, 30), False),
                        ('2026-27', dt.date(2026, 6, 15), dt.date(2027, 4, 30), True)]:
    YEARS[name] = U('year', 'KD', name)
    add('academic_years', id=YEARS[name], college_id=KD, name=name, start_date=s.isoformat(), end_date=e.isoformat(), is_active=act, created_at=ts(s - dt.timedelta(days=30)))
CUR, PREV, PREV2 = YEARS['2026-27'], YEARS['2025-26'], YEARS['2024-25']

# ------------------------------------------------------------------ programs, semesters, subjects
SUBJ = {
 'BCA': [['Fundamentals of Computers','Programming in C','Mathematics for Computing','Business Communication'],
         ['Data Structures','Object Oriented Programming with C++','Discrete Mathematics','Principles of Management'],
         ['Database Management Systems','Java Programming','Operating Systems','Computer Networks'],
         ['Web Technologies','Software Engineering','Python Programming','Numerical Methods'],
         ['Cloud Computing','Android App Development','Artificial Intelligence','Software Testing'],
         ['Machine Learning','Cyber Security','Data Analytics','Major Project']],
 'BSCCS': [['Problem Solving using Python','Digital Electronics','Calculus','Statistics I'],
         ['Advanced Python','Computer Organization','Linear Algebra','Statistics II'],
         ['Data Structures using C++','Theory of Computation','Database Systems','Discrete Structures'],
         ['Design and Analysis of Algorithms','Operating System Concepts','Java Fundamentals','Computer Graphics'],
         ['Compiler Design','Data Mining','Distributed Systems','Information Security'],
         ['Deep Learning','Internet of Things','Big Data Technologies','Research Project']],
 'MSCCS': [['Advanced Data Structures','Full Stack Development','Advanced DBMS','Research Methodology'],
         ['Design Patterns','DevOps Practices','Natural Language Processing','Mobile Computing'],
         ['Blockchain Technology','Cloud Native Applications','Computer Vision','Software Project Management'],
         ['Industry Internship','Dissertation','Technical Seminar','Quantum Computing (Elective)']],
 'BCOM': [['Financial Accounting I','Business Economics I','Business Mathematics','Commercial Communication'],
          ['Financial Accounting II','Business Economics II','Business Statistics','Environmental Studies'],
          ['Corporate Accounting','Business Law','Cost Accounting','Banking and Insurance'],
          ['Advanced Accounting','Company Law','Management Accounting','E-Commerce'],
          ['Income Tax','Auditing','Financial Management','Marketing Management'],
          ['Goods and Services Tax','Indian Financial System','Entrepreneurship Development','Project Work']],
 'MCOM': [['Advanced Financial Accounting','Managerial Economics','Research Methods in Commerce','Organisational Behaviour'],
          ['Strategic Management','Advanced Cost Accounting','Corporate Finance','International Business'],
          ['Direct Tax Planning','Security Analysis','Business Analytics','Human Resource Management'],
          ['Indirect Taxation','Portfolio Management','Dissertation','Corporate Governance']],
 'BBA': [['Principles of Management','Business Accounting','Micro Economics','Business Communication Skills'],
         ['Organisational Behaviour','Macro Economics','Business Statistics','Computer Applications in Business'],
         ['Marketing Management','Financial Management','Human Resource Management','Business Law'],
         ['Operations Management','Consumer Behaviour','Management Accounting','Research Methodology'],
         ['Strategic Management','Digital Marketing','Entrepreneurship','International Business'],
         ['Business Ethics','Project Management','Supply Chain Management','Final Project']]}
PROGS = [('BCA','BCA','UG',3,'SCI',45000),('BSCCS','B.Sc CS','UG',3,'SCI',38000),('MSCCS','M.Sc CS','PG',2,'SCI',60000),
         ('BCOM','B.Com','UG',3,'COMM',22000),('BBA','BBA','UG',3,'COMM',40000),('MCOM','M.Com','PG',2,'COMM',30000)]
YRL = {1: 'FY', 2: 'SY', 3: 'TY'}
PROG, SEM, SUB = {}, {}, {}   # code -> id ; (code,semno) -> id ; (code,semno) -> [subject ids]
SUBINFO = {}
for code, name, lvl, dur, dc, fee in PROGS:
    pid = U('prog', code); PROG[code] = dict(id=pid, dept=dc, dur=dur, fee=fee, level=lvl, name=name)
    add('programs', id=pid, college_id=KD, name=name, code=code, level=lvl, duration_years=dur, department_id=DEPT[dc]['id'], created_at=ts(D0))
    for sn in range(1, dur * 2 + 1):
        sid = U('sem', code, sn); SEM[(code, sn)] = sid
        add('semesters', id=sid, college_id=KD, program_id=pid, year_number=(sn + 1) // 2, semester_number=sn, name=f'Semester {sn}', created_at=ts(D0))
        SUB[(code, sn)] = []
        for i, sname in enumerate(SUBJ[code][sn - 1]):
            subid = U('subj', code, sn, i); SUB[(code, sn)].append(subid)
            scode = f"{code}{sn}{i+1:02d}"
            proj = any(w in sname for w in ('Project','Dissertation','Internship','Seminar'))
            SUBINFO[subid] = dict(name=sname, code=scode, prog=code, sem=sn)
            add('subjects', id=subid, college_id=KD, program_id=pid, department_id=DEPT[dc]['id'], semester_id=sid, code=scode, name=sname,
                credits=6 if proj else 4, is_elective='Elective' in sname, syllabus_url=None,
                syllabus_text=f"{sname} is a core course in Semester {sn} of the {name} programme. It builds conceptual understanding and practical skills assessed through internal evaluation (30) and the university examination (70).",
                objectives=f"1. Understand the fundamental concepts of {sname}.\n2. Apply the concepts to solve practical problems.\n3. Analyse case studies and real-world applications.",
                units=f"Unit I: Introduction to {sname}\nUnit II: Core concepts and techniques\nUnit III: Applications and case studies\nUnit IV: Advanced topics and recent trends",
                reference_books='Prescribed textbook as per university syllabus; reference books listed by the department.',
                teaching_hours=90 if proj else 60, created_at=ts(D0))

# ------------------------------------------------------------------ classes (3 academic years) + divisions
CLASS = {}  # (code, yearnum, yearname) -> id
def cls_name(code, yn, yname): return f"{PROG[code]['name']} - {YRL[yn]}" + ('' if yname == '2026-27' else f" ({yname})")
for code, p in PROG.items():
    for yname in ('2024-25', '2025-26', '2026-27'):
        for yn in range(1, p['dur'] + 1):
            cid = U('class', code, yn, yname); CLASS[(code, yn, yname)] = cid
            add('classes', id=cid, college_id=KD, program_id=p['id'], academic_year_id=YEARS[yname], name=cls_name(code, yn, yname), year_number=yn,
                class_teacher_id=None, created_at=ts(dt.date(int(yname[:4]), 6, 1)))
CURCLS = [(code, yn) for code, p in PROG.items() for yn in range(1, p['dur'] + 1)]
DIV = {}
for code, yn in CURCLS:
    DIV[(code, yn)] = U('div', code, yn)
    add('divisions', id=DIV[(code, yn)], class_id=CLASS[(code, yn, '2026-27')], name='A', created_at=ts(dt.date(2026, 6, 1)))

# class teachers (role class_teacher) and subject allocation
cls_by_dept = defaultdict(list)
for code, yn in CURCLS: cls_by_dept[PROG[code]['dept']].append((code, yn))
CT = {}
for dc, lst in cls_by_dept.items():
    cts = [t for t in DEPT[dc]['teachers'] if TROLE.get(t) == 'class_teacher']
    for i, (code, yn) in enumerate(lst):
        CT[(code, yn)] = cts[i % len(cts)]
for r in ROWS['classes']:
    for (code, yn), t in CT.items():
        if r['id'] == CLASS[(code, yn, '2026-27')]: r['class_teacher_id'] = t

def cur_sem(yn): return yn * 2 - 1   # odd semester running in Nov
ALLOC = {}  # (code, yn, subject_id) -> teacher
load = defaultdict(int)
for dc, lst in cls_by_dept.items():
    teachers = DEPT[dc]['teachers']
    for code, yn in lst:
        for sid in SUB[(code, cur_sem(yn))]:
            t = min(teachers, key=lambda x: (load[x], random.random()))
            if load[t] >= 4: raise SystemExit('teacher overloaded')
            load[t] += 1; ALLOC[(code, yn, sid)] = t
            add('subject_assignments', id=U('alloc', code, yn, sid), college_id=KD, subject_id=sid, class_id=CLASS[(code, yn, '2026-27')], teacher_id=t,
                academic_year_id=CUR, created_at=ts(dt.date(2026, 6, 10)))

# ------------------------------------------------------------------ timetable (conflict-free)
DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
PERIODS = [('09:00', '10:00'), ('10:00', '11:00'), ('11:15', '12:15'), ('12:15', '13:15')]
def build_tt():
    busy = set(); plan = {}
    for ci, (code, yn) in enumerate(CURCLS):
        subs = SUB[(code, cur_sem(yn))]
        for attempt in range(400):
            need = {s: 5 for s in subs}; slots = {}; ok = True
            order = [(d, p) for d in range(5) for p in range(4)]
            for d, p in order:
                cand = [s for s in subs if need[s] > 0 and (ALLOC[(code, yn, s)], d, p) not in busy
                        and sum(1 for pp in range(4) if slots.get((d, pp)) == s) < 2]
                if not cand: ok = False; break
                s = max(cand, key=lambda s: (need[s], random.random()))
                slots[(d, p)] = s; need[s] -= 1
            if ok: break
        else: return None
        for (d, p), s in slots.items(): busy.add((ALLOC[(code, yn, s)], d, p))
        plan[(code, yn)] = slots
    return plan
for _ in range(50):
    TT = build_tt()
    if TT: break
else: raise SystemExit('timetable failed')
LAB_WORDS = ('Programming','Python','Java','Data Structures','Web','Android','Full Stack')
for i, (code, yn) in enumerate(CURCLS):
    label = f"{YRL[yn]} {code}"; room = f"Room {101 + i}"
    for (d, p), s in sorted(TT[(code, yn)].items()):
        lab = any(w in SUBINFO[s]['name'] for w in LAB_WORDS)
        add('timetable', id=U('tt', code, yn, d, p), college_id=KD, class_id=CLASS[(code, yn, '2026-27')], semester_id=SEM[(code, cur_sem(yn))], subject_id=s,
            teacher_id=ALLOC[(code, yn, s)], day=DAYS[d], start_time=PERIODS[p][0], end_time=PERIODS[p][1],
            room=f"Computer Lab ({label})" if lab and p >= 2 else room, created_at=ts(dt.date(2026, 6, 12)))

# ------------------------------------------------------------------ students, applications, parents
ADM = STAFF['admission']
USED_NAMES = set()
STU = []    # dicts
roll_seen = set()
for code, yn in CURCLS:
    p = PROG[code]; n = 12 if p['level'] == 'UG' else 10
    join_year = {1: '2026-27', 2: '2025-26', 3: '2024-25'}[yn]
    for k in range(1, n + 1):
        female = random.random() < 0.48
        while True:
            first = random.choice(FIRST_F if female else FIRST_M); last = random.choice(LAST)
            if f"{first} {last}" not in USED_NAMES: USED_NAMES.add(f"{first} {last}"); break
        roll = f"{code}{YRL[yn]}{k:02d}"; assert roll not in roll_seen; roll_seen.add(roll)
        age = 17 + yn + (3 if p['level'] == 'PG' else 0)
        dob = dt.date(2026 - age, random.randint(1, 12), random.randint(1, 28))
        em = email_for(first, last, 'student.'+DOM)
        jd = dt.date(int(join_year[:4]), 7, random.randint(1, 25))
        uid = mk_user('stu-' + roll, f"{first} {last}", em, 'student', KD, ts(jd))
        sid = U('student', roll); aid = U('app', roll)
        pm = phone(); sm = phone()
        add('admission_applications', id=aid, college_id=KD, academic_year_id=YEARS[join_year], program_id=p['id'], department_id=DEPT[p['dept']]['id'],
            full_name=f"{first} {last}", dob=dob.isoformat(), email=em, student_mobile=sm, parent_mobile=pm,
            address=f"{random.randint(1, 250)}, {random.choice(['Chinchwad','Akurdi','Nigdi','Pimpri','Wakad','Ravet','Thergaon','Pradhikaran','Bhosari','Pimple Saudagar'])}, Pimpri-Chinchwad",
            previous_education={"qualification": "HSC (12th)" if p['level'] == 'UG' else "Bachelor's degree", "board": "Maharashtra State Board" if p['level'] == 'UG' else "SPPU",
                                "percentage": round(random.uniform(58, 94), 1), "passing_year": int(join_year[:4])},
            photo_url=None, documents=[], student_otp_verified=True, parent_otp_verified=True, status='approved', reviewed_by=ADM,
            review_notes='Documents verified. Admission confirmed.', docs_status='verified', document_url=None,
            created_at=ts(jd - dt.timedelta(days=20)), updated_at=ts(jd))
        stu = dict(id=sid, user_id=uid, college_id=KD, application_id=aid, roll_number=roll, program_id=p['id'], class_id=CLASS[(code, yn, '2026-27')],
                   division_id=DIV[(code, yn)], semester_id=SEM[(code, cur_sem(yn))], academic_year_id=CUR, full_name=f"{first} {last}", dob=dob.isoformat(),
                   email=em, mobile=sm, parent_mobile=pm, photo_url=None, status='active', created_at=ts(jd))
        add('students', **stu)
        STU.append(dict(stu, code=code, yn=yn, first=first, last=last, female=female, join=join_year))

# 3 repeaters in FY (failed FY in 2025-26)
REPEATERS = [s for s in STU if s['yn'] == 1 and s['roll_number'] in ('BCAFY11', 'BCOMFY11', 'BBAFY11')]
# parents: one per student, parent login linked
for s in STU:
    while True:
        pf = random.choice(PARENT_M)
        if f"{pf} {s['last']}" not in USED_NAMES: USED_NAMES.add(f"{pf} {s['last']}"); break
    pid = U('parent', s['roll_number'])
    em = email_for(pf, s['last'], 'parents.'+DOM)
    puid = mk_user('par-' + s['roll_number'], f"{pf} {s['last']}", em, 'parent', KD, s['created_at'], s['parent_mobile'])
    add('parents', id=pid, user_id=puid, college_id=KD, full_name=f"{pf} {s['last']}", mobile=s['parent_mobile'], email=em, created_at=s['created_at'])
    add('parent_student_links', id=U('psl', s['roll_number']), parent_id=pid, student_id=s['id'], relationship='father', is_primary=True,
        verified=True, verified_at=s['created_at'], created_at=s['created_at'])

# pending / other applications for the current year + enquiries
for i in range(26):
    code = random.choice(list(PROG)); p = PROG[code]
    female = random.random() < 0.5; first = random.choice(FIRST_F if female else FIRST_M); last = random.choice(LAST)
    st = ['pending'] * 12 + ['correction_required'] * 6 + ['rejected'] * 8
    status = st[i]; docs = 'verified' if (status == 'pending' and i % 2 == 0) else ('incomplete' if status == 'correction_required' else 'pending')
    d = rdate(dt.date(2026, 10, 1), dt.date(2026, 11, 18))
    add('admission_applications', id=U('app-new', i), college_id=KD, academic_year_id=CUR, program_id=p['id'], department_id=DEPT[p['dept']]['id'],
        full_name=f"{first} {last}", dob=dt.date(2008 if p['level'] == 'UG' else 2004, random.randint(1, 12), random.randint(1, 28)).isoformat(),
        email=email_for(first, last, 'applicants.'+DOM), student_mobile=phone(), parent_mobile=phone(), address='Pimpri-Chinchwad, Maharashtra',
        previous_education={"qualification": "HSC (12th)" if p['level'] == 'UG' else "Bachelor's degree", "percentage": round(random.uniform(45, 92), 1), "passing_year": 2026},
        photo_url=None, documents=[], student_otp_verified=status != 'rejected' or i % 2 == 0, parent_otp_verified=status == 'pending',
        status=status, reviewed_by=ADM if status != 'pending' else None,
        review_notes={'pending': None, 'correction_required': 'Leaving certificate missing. Please upload and resubmit.', 'rejected': 'Does not meet minimum eligibility criteria.'}[status],
        docs_status=docs, document_url=None, created_at=ts(d), updated_at=ts(d))
for i in range(32):
    code = random.choice(list(PROG)); female = random.random() < 0.5
    first = random.choice(FIRST_F if female else FIRST_M); last = random.choice(LAST)
    add('enquiries', id=U('enq', i), college_id=KD, full_name=f"{first} {last}", mobile=phone(), email=email_for(first, last, 'enquiry.'+DOM),
        program_id=PROG[code]['id'], status=random.choice(['new', 'new', 'contacted', 'contacted', 'applied', 'closed']), created_at=ts(rdate(dt.date(2026, 9, 1), dt.date(2026, 11, 19)), random.randint(9, 18)))

# ------------------------------------------------------------------ progression history (promotions + results of 2025-26)
EXAMA = STAFF['exam']
by_class = defaultdict(list)
for s in STU: by_class[(s['code'], s['yn'])].append(s)
for s in STU:
    code, yn = s['code'], s['yn']
    if yn >= 2:
        add('promotions', id=U('promo', s['roll_number'], yn - 1), college_id=KD, student_id=s['id'], from_class_id=CLASS[(code, yn - 1, '2025-26')],
            to_class_id=CLASS[(code, yn, '2026-27')], semester_number=cur_sem(yn), status='promoted', created_at=ts(dt.date(2026, 6, 20)))
    if yn == 3:
        add('promotions', id=U('promo', s['roll_number'], 1), college_id=KD, student_id=s['id'], from_class_id=CLASS[(code, 1, '2024-25')],
            to_class_id=CLASS[(code, 2, '2025-26')], semester_number=3, status='promoted', created_at=ts(dt.date(2025, 6, 20)))
    if yn >= 2:
        r = random.random()
        stt = 'ATKT' if r < 0.12 else 'PASS'
        back = []
        if stt == 'ATKT':
            prev_sem = cur_sem(yn) - 1
            back = [{"subject_code": SUBINFO[x]['code'], "subject": SUBINFO[x]['name'], "semester": prev_sem, "status": "Supplementary exam pending"}
                    for x in random.sample(SUB[(code, prev_sem)], random.randint(1, 2))]
        add('academic_progression', id=U('prog', s['roll_number'], '2025-26'), college_id=KD, student_id=s['id'], academic_year_id=PREV, status=stt,
            backlogs=back, promoted=True, approved_by=EXAMA, approved_at=ts(dt.date(2026, 6, 12)),
            notes='Promoted with ATKT. Backlog subjects to be cleared in supplementary examination.' if stt == 'ATKT' else 'Passed all subjects. Promoted to next year.',
            created_at=ts(dt.date(2026, 6, 10)))
for s in REPEATERS:
    add('academic_progression', id=U('prog', s['roll_number'], '2025-26'), college_id=KD, student_id=s['id'], academic_year_id=PREV, status='FAIL',
        backlogs=[{"subject_code": SUBINFO[x]['code'], "subject": SUBINFO[x]['name'], "semester": 2, "status": "Failed"} for x in SUB[(s['code'], 2)][:3]],
        promoted=False, approved_by=EXAMA, approved_at=ts(dt.date(2026, 6, 12)), notes='Failed in more than the permitted ATKT subjects. Re-enrolled as repeater in FY.',
        created_at=ts(dt.date(2026, 6, 10)))
    add('promotions', id=U('promo', s['roll_number'], 'rep'), college_id=KD, student_id=s['id'], from_class_id=CLASS[(s['code'], 1, '2025-26')],
        to_class_id=CLASS[(s['code'], 1, '2026-27')], semester_number=1, status='detained', created_at=ts(dt.date(2026, 6, 20)))
add('result_imports', id=U('rimp', '2025-26'), college_id=KD, academic_year_id=PREV, uploaded_by=EXAMA, file_path=None, status='published',
    validation_log={"rows": 106, "matched_roll_numbers": 106, "matched_subject_codes": 106, "errors": 0}, created_at=ts(dt.date(2026, 6, 8)))
add('result_imports', id=U('rimp', '2024-25'), college_id=KD, academic_year_id=PREV2, uploaded_by=EXAMA, file_path=None, status='published',
    validation_log={"rows": 44, "matched_roll_numbers": 44, "matched_subject_codes": 44, "errors": 0}, created_at=ts(dt.date(2025, 6, 9)))

# ------------------------------------------------------------------ assignments + submissions, study materials
TODAYTS = dt.datetime(2026, 11, 20, 12)
def grade(pct):
    for g, m in (('O', 90), ('A+', 80), ('A', 70), ('B+', 60), ('B', 55), ('C', 50), ('P', 40)):
        if pct >= m: return g
    return 'F'
ATYPES = ['Unit I problem set', 'Case study analysis', 'Unit II worksheet', 'Mini project report', 'Practical record']
ability = {s['id']: random.gauss(0.68, 0.13) for s in STU}
for (code, yn, sid), t in ALLOC.items():
    cid = CLASS[(code, yn, '2026-27')]; sname = SUBINFO[sid]['name']
    for k, (off, title) in enumerate([(-random.randint(12, 30), ATYPES[int(sid[:4],16) % 5]), (random.randint(3, 16), ATYPES[(int(sid[:4],16) + 2) % 5])]):
        dl_ = TODAYTS + dt.timedelta(days=off)
        aid = U('asg', sid, code, yn, k)
        add('assignments', id=aid, college_id=KD, subject_id=sid, class_id=cid, teacher_id=t, title=f"{sname}: {title}",
            instructions=f"Complete the {title.lower()} for {sname}. Write answers neatly, cite references and upload a single PDF. Late submissions lose 1 mark per day.",
            max_marks=20, allowed_file_types=PGArr(['pdf', 'doc', 'docx', 'jpg', 'png'], 'text'), open_at=min(dl_ - dt.timedelta(days=10), TODAYTS - dt.timedelta(hours=3)).strftime('%Y-%m-%d %H:%M:00+05:30'),
            deadline=dl_.strftime('%Y-%m-%d 23:59:00+05:30'), grace_hours=12, late_penalty_per_day=1, final_cutoff=(dl_ + dt.timedelta(days=3)).strftime('%Y-%m-%d 23:59:00+05:30'),
            attachment_url=None, created_at=min(dl_ - dt.timedelta(days=10), TODAYTS - dt.timedelta(hours=3)).strftime('%Y-%m-%d %H:00:00+05:30'))
        if off < 0:
            for s in by_class[(code, yn)]:
                if random.random() < 0.88:
                    late = random.random() < 0.12; ld = random.randint(1, 2) if late else 0
                    sub_at = dl_ + (dt.timedelta(days=ld, hours=-3) if late else dt.timedelta(days=-random.randint(0, 5), hours=-random.randint(1, 8)))
                    om = max(6, min(20, round(ability[s['id']] * 20 + random.uniform(-3, 3))))
                    add('assignment_submissions', id=U('sub', aid, s['id']), assignment_id=aid, student_id=s['id'], file_urls=PGArr([], 'text'),
                        submitted_at=sub_at.strftime('%Y-%m-%d %H:%M:00+05:30'), is_late=late, late_days=ld, original_marks=om, penalty=ld,
                        final_marks=max(0, om - ld), feedback=random.choice(['Well structured answers.', 'Good attempt; add more examples.', 'Excellent work.', 'Improve presentation and diagrams.', 'Satisfactory. Revise Unit I concepts.']),
                        evaluated_by=t, evaluated_at=(dl_ + dt.timedelta(days=4)).strftime('%Y-%m-%d 16:00:00+05:30'))
    add('study_materials', id=U('mat', sid, code, yn), college_id=KD, subject_id=sid, class_id=cid, title=f"{sname} — reference reading (Wikipedia)",
        file_url='https://en.wikipedia.org/wiki/Special:Search?search=' + sname.replace(' ', '+').replace('(', '').replace(')', ''),
        uploaded_by=t, created_at=ts(dt.date(2026, 7, random.randint(1, 28)), 11))

# ------------------------------------------------------------------ quizzes
QB = {
 'Fundamentals of Computers': [('Which device is used to input text?', ['Monitor', 'Keyboard', 'Printer', 'Speaker'], 1), ('1 byte equals how many bits?', ['4', '8', '16', '32'], 1), ('Which is volatile memory?', ['ROM', 'Hard disk', 'RAM', 'DVD'], 2), ('CPU stands for?', ['Central Processing Unit', 'Control Program Unit', 'Computer Personal Unit', 'Central Peripheral Unit'], 0), ('Which is an operating system?', ['MS Word', 'Linux', 'Chrome', 'Excel'], 1)],
 'Programming in C': [('Which symbol ends a C statement?', [':', ';', '.', ','], 1), ('Format specifier for int in printf?', ['%c', '%f', '%d', '%s'], 2), ('Which loop runs at least once?', ['for', 'while', 'do-while', 'none'], 2), ('Size of char in C (bytes)?', ['1', '2', '4', '8'], 0), ('Header for printf?', ['stdlib.h', 'stdio.h', 'math.h', 'string.h'], 1)],
 'Database Management Systems': [('SQL command to remove a table?', ['DELETE', 'DROP', 'REMOVE', 'CLEAR'], 1), ('A primary key must be?', ['Unique and not null', 'Nullable', 'Duplicate', 'Text only'], 0), ('Which normal form removes partial dependency?', ['1NF', '2NF', '3NF', 'BCNF'], 1), ('ACID: A stands for?', ['Access', 'Atomicity', 'Accuracy', 'Availability'], 1), ('JOIN that returns matching rows only?', ['LEFT JOIN', 'INNER JOIN', 'FULL JOIN', 'CROSS JOIN'], 1)],
 'Java Programming': [('Java source compiles to?', ['Machine code', 'Bytecode', 'Assembly', 'C code'], 1), ('Keyword to inherit a class?', ['implements', 'extends', 'inherits', 'super'], 1), ('Entry point method?', ['start()', 'main()', 'run()', 'init()'], 1), ('Which is not a primitive?', ['int', 'boolean', 'String', 'char'], 2), ('JVM stands for?', ['Java Virtual Machine', 'Java Variable Method', 'Joint Virtual Memory', 'Java Visual Model'], 0)],
 'Operating Systems': [('Which scheduling may cause starvation?', ['Round Robin', 'FCFS', 'Priority', 'None'], 2), ('Deadlock needs how many Coffman conditions?', ['2', '3', '4', '5'], 2), ('Paging helps avoid?', ['External fragmentation', 'Deadlock', 'Interrupts', 'Booting'], 0), ('A process in execution is?', ['Ready', 'Running', 'Blocked', 'New'], 1), ('Semaphore is used for?', ['Synchronization', 'Compilation', 'Networking', 'Storage'], 0)],
 'Cloud Computing': [('SaaS stands for?', ['Software as a Service', 'Storage as a Service', 'System as a Service', 'Server as a Service'], 0), ('Which is an IaaS feature?', ['Virtual machines', 'Email app', 'Word processor', 'Spreadsheet'], 0), ('Elasticity means?', ['Fixed capacity', 'Scaling resources on demand', 'Manual backups', 'Single tenant'], 1), ('Public cloud is owned by?', ['The customer', 'A service provider', 'Government only', 'Nobody'], 1), ('Virtualization software layer is the?', ['Kernel', 'Hypervisor', 'Compiler', 'Router'], 1)],
 'Artificial Intelligence': [('Turing Test evaluates?', ['Speed', 'Machine intelligence', 'Memory', 'Storage'], 1), ('A* is a?', ['Sorting algorithm', 'Search algorithm', 'Database', 'Language'], 1), ('Which is supervised learning?', ['Clustering', 'Classification', 'Association', 'Dimensionality reduction'], 1), ('Heuristic means?', ['Exact rule', 'Rule of thumb', 'Random guess', 'Hardware'], 1), ('Prolog is used in?', ['Logic programming', 'Web design', 'Graphics', 'Networking'], 0)],
 'Financial Accounting I': [('Assets = Liabilities + ?', ['Expenses', 'Capital', 'Income', 'Drawings'], 1), ('Debit the receiver, credit the giver applies to?', ['Real a/c', 'Personal a/c', 'Nominal a/c', 'All'], 1), ('Trial balance checks?', ['Profit', 'Arithmetical accuracy', 'Cash only', 'Tax'], 1), ('Depreciation is a?', ['Revenue', 'Non-cash expense', 'Liability', 'Asset'], 1), ('Journal is the book of?', ['Final entry', 'Original entry', 'Cash', 'Ledger'], 1)],
 'Banking and Insurance': [('RBI was established in?', ['1935', '1947', '1950', '1969'], 0), ('CRR is maintained with?', ['SBI', 'RBI', 'SEBI', 'NABARD'], 1), ('Insurance works on the principle of?', ['Speculation', 'Pooling of risk', 'Lending', 'Saving'], 1), ('NEFT is used for?', ['Fund transfer', 'Loan approval', 'Insurance claim', 'Tax filing'], 0), ('A cheque is a?', ['Bill of exchange', 'Promissory note', 'Bond', 'Share'], 0)],
 'Principles of Management': [('POSDCORB was given by?', ['Taylor', 'Gulick', 'Fayol', 'Drucker'], 1), ('Fayol gave how many principles?', ['10', '12', '14', '16'], 2), ('Planning is a ___ function.', ['Primary', 'Secondary', 'Optional', 'Final'], 0), ('Span of control relates to?', ['Organising', 'Planning', 'Controlling', 'Staffing'], 0), ('Father of scientific management?', ['Fayol', 'Taylor', 'Maslow', 'Weber'], 1)],
 'Advanced Data Structures': [('Height of AVL tree with n nodes?', ['O(n)', 'O(log n)', 'O(1)', 'O(n log n)'], 1), ('Trie is best for?', ['Prefix search', 'Sorting numbers', 'Graphs', 'Hashing'], 0), ('Red-black tree root colour?', ['Red', 'Black', 'Either', 'None'], 1), ('Union-Find supports?', ['Disjoint sets', 'Queues', 'Stacks', 'Heaps'], 0), ('B-trees are used in?', ['Databases', 'Compilers', 'Graphics', 'Networking'], 0)],
 'Problem Solving using Python': [('Which keyword defines a function in Python?', ['func', 'def', 'function', 'lambda'], 1), ('What is the output of len([1, 2, 3])?', ['2', '3', '4', 'Error'], 1), ('Which data type is immutable?', ['list', 'dict', 'tuple', 'set'], 2), ('What does // do in Python 3?', ['Float division', 'Floor division', 'Modulo', 'Power'], 1), ('Which statement handles exceptions?', ['try-except', 'if-else', 'for-in', 'with-as'], 0)],
 'Organisational Behaviour': [('Maslow\'s highest need in the hierarchy is?', ['Safety', 'Esteem', 'Self-actualisation', 'Social'], 2), ('Herzberg\'s two factors are motivators and?', ['Hygiene factors', 'Drivers', 'Rewards', 'Goals'], 0), ('Theory X assumes employees?', ['Like work', 'Dislike work', 'Seek responsibility', 'Are creative'], 1), ('The Big Five model describes?', ['Personality traits', 'Leadership styles', 'Budgets', 'Markets'], 0), ('Groupthink is a risk in?', ['Cohesive groups', 'Individuals', 'Machines', 'Audits'], 0)],
 'Database Systems': [('Which key uniquely identifies a row?', ['Foreign key', 'Primary key', 'Candidate index', 'Alternate field'], 1), ('SQL clause to filter groups?', ['WHERE', 'HAVING', 'ORDER BY', 'LIMIT'], 1), ('An ER diagram rectangle represents?', ['Attribute', 'Entity', 'Relationship', 'Key'], 1), ('Which is a DML command?', ['CREATE', 'ALTER', 'INSERT', 'DROP'], 2), ('Rollback undoes changes of?', ['A committed transaction', 'An uncommitted transaction', 'A table schema', 'An index'], 1)],
 'Software Project Management': [('Critical Path Method finds the?', ['Cheapest path', 'Longest path of dependent tasks', 'Shortest task', 'Team size'], 1), ('COCOMO is used for?', ['Cost estimation', 'Testing', 'Deployment', 'Design'], 0), ('A Gantt chart shows?', ['Schedule over time', 'Class diagram', 'Network packets', 'Code coverage'], 0), ('In Scrum, a sprint is a?', ['Time-boxed iteration', 'Bug report', 'Release note', 'Server'], 0), ('Risk = probability × ?', ['Cost', 'Impact', 'Time', 'Scope'], 1)],
 'Human Resource Management': [('Recruitment is followed by?', ['Selection', 'Retirement', 'Appraisal', 'Promotion'], 0), ('360-degree feedback is used in?', ['Performance appraisal', 'Payroll', 'Accounting', 'Marketing'], 0), ('Job analysis produces job description and?', ['Job specification', 'Balance sheet', 'Invoice', 'Budget'], 0), ('Induction is meant for?', ['New employees', 'Retired employees', 'Customers', 'Suppliers'], 0), ('Attrition means?', ['Employees leaving', 'Hiring', 'Training', 'Bonus'], 0)],
 'Digital Marketing': [('SEO stands for?', ['Search Engine Optimisation', 'Sales Engine Output', 'Social Email Operation', 'Search Email Order'], 0), ('CTR is clicks divided by?', ['Impressions', 'Sales', 'Visitors', 'Cost'], 0), ('PPC means?', ['Pay per click', 'Price per customer', 'Post per channel', 'Page per click'], 0), ('A landing page is designed for?', ['Conversion', 'Storage', 'Accounting', 'Printing'], 0), ('Organic traffic comes from?', ['Unpaid search results', 'Paid ads', 'Print media', 'Billboards'], 0)],
 'Information Security': [('CIA triad: C stands for?', ['Control', 'Confidentiality', 'Compliance', 'Cipher'], 1), ('AES is a?', ['Symmetric cipher', 'Hash function', 'Firewall', 'Protocol'], 0), ('Phishing is a form of?', ['Social engineering', 'Encryption', 'Backup', 'Compression'], 0), ('SHA-256 produces a?', ['256-bit hash', '256-byte key', 'Public key', 'Certificate'], 0), ('Two-factor authentication adds?', ['A second proof of identity', 'A second password field only', 'More storage', 'Faster login'], 0)],
 'Marketing Management': [('4 Ps include?', ['Price', 'People', 'Process', 'Physical'], 0), ('STP: S stands for?', ['Selling', 'Segmentation', 'Strategy', 'Service'], 1), ('Product life cycle first stage?', ['Growth', 'Introduction', 'Maturity', 'Decline'], 1), ('Brand loyalty means?', ['Repeat purchase', 'Discount', 'Advertising', 'Pricing'], 0), ('Marketing mix was popularised by?', ['Kotler', 'Taylor', 'Fayol', 'Porter'], 0)],
}
for (code, yn, sid), t in ALLOC.items():
    sname = SUBINFO[sid]['name']
    if sname not in QB: continue
    qid = U('quiz', sid, code, yn)
    qs = [dict(q=a, options=b, answer=c, marks=2) for a, b, c in QB[sname]]
    od = rdate(dt.date(2026, 9, 10), dt.date(2026, 11, 10))
    add('quizzes', id=qid, college_id=KD, subject_id=sid, class_id=CLASS[(code, yn, '2026-27')], teacher_id=t, title=f"{sname} — Unit test quiz",
        questions=qs, duration_minutes=15, max_marks=10, negative_marking=False, open_at=ts(od, 9), close_at=ts(od + dt.timedelta(days=7), 18), created_at=ts(od, 8))
    for s in by_class[(code, yn)]:
        if random.random() < 0.8:
            right = sum(1 for _ in range(5) if random.random() < min(0.97, ability[s['id']] + 0.1))
            add('quiz_attempts', id=U('qa', qid, s['id']), college_id=KD, quiz_id=qid, student_id=s['id'], score=right * 2, total=10, status='completed',
                created_at=ts(od + dt.timedelta(days=random.randint(0, 6)), random.randint(10, 17)))

# ------------------------------------------------------------------ exams, results, internal marks
for (code, yn, sid), t in ALLOC.items():
    cid = CLASS[(code, yn, '2026-27')]; i = SUB[(code, cur_sem(yn))].index(sid)
    mid = U('exam', sid, code, yn, 'mid'); end = U('exam', sid, code, yn, 'end')
    add('exams', id=mid, college_id=KD, subject_id=sid, class_id=cid, academic_year_id=CUR, name=f"Mid-Semester Test — {SUBINFO[sid]['name']}",
        exam_date=(dt.date(2026, 9, 21) + dt.timedelta(days=i)).isoformat(), max_marks=30, created_at=ts(dt.date(2026, 9, 1)))
    add('exams', id=end, college_id=KD, subject_id=sid, class_id=cid, academic_year_id=CUR, name=f"Semester End Examination — {SUBINFO[sid]['name']}",
        exam_date=(dt.date(2026, 12, 7) + dt.timedelta(days=2 * i)).isoformat(), max_marks=70, created_at=ts(dt.date(2026, 11, 2)))
    for s in by_class[(code, yn)]:
        m = max(5, min(30, round(ability[s['id']] * 30 + random.uniform(-5, 5))))
        add('exam_results', id=U('res', mid, s['id']), college_id=KD, exam_id=mid, student_id=s['id'], marks_obtained=m, grade=grade(m / 30 * 100),
            is_published=not ((code, yn) == ('BBA', 3) and i == 3), status='entered' if ((code, yn) == ('BBA', 3) and i == 3) else 'approved', created_at=ts(dt.date(2026, 10, 3)))
        im = max(6, min(20, round(ability[s['id']] * 20 + random.uniform(-3, 3))))
        add('internal_marks', id=U('im', sid, s['id']), college_id=KD, student_id=s['id'], subject_id=sid, academic_year_id=CUR, marks=im, max_marks=20,
            created_at=ts(dt.date(2026, 11, 14)))

# ------------------------------------------------------------------ fees
ACC = STAFF['accounts']; rc = 0
FEEHEADS = [('Tuition fee', None, dt.date(2026, 7, 31)), ('Examination fee', 2500, dt.date(2026, 11, 30)), ('Library & activity fee', 3000, dt.date(2026, 8, 31))]
for code, yn in CURCLS:
    p = PROG[code]
    for title, amt, due in FEEHEADS:
        add('fee_structures', id=U('fs', code, yn, title), college_id=KD, title=f"{title} — {YRL[yn]} {code} 2026-27", academic_year_id=CUR, program_id=p['id'],
            class_id=CLASS[(code, yn, '2026-27')], semester_id=None, amount=amt or p['fee'], due_date=due.isoformat(), created_at=ts(dt.date(2026, 6, 5)))
MODES = ['UPI', 'UPI', 'Cash', 'Bank Transfer', 'Online Payment']
for s in STU:
    p = PROG[s['code']]
    for title, amt, due in FEEHEADS:
        amount = amt or p['fee']; fid = U('fee', s['roll_number'], title)
        r = random.random()
        if title == 'Tuition fee': paid = amount if r < 0.58 else (round(amount * random.choice([0.4, 0.5, 0.6]), -2) if r < 0.86 else 0)
        elif title == 'Examination fee': paid = amount if r < 0.72 else 0
        else: paid = amount if r < 0.8 else 0
        status = 'paid' if paid >= amount else ('partial' if paid > 0 else 'pending')
        add('student_fees', id=fid, college_id=KD, student_id=s['id'], academic_year_id=CUR, title=f"{title} 2026-27", amount=amount, paid_amount=paid,
            due_date=due.isoformat(), status=status, created_at=ts(dt.date(2026, 6, 6)))
        parts = [paid] if paid and (title != 'Tuition fee' or random.random() < 0.6 or status == 'partial') else ([round(paid / 2, -2), paid - round(paid / 2, -2)] if paid else [])
        for j, amt_p in enumerate(parts):
            rc += 1
            pd = rdate(dt.date(2026, 6, 15), due) if j == 0 else rdate(dt.date(2026, 8, 1), dt.date(2026, 11, 15))
            if pd > TODAY: pd = TODAY - dt.timedelta(days=1)
            mode = random.choice(MODES)
            add('fee_payments', id=U('pay', fid, j), college_id=KD, fee_id=fid, student_id=s['id'], amount=amt_p, mode=mode,
                reference=None if mode == 'Cash' else f"TXN{random.randint(10**9, 10**10 - 1)}", paid_on=pd.isoformat(), received_by=ACC,
                receipt_no=f"ATSS/26-27/{rc:05d}", created_at=ts(pd, random.randint(10, 16)))

# ------------------------------------------------------------------ library
BOOKS = [('Let Us C','Yashavant Kanetkar'),('Programming in ANSI C','E. Balagurusamy'),('The C Programming Language','Brian W. Kernighan, Dennis M. Ritchie'),
 ('Database System Concepts','Abraham Silberschatz, Henry F. Korth, S. Sudarshan'),('Fundamentals of Database Systems','Ramez Elmasri, Shamkant B. Navathe'),
 ('Operating System Concepts','Abraham Silberschatz, Peter B. Galvin, Greg Gagne'),('Modern Operating Systems','Andrew S. Tanenbaum'),('Computer Networks','Andrew S. Tanenbaum'),
 ('Data Communications and Networking','Behrouz A. Forouzan'),('Java: The Complete Reference','Herbert Schildt'),('Head First Java','Kathy Sierra, Bert Bates'),
 ('Introduction to Algorithms','Thomas H. Cormen et al.'),('Data Structures Through C','Yashavant Kanetkar'),('Clean Code','Robert C. Martin'),
 ('Software Engineering: A Practitioner\'s Approach','Roger S. Pressman'),('Artificial Intelligence: A Modern Approach','Stuart Russell, Peter Norvig'),
 ('Python Crash Course','Eric Matthes'),('Automate the Boring Stuff with Python','Al Sweigart'),('Cloud Computing: Principles and Paradigms','Rajkumar Buyya et al.'),
 ('Hands-On Machine Learning','Aurélien Géron'),('Computer Organization and Architecture','William Stallings'),('Digital Design','M. Morris Mano'),
 ('Discrete Mathematics and Its Applications','Kenneth H. Rosen'),('Higher Engineering Mathematics','B. S. Grewal'),('Compilers: Principles, Techniques and Tools','Alfred V. Aho et al.'),
 ('Design Patterns','Erich Gamma et al.'),('The Pragmatic Programmer','Andrew Hunt, David Thomas'),('Financial Accounting','T. S. Grewal'),
 ('Advanced Accountancy','R. L. Gupta, M. Radhaswamy'),('Cost Accounting','S. P. Jain, K. L. Narang'),('Business Law','N. D. Kapoor'),
 ('Income Tax Law and Practice','Vinod K. Singhania'),('Auditing','B. N. Tandon'),('Indian Financial System','M. Y. Khan'),('Financial Management','Prasanna Chandra'),
 ('Management Accounting','M. Y. Khan, P. K. Jain'),('Business Economics','H. L. Ahuja'),('Business Statistics','S. P. Gupta'),('Banking Theory, Law and Practice','E. Gordon, K. Natarajan'),
 ('Corporate Accounting','S. N. Maheshwari'),('Principles of Management','Harold Koontz, Heinz Weihrich'),('Marketing Management','Philip Kotler, Kevin Lane Keller'),
 ('Organizational Behavior','Stephen P. Robbins'),('Human Resource Management','Gary Dessler'),('Strategic Management','Fred R. David'),('Operations Management','William J. Stevenson'),
 ('Consumer Behaviour','Leon G. Schiffman'),('Entrepreneurship Development','S. S. Khanka'),('Business Communication','Urmila Rai, S. M. Rai'),('Research Methodology','C. R. Kothari'),
 ('Digital Marketing','Seema Gupta'),('International Business','Charles W. L. Hill'),('Supply Chain Management','Sunil Chopra, Peter Meindl'),('Business Ethics','A. C. Fernando'),
 ('The Intelligent Investor','Benjamin Graham'),('Wings of Fire','A. P. J. Abdul Kalam'),('Atomic Habits','James Clear'),('Rich Dad Poor Dad','Robert T. Kiyosaki'),
 ('Thinking, Fast and Slow','Daniel Kahneman'),('Zero to One','Peter Thiel')]
BK = []
for i, (t, a) in enumerate(BOOKS):
    bid = U('book', i); BK.append(bid)
    add('library_books', id=bid, college_id=KD, title=t, author=a, isbn=None, copies=random.choice([2, 3, 4, 5, 6, 8]), created_at=ts(dt.date(2024, 6, 1) + dt.timedelta(days=i)))
LIBR = STAFF['library']
teach_all = [t for d in DEPT.values() for t in d['teachers']]
for i in range(96):
    staff_b = i >= 84
    s = random.choice(STU)
    io = rdate(dt.date(2026, 8, 1), dt.date(2026, 11, 18)); due = io + dt.timedelta(days=14)
    returned = io < dt.date(2026, 10, 25) and random.random() < 0.8 or (io < dt.date(2026, 11, 5) and random.random() < 0.3)
    ro = min(TODAY - dt.timedelta(days=1), io + dt.timedelta(days=random.randint(5, 18))) if returned else None
    add('library_issues', id=U('iss', i), college_id=KD, book_id=random.choice(BK), student_id=None if staff_b else s['id'],
        borrower_type='staff' if staff_b else 'student', staff_user_id=random.choice(teach_all) if staff_b else None,
        issued_on=io.isoformat(), due_on=due.isoformat(), returned_on=ro.isoformat() if ro else None, status='returned' if ro else 'issued', created_at=ts(io, 11))

# ------------------------------------------------------------------ placements + TPO
COMP = [('Nexora Technologies', 'Software Engineer Trainee', 4.5), ('BlueLeaf Analytics', 'Data Analyst', 5.2), ('Quantix Systems', 'Associate Developer', 3.8),
        ('Vertex Cloud Labs', 'Cloud Support Associate', 4.2), ('Finlogic Advisors', 'Audit Associate', 3.6), ('Crestline Bank', 'Relationship Officer', 3.4),
        ('Orbit Retail', 'Management Trainee', 4.0), ('Sparkline Media', 'Digital Marketing Executive', 3.2), ('Helix Health IT', 'QA Engineer', 4.4), ('Ledgerwise Consulting', 'Tax Analyst', 3.9)]
FINAL = [s for s in STU if (s['yn'] == 3) or (PROG[s['code']]['level'] == 'PG' and s['yn'] == 2)]
cs_like = {'BCA', 'BSCCS', 'MSCCS'}
for i, s in enumerate(FINAL):
    for j in range(1 if random.random() < 0.6 else 2):
        pool = COMP[:4] + [COMP[8]] if s['code'] in cs_like else COMP[4:8] + [COMP[9]]
        c, role, pkg = random.choice(pool)
        st = random.choices(['applied', 'shortlisted', 'selected', 'rejected'], [3, 3, 3, 2])[0]
        pd = rdate(dt.date(2026, 8, 20), dt.date(2026, 11, 18))
        add('placements', id=U('plc', s['roll_number'], j), college_id=KD, student_id=s['id'], company=c, job_role=role,
            package_lpa=round(pkg + (0.6 if s['code'] in ('MSCCS', 'MCOM') else 0) + random.uniform(-0.3, 0.5), 1), status=st,
            placement_date=pd.isoformat() if st == 'selected' else None, created_at=ts(pd, 12))
TPO = [('Placement drive', 'Campus drive — Nexora Technologies', 'Nexora Technologies', dt.date(2026, 9, 18), 'BCA', 3, 'completed'),
       ('Placement drive', 'Campus drive — BlueLeaf Analytics', 'BlueLeaf Analytics', dt.date(2026, 10, 9), 'MSCCS', 2, 'completed'),
       ('Placement drive', 'Pool drive — Finlogic Advisors', 'Finlogic Advisors', dt.date(2026, 10, 23), 'BCOM', 3, 'completed'),
       ('Placement drive', 'Campus drive — Orbit Retail', 'Orbit Retail', dt.date(2026, 12, 4), 'BBA', 3, 'planned'),
       ('Training', 'Aptitude & reasoning bootcamp', 'ATSS Training Cell', dt.date(2026, 8, 24), 'BCA', 3, 'completed'),
       ('Training', 'Soft skills and interview preparation', 'ATSS Training Cell', dt.date(2026, 9, 7), 'BCOM', 3, 'completed'),
       ('Workshop', 'Git, GitHub and open-source contribution', 'Developer Community Pune', dt.date(2026, 10, 3), 'BSCCS', 2, 'completed'),
       ('Workshop', 'Excel for finance professionals', 'Finlogic Advisors', dt.date(2026, 11, 7), 'MCOM', 1, 'completed'),
       ('Internship', 'Summer internship programme', 'Vertex Cloud Labs', dt.date(2026, 5, 15), 'MSCCS', 1, 'completed'),
       ('Collaboration', 'MoU for industry projects', 'Helix Health IT', dt.date(2026, 7, 20), 'BCA', 3, 'ongoing'),
       ('Training', 'Mock interviews with alumni', 'Alumni Association', dt.date(2026, 11, 28), 'BBA', 3, 'planned'),
       ('Activity', 'Resume writing clinic', 'ATSS Training Cell', dt.date(2026, 11, 14), 'BSCCS', 3, 'completed'),
       ('Workshop', 'Introduction to cloud certifications', 'Vertex Cloud Labs', dt.date(2026, 12, 12), 'BCA', 2, 'planned'),
       ('Placement drive', 'Campus drive — Crestline Bank', 'Crestline Bank', dt.date(2026, 11, 20), 'BCOM', 3, 'ongoing'),
       ('Internship', 'Winter internship — digital marketing', 'Sparkline Media', dt.date(2026, 12, 15), 'BBA', 2, 'planned')]
for i, (ty, ti_, org, d, code, yn, st) in enumerate(TPO):
    add('tpo_records', id=U('tpo', i), college_id=KD, type=ty, title=ti_, organization=org, event_date=d.isoformat(), program_id=PROG[code]['id'],
        class_id=CLASS[(code, yn, '2026-27')], semester_id=SEM[(code, cur_sem(yn))], student_count=len(by_class[(code, yn)]) if st != 'planned' else None, status=st,
        description=f"{ti_} organised by the Training & Placement Cell for {YRL[yn]} {code} students.", file_url=None, created_at=ts(min(d - dt.timedelta(days=14), dt.date(2026, 11, 12))))

# ------------------------------------------------------------------ clubs, competitions, activity marks, certificates
CLUBS = [('Coding Club', 'Competitive programming, hackathons and peer learning.', 40, True), ('Robotics & IoT Club', 'Build robots and smart devices.', 25, False),
         ('Finance & Investment Club', 'Stock market simulations and finance talks.', 35, True), ('Literary Society', 'Debates, elocution and creative writing.', 30, True),
         ('Music Club', 'Vocal and instrumental performances.', 25, True), ('Drama Club', 'Theatre and street plays.', 20, False),
         ('NSS Unit', 'National Service Scheme community activities.', 50, True), ('Sports Committee', 'Cricket, football, athletics and indoor games.', 60, True)]
CL = []
for i, (n, d, cap, auto) in enumerate(CLUBS):
    cid = U('club', i); CL.append((cid, cap))
    add('clubs', id=cid, college_id=KD, name=n, description=d, capacity=cap, auto_approve=auto, created_at=ts(dt.date(2026, 6, 20)))
seen = set()
for i in range(150):
    s = random.choice(STU); c, cap = random.choice(CL)
    if (c, s['id']) in seen: continue
    seen.add((c, s['id']))
    st = random.choices(['approved', 'pending', 'rejected'], [8, 2, 1])[0]
    add('club_enrollments', id=U('ce', c, s['id']), college_id=KD, club_id=c, student_id=s['id'], status=st,
        requested_at=ts(rdate(dt.date(2026, 7, 1), dt.date(2026, 11, 15))), reviewed_at=ts(dt.date(2026, 11, 16)) if st != 'pending' else None,
        reviewed_by=STAFF['activity'] if st != 'pending' else None)
COMPS = [('Code Sprint 2026', 'Inter-college 6-hour coding contest.', dt.date(2026, 12, 10), 60), ('Business Plan Challenge', 'Pitch your startup idea to a jury.', dt.date(2026, 12, 18), 40),
         ('Quiz Bowl', 'General and current affairs quiz.', dt.date(2026, 11, 28), 50), ('Debate Championship', 'Parliamentary debate format.', dt.date(2026, 10, 15), 32),
         ('Annual Sports Meet', 'Track and field events.', dt.date(2027, 1, 22), 200), ('Tech Poster Presentation', 'Present research posters.', dt.date(2026, 9, 25), 40),
         ('Stock Market Simulation', 'Virtual trading competition.', dt.date(2026, 11, 5), 60), ('Cultural Fest — Spandan', 'Dance, music and drama.', dt.date(2027, 2, 5), 300),
         ('Hackathon — Smart Campus', '24-hour build challenge.', dt.date(2027, 1, 9), 80), ('Essay Writing', 'Theme: Technology for Bharat.', dt.date(2026, 8, 29), 100)]
CP = []
for i, (t, d, ed, cap) in enumerate(COMPS):
    cid = U('comp', i); CP.append((cid, ed))
    add('competitions', id=cid, college_id=KD, title=t, description=d, event_date=ed.isoformat(), capacity=cap, created_at=ts(min(ed - dt.timedelta(days=30), dt.date(2026, 11, 12))))
seen = set()
for i in range(110):
    s = random.choice(STU); c, ed = random.choice(CP)
    if (c, s['id']) in seen: continue
    seen.add((c, s['id']))
    add('competition_registrations', id=U('cr', c, s['id']), competition_id=c, student_id=s['id'],
        status=('participated' if random.random() < 0.85 else 'absent') if ed < TODAY else 'registered', created_at=ts(min(ed - dt.timedelta(days=random.randint(3, 20)), dt.date(2026, 11, 19))))
ACTS = [('Sports', 'Inter-college athletics'), ('Cultural', 'Spandan cultural fest'), ('NSS', 'Tree plantation drive'), ('Technical', 'Tech poster presentation'),
        ('Literary', 'Debate championship'), ('Social', 'Blood donation camp'), ('Technical', 'Code Sprint qualifier')]
for i in range(130):
    s = random.choice(STU); ty, ti_ = random.choice(ACTS)
    add('activity_marks', id=U('am', i), college_id=KD, student_id=s['id'], academic_year_id=CUR if random.random() < 0.7 else PREV, activity_type=ty, title=ti_,
        marks=random.choice([5, 6, 8, 10]), max_marks=10, certificate_url=None, approved_by=STAFF['activity'], created_at=ts(rdate(dt.date(2025, 9, 1), dt.date(2026, 11, 15))))
cn = 0
for s in random.sample(STU, 60):
    cn += 1; ty = random.choice(['Bonafide', 'Bonafide', 'Transcript', 'Transfer']) if s['yn'] < 3 else random.choice(['Bonafide', 'Transcript'])
    add('certificates', id=U('cert', s['roll_number']), college_id=KD, student_id=s['id'], type=ty, certificate_number=f"ATSS/{ty[:3].upper()}/2026/{cn:04d}",
        issued_on=rdate(dt.date(2026, 7, 1), dt.date(2026, 11, 18)).isoformat(), file_url=None, created_at=ts(dt.date(2026, 7, 1)))

# ------------------------------------------------------------------ announcements, feedback, audit
ANN = [('Welcome to academic year 2026-27', 'Classes for all programmes commence on 15 June 2026. Collect your ID cards from the office.', None, None, None, dt.date(2026, 6, 12)),
       ('Mid-semester test timetable published', 'Mid-semester tests will be held from 21 September. Check the Exams page for subject-wise dates.', ['student', 'parent'], None, None, dt.date(2026, 9, 10)),
       ('Semester end examination schedule', 'University semester end examinations begin on 7 December 2026. Hall tickets will be issued from the examination section.', ['student', 'parent'], None, None, dt.date(2026, 11, 3)),
       ('Examination fee due 30 November', 'Pay the examination fee of ₹2,500 before 30 November to avoid a late fee.', ['student', 'parent'], None, None, dt.date(2026, 11, 5)),
       ('Diwali vacation', 'The college will remain closed from 9 to 11 November 2026 for Diwali.', None, None, None, dt.date(2026, 11, 1)),
       ('Faculty meeting on IQAC documentation', 'All teaching staff to attend the IQAC meeting on Saturday at 11:00 in the seminar hall.', ['hod', 'class_teacher', 'subject_teacher'], None, None, dt.date(2026, 11, 12)),
       ('Campus drive — Crestline Bank', 'Final-year B.Com students: register with the TPO by 18 November.', ['student'], 'BCOM', 3, dt.date(2026, 11, 13)),
       ('Coding Club hackathon registrations open', 'Hackathon — Smart Campus on 9 January. Register on the Competitions page.', ['student'], None, None, dt.date(2026, 11, 15)),
       ('Parent–teacher meeting', 'PTM for all FY classes on Saturday 28 November, 10:00–13:00.', ['parent'], None, None, dt.date(2026, 11, 16)),
       ('Attendance below 75%', 'Students with attendance below 75% will not be eligible to appear for the semester end examination.', ['student', 'parent'], None, None, dt.date(2026, 11, 17)),
       ('Java lab: extra practical session', 'BCA - SY extra practical session on Thursday 14:00 in the computer lab.', ['student'], 'BCA', 2, dt.date(2026, 11, 18)),
       ('M.Sc CS project synopsis submission', 'M.Sc CS - SY students must submit their dissertation synopsis by 25 November.', ['student'], 'MSCCS', 2, dt.date(2026, 11, 18)),
       ('Library: return overdue books', 'Return overdue books by 25 November. Fines apply at ₹2 per day.', ['student', 'class_teacher', 'subject_teacher'], None, None, dt.date(2026, 11, 19)),
       ('Scholarship forms (MahaDBT)', 'Eligible students must submit MahaDBT scholarship forms before 30 November.', ['student', 'parent'], None, None, dt.date(2026, 10, 20)),
       ('Annual sports meet trials', 'Trials for the annual sports meet start 1 December on the college ground.', ['student'], None, None, dt.date(2026, 11, 19)),
       ('Fee receipts available online', 'Payment receipts are now available on the Fees page of the student and parent portals.', ['student', 'parent'], None, None, dt.date(2026, 10, 2)),
       ('NAAC peer team visit preparation', 'All departments to update records in the LMS by 30 November.', ['hod', 'principal', 'sub_admin'], None, None, dt.date(2026, 11, 10)),
       ('BBA - TY project guidelines', 'Final project guidelines are available from your class teacher.', ['student'], 'BBA', 3, dt.date(2026, 10, 28)),
       ('Guest lecture: careers in data analytics', 'Guest lecture for B.Sc CS - TY on 24 November in the seminar hall.', ['student'], 'BSCCS', 3, dt.date(2026, 11, 17)),
       ('Admission queries for 2027-28', 'Admission enquiries for 2027-28 can be registered with the admission office.', ['admission_admin'], None, None, dt.date(2026, 11, 8))]
for i, (t, b, roles, code, yn, d) in enumerate(ANN):
    add('announcements', id=U('ann', i), college_id=KD, title=t, body=b, target_roles=PGArr(roles, 'text') if roles else None, created_by=STAFF['principal'] if i % 3 == 0 else STAFF['admin'],
        program_id=PROG[code]['id'] if code else None, class_id=CLASS[(code, yn, '2026-27')] if code else None, semester_id=None, subject_id=None,
        target_student_ids=PGArr([], 'uuid'), target_department_id=None, created_at=ts(d, 9 + i % 8, (i * 7) % 60))
# feedback forms: one teaching-feedback form per current class (+ one subject form for a few classes), answered by most students
FBQ = ['The teacher explains concepts clearly','Lectures start and end on time','Syllabus is covered as planned','Doubts are answered patiently','Study material and references are useful','Assignments and tests are evaluated fairly']
FB_CMTS = ['Concepts are explained with good examples.','More practical sessions would help.','Lectures are interactive and engaging.','The pace is a little fast in some units.',
           'Notes and references are very helpful.','Please share previous year question papers.','Doubt-solving sessions are useful.','Lab time could be increased.',
           'Very well organised course.','Assignments helped me revise the units.','Would like more case studies.','Classes are punctual and well planned.']
fcount = 0
for (code, yn) in CURCLS:
    cid = CLASS[(code, yn, '2026-27')]; sem = SEM[(code, cur_sem(yn))]; ct = CT[(code, yn)]
    forms = [('Mid-semester teaching feedback', None, None, FBQ)]
    if yn == 2: forms.append((f"Subject feedback — {SUBINFO[SUB[(code, cur_sem(yn))][0]]['name']}", SUB[(code, cur_sem(yn))][0], ALLOC[(code, yn, SUB[(code, cur_sem(yn))][0])], FBQ[:4]))
    for k, (title, sj, tch, qs) in enumerate(forms):
        fid = U('fbform', code, yn, k); fcount += 1
        add('feedback_forms', id=fid, college_id=KD, title=title, description='Rate each statement from 1 (poor) to 5 (excellent). Responses are anonymous.',
            department_id=DEPT[PROG[code]['dept']]['id'], program_id=PROG[code]['id'], class_id=cid, semester_id=sem, subject_id=sj, teacher_id=tch,
            questions=[{"id": f"q{n+1}", "text": q, "type": "rating"} for n, q in enumerate(qs)], open_on='2026-10-26', close_on='2026-11-30',
            status='open', anonymous=True, created_by=ct, created_at=ts(dt.date(2026, 10, 26), 10, k))
        cm = FB_CMTS[:]; random.shuffle(cm)
        for n, st in enumerate(by_class[(code, yn)]):
            if random.random() > 0.72: continue
            base = ability[st['id']] * 4 + 1.6
            add('feedback_responses', id=U('fbresp', fid, st['id']), college_id=KD, form_id=fid, student_id=st['id'],
                answers={f"q{m+1}": max(1, min(5, round(base + random.uniform(-1.1, 0.9)))) for m in range(len(qs))},
                comments=cm.pop() if cm and random.random() < 0.45 else None, created_at=ts(rdate(dt.date(2026, 10, 27), dt.date(2026, 11, 19)), random.randint(9, 18)))

for i, (act, ent) in enumerate([('college.create', 'colleges'), ('academic_year.activate', 'academic_years'), ('results.publish', 'academic_progression'), ('fees.structure.create', 'fee_structures')]):
    add('audit_logs', id=U('audit', i), college_id=KD, user_id=[STAFF['admin'], STAFF['admin'], EXAMA, ACC][i], action=act, entity_type=ent, entity_id=None,
        old_data=None, new_data={"source": "seed"}, ip_address=None, created_at=ts(dt.date(2026, 6, 1 + i)))

# ================================================================== documents for every file column + full coverage
DOCS = []          # (relative path under assets/docs, kind, payload)
def durl(rel): return '../assets/docs/' + rel
KDSTU = [r for r in ROWS['students'] if r['college_id'] == KD]
STU_BY_ID = {r['id']: r for r in ROWS['students']}
CLASS_NAME = {r['id']: r['name'] for r in ROWS['classes']}
PROF = {r['id']: r['full_name'] for r in ROWS['profiles']}
for r in ROWS['subjects']:
    if r['college_id'] != KD: continue
    r['syllabus_url'] = durl(f"syllabus/{r['code']}.pdf"); DOCS.append((f"syllabus/{r['code']}.pdf", 'syllabus', r))
SUBROW = {r['id']: r for r in ROWS['subjects']}
for r in ROWS['study_materials']:
    sj = SUBROW[r['subject_id']]; rel = f"notes/{sj['code']}-unit-notes.pdf"
    r['title'] = f"{sj['name']} — unit notes (Units I–IV)"; r['file_url'] = durl(rel); DOCS.append((rel, 'notes', dict(subject=sj, cls=CLASS_NAME[r['class_id']], by=PROF.get(r['uploaded_by'], ''))))
ASG = {}
for r in ROWS['assignments']:
    rel = f"assignments/{r['id'][:8]}.pdf"; r['attachment_url'] = durl(rel); ASG[r['id']] = r
    DOCS.append((rel, 'assignment', dict(a=r, subject=SUBROW[r['subject_id']], cls=CLASS_NAME[r['class_id']], by=PROF.get(r['teacher_id'], ''))))
for r in ROWS['assignment_submissions']:
    rel = f"submissions/{r['id'][:8]}.pdf"; r['file_urls'] = PGArr([durl(rel)], 'text')
    DOCS.append((rel, 'submission', dict(sub=r, a=ASG[r['assignment_id']], st=STU_BY_ID[r['student_id']], subject=SUBROW[ASG[r['assignment_id']]['subject_id']])))
# every student: photo + admission form; application document list
APP = {r['id']: r for r in ROWS['admission_applications']}
for r in ROWS['students']:
    code = r['roll_number'] if r['college_id'] == KD else 'SIMS-' + r['roll_number']
    r['photo_url'] = durl(f"photos/{code}.svg"); DOCS.append((f"photos/{code}.svg", 'photo', r))
    a = APP.get(r['application_id'])
    if a:
        a['photo_url'] = r['photo_url']; rel = f"admissions/{code}-application.pdf"; a['document_url'] = durl(rel)
        a['documents'] = [{"name": "Application form", "url": durl(rel)}, {"name": "Photograph", "url": r['photo_url']}]
        DOCS.append((rel, 'application', dict(a=a, st=r)))
for i, a in enumerate(ROWS['admission_applications']):
    if a['document_url'] is None and a['status'] != 'rejected':
        rel = f"admissions/new-{i:03d}-application.pdf"; a['document_url'] = durl(rel)
        a['documents'] = [{"name": "Application form", "url": durl(rel)}]; DOCS.append((rel, 'application', dict(a=a, st=None)))
# every student has at least one certificate and one activity-mark entry
have_cert = {r['student_id'] for r in ROWS['certificates']}
cn = len(ROWS['certificates'])
for st in KDSTU:
    if st['id'] in have_cert: continue
    cn += 1
    add('certificates', id=U('cert2', st['roll_number']), college_id=KD, student_id=st['id'], type='Bonafide', certificate_number=f"ATSS/BON/2026/{cn:04d}",
        issued_on=rdate(dt.date(2026, 7, 1), dt.date(2026, 11, 18)).isoformat(), file_url=None, created_at=ts(dt.date(2026, 7, 1)))
for r in ROWS['certificates']:
    rel = f"certificates/{r['certificate_number'].replace('/', '-')}.pdf"; r['file_url'] = durl(rel); DOCS.append((rel, 'certificate', dict(c=r, st=STU_BY_ID[r['student_id']])))
have_am = {r['student_id'] for r in ROWS['activity_marks']}
for k, st in enumerate(KDSTU):
    if st['id'] in have_am: continue
    ty, ti_ = ACTS[k % len(ACTS)]
    add('activity_marks', id=U('am2', st['roll_number']), college_id=KD, student_id=st['id'], academic_year_id=CUR, activity_type=ty, title=ti_,
        marks=random.choice([5, 6, 8]), max_marks=10, certificate_url=None, approved_by=STAFF['activity'], created_at=ts(rdate(dt.date(2026, 8, 1), dt.date(2026, 11, 15))))
for r in ROWS['activity_marks']:
    rel = f"activity/{r['id'][:8]}.pdf"; r['certificate_url'] = durl(rel); DOCS.append((rel, 'activity', dict(m=r, st=STU_BY_ID[r['student_id']])))
for r in ROWS['tpo_records']:
    rel = f"tpo/{r['id'][:8]}.pdf"; r['file_url'] = durl(rel); DOCS.append((rel, 'tpo', r))
# current-year result is pending for every student until December results are imported
for st in KDSTU:
    add('academic_progression', id=U('prog', st['roll_number'], '2026-27'), college_id=KD, student_id=st['id'], academic_year_id=CUR, status='PENDING',
        backlogs=[], promoted=False, approved_by=None, approved_at=None, notes='Semester end examination results awaited (December 2026).', created_at=ts(dt.date(2026, 11, 2)))
# university result workbook that the 2025-26 progression was imported from
RES_ROWS = []
for pr in ROWS['academic_progression']:
    if pr['academic_year_id'] != PREV: continue
    st = STU_BY_ID[pr['student_id']]; s_ = next(x for x in STU if x['id'] == st['id'])
    yn_prev = s_['yn'] - 1 if pr['status'] != 'FAIL' else 1
    failed = {b['subject_code'] for b in pr['backlogs']}
    for sem in (yn_prev * 2 - 1, yn_prev * 2):
        for sid in SUB[(s_['code'], sem)]:
            sc = SUBINFO[sid]['code']; fail = sc in failed
            ext = random.randint(14, 26) if fail else max(28, min(68, round(ability[st['id']] * 70 + random.uniform(-8, 8))))
            inn = random.randint(8, 14) if fail else max(12, min(30, round(ability[st['id']] * 30 + random.uniform(-4, 4))))
            RES_ROWS.append([st['roll_number'], st['full_name'], sc, SUBINFO[sid]['name'], sem, inn, ext, inn + ext, grade(inn + ext), 'F' if fail else 'P'])
for r in ROWS['result_imports']:
    if r['academic_year_id'] == PREV:
        r['file_path'] = durl('results/SPPU-result-2025-26.xlsx'); r['validation_log'] = {"rows": len(RES_ROWS), "students": sum(1 for p in ROWS['academic_progression'] if p['academic_year_id'] == PREV), "matched_roll_numbers": "all", "matched_subject_codes": "all", "errors": 0}
    else: r['file_path'] = None

# ================================================================== write SQL
ORDER = ['users', 'profiles', 'user_roles', 'academic_years', 'programs', 'semesters', 'subjects', 'classes', 'divisions',
         'subject_assignments', 'timetable', 'admission_applications', 'enquiries', 'students', 'parents', 'parent_student_links', 'promotions',
         'academic_progression', 'result_imports', 'assignments', 'assignment_submissions', 'study_materials', 'quizzes', 'quiz_attempts', 'exams', 'exam_results',
         'internal_marks', 'fee_structures', 'student_fees', 'fee_payments', 'library_books', 'library_issues', 'placements', 'tpo_records', 'clubs',
         'club_enrollments', 'competitions', 'competition_registrations', 'activity_marks', 'certificates', 'announcements', 'feedback_forms', 'feedback_responses', 'audit_logs']
assert set(ORDER) == set(ROWS), set(ROWS) ^ set(ORDER)
WIPE = ['feedback_responses', 'feedback_forms', 'assignment_submissions', 'quiz_attempts', 'exam_results', 'hall_tickets', 'attendance', 'internal_marks', 'academic_progression',
        'activity_marks', 'certificates', 'placements', 'promotions', 'fee_payments', 'student_fees', 'fee_structures', 'library_issues', 'library_books', 'club_enrollments',
        'club_memberships', 'clubs', 'competition_registrations', 'competitions', 'parent_student_links', 'parents', 'feedback', 'announcements', 'study_materials',
        'quizzes', 'assignments', 'exams', 'timetable', 'tpo_records', 'result_imports', 'subject_assignments', 'enquiries', 'students', 'admission_applications',
        'divisions', 'subjects', 'classes', 'semesters', 'programs', 'academic_years', 'audit_logs', 'otp_verifications']
counts = {t: len(ROWS[t]) for t in ORDER}
uemail = {u['id']: u['email'] for u in ROWS['users']}
head = f"""-- =====================================================================
-- College LMS — RESET + FULL DATA for ATSS College (code ATSS01)
-- Run AFTER 00_schema.sql and 01_schema_additions.sql, in the Supabase SQL editor.
--
-- !!! THIS DELETES DATA !!!  Everything is removed EXCEPT:
--     * the college ATSS01  (id {KD})  — row kept exactly as it is
--     * its departments Science (SCI) and Commerce (COMM) — kept as they are
--     * the two HOD accounts linked to those departments
--     * every Super Admin account
--   All other colleges, users, students, marks, fees … are deleted, then fresh linked data is loaded.
--   Take a backup first (Supabase → Database → Backups) if you might need the old data.
--
-- Flow of the data:  Department → Course → Class → Semester → Subject → Teacher allocation → Timetable
--                    → Students & parents → Attendance / assignments / quizzes / feedback → Exams → Marks → Results
--
-- Password for every NEW account:  {PW}   (the kept HOD and Super Admin passwords are unchanged)
--   College admin    admin@{DOM}        Principal   principal@{DOM}
--   Accounts         accounts@{DOM}     Exams       exam@{DOM}
--   Admissions       admission@{DOM}    Library     library@{DOM}
--   TPO              tpo@{DOM}          Activities  activity@{DOM}
--   Sub admin        subadmin@{DOM}
--   Class teacher    {uemail[CT[('BCA', 2)]]}   (class teacher of BCA - SY)
--   Subject teacher  {uemail[[t for t in DEPT['SCI']['teachers'] if TROLE.get(t) == 'subject_teacher'][0]]}
--   Student          roll number BCASY01  (or that student's email)
--   Parent           {uemail[U('user', 'par-BCASY01')]}  (parent of BCASY01)
--
-- Row counts: {', '.join(f'{t}={n}' for t, n in counts.items())}
-- plus attendance generated from the timetable (about 15,000 rows).
-- =====================================================================
begin;

do $$
declare c uuid := '{KD}'; keep uuid[];
begin
  if not exists (select 1 from public.colleges where id = c) then
    raise exception 'College ATSS01 (id %) was not found. Nothing was changed.', c;
  end if;
  if (select count(*) from public.departments where id in ('{DEPT['SCI']['id']}','{DEPT['COMM']['id']}') and college_id = c) < 2 then
    raise exception 'The Science / Commerce departments of ATSS01 were not found. Nothing was changed.';
  end if;
  keep := array(select r.user_id from public.user_roles r join public.users u on u.id = r.user_id where r.role = 'super_admin'
                  and (u.email <> 'superadmin@kdrtlms.in' or (select count(*) from public.user_roles where role = 'super_admin') = 1)
                union select hod_user_id from public.departments where college_id = c and hod_user_id is not null);
"""
OUT.append(head)
for t in WIPE:
    OUT.append(f"  if to_regclass('public.{t}') is not null then execute 'delete from public.{t}'; end if;")
OUT.append(f"""  delete from public.departments where college_id <> c;
  update public.departments set hod_user_id = null where college_id = c and hod_user_id is not null and not (hod_user_id = any(keep));
  delete from public.user_roles where not (user_id = any(keep) and (role = 'super_admin' or college_id = c));
  delete from public.profiles where not (id = any(keep));
  delete from public.users where not (id = any(keep));
  delete from public.colleges where id <> c;
end $$;
""")
for t in ORDER:
    if t in ('promotions', 'fee_structures'): OUT.append('@@PART')
    OUT.append(f"\n-- {t} ({len(ROWS[t])})"); emit(t, ROWS[t])
OUT.append(f"""
-- attendance: one record per student, per subject, per teaching day (generated from the timetable)
-- 19 Oct – 19 Nov 2026 (Diwali break 9–11 Nov excluded). A few students are kept
-- below 75% so the defaulter list has real entries.
insert into public.attendance (college_id, student_id, subject_id, class_id, date, status, marked_by, created_at)
select distinct on (s.id, t.subject_id, d::date) t.college_id, s.id, t.subject_id, t.class_id, d::date,
  case when h < (case when s.roll_number in ('BCASY04','BCOMFY07','BBATY02','MSCCSFY03','BSCCSSY09','BCATY06') then 58 else 87 end) then 'present'
       when h < 93 then 'absent' when h < 97 then 'late' else 'excused' end,
  t.teacher_id, d::date + t.end_time
from public.timetable t
join public.students s on s.class_id = t.class_id and s.status = 'active'
cross join generate_series('2026-10-19'::date, '2026-11-19'::date, interval '1 day') d
cross join lateral (select abs(('x' || substr(md5(s.id::text || d::text || t.id::text), 1, 8))::bit(32)::int) % 100 as h) hh
where t.college_id = '{KD}'
  and to_char(d, 'Dy') = t.day
  and d::date not between '2026-11-09' and '2026-11-11'
order by s.id, t.subject_id, d::date, t.start_time
on conflict do nothing;

commit;
notify pgrst, 'reload schema';
""")
full = '\n'.join(OUT) + '\n'
open(sys.argv[1], 'w').write(full.replace('@@PART\n', ''))
import os
pdir = os.path.join(os.path.dirname(sys.argv[1]), 'seed_parts'); os.makedirs(pdir, exist_ok=True)
parts = full.split('@@PART\n')
names = ['part1_people_and_academics.sql', 'part2_learning_exams_marks.sql', 'part3_fees_library_activities_attendance.sql']
for i, (n, body) in enumerate(zip(names, parts)):
    if i > 0: body = f"-- College LMS sample data — part {i+1} of 3. Run part {i} first.\nbegin;\n" + body
    if i < 2: body += "\ncommit;\n"
    else: body = body
    open(os.path.join(pdir, n), 'w').write(body)
print('rows:', sum(counts.values()), counts)
if len(sys.argv) > 2:
    import render_docs; render_docs.render(sys.argv[2], DOCS, RES_ROWS, dict(STU=STU, ROWS=ROWS, SUBINFO=SUBINFO, SUB=SUB, PROG=PROG, KD=KD))
