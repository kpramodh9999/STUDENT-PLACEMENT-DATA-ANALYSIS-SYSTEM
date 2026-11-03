import os
import json
import csv
import random
from datetime import date, timedelta
from database import init_db, get_session
from models import Student, Skill, Placement, StudentSkill

SAMPLE_DEPARTMENTS = [
    'Computer Science & Engineering',
    'Electronics & Communication Engineering',
    'Electrical & Electronics Engineering',
    'Mechanical Engineering',
    'Civil Engineering'
]

DEPT_SUB_BRANCHES = {
    'Computer Science & Engineering': ['AIML', 'AIDS', 'DS', 'CS', 'IT'],
    'Electronics & Communication Engineering': ['Core ECE', 'VLSI', 'Embedded', 'Telecom'],
    'Electrical & Electronics Engineering': ['Power Systems', 'Control & Automation'],
    'Mechanical Engineering': ['Design & Robotics', 'Automobile'],
    'Civil Engineering': ['Structural', 'Environmental']
}

SKILLS_POOL = [
    # Programming & Core
    'Python', 'Java', 'C++', 'TypeScript', 'Go', 'SQL', 'Data Structures & Algorithms',
    'Object-Oriented Programming', 'Linux',
    # Web & Frameworks
    'React', 'Node.js', 'Next.js', 'Spring Boot', 'FastAPI', 'Django', 'REST APIs',
    'Tailwind CSS', 'PostgreSQL', 'MongoDB', 'Redis',
    # AI / ML / Data
    'Machine Learning', 'Deep Learning', 'Computer Vision', 'Natural Language Processing',
    'Generative AI & LLMs', 'PyTorch', 'TensorFlow', 'Pandas & NumPy',
    # Cloud & DevOps
    'AWS', 'Docker', 'Kubernetes', 'Microsoft Azure', 'Git & GitHub', 'CI/CD Pipelines',
    # Electronics / Hardware
    'Embedded Systems', 'VLSI Design', 'Verilog', 'IoT', 'MATLAB', 'Digital Signal Processing',
    # Mechanical & Civil
    'AutoCAD', 'SolidWorks', 'ANSYS', 'Robotics & ROS', 'Power Systems', 'PLC & SCADA',
    'Revit', 'Structural Analysis'
]

DEPT_SKILL_AFFINITY = {
    'Computer Science & Engineering': [
        'Python', 'Java', 'C++', 'SQL', 'Data Structures & Algorithms', 'React', 'Node.js',
        'Next.js', 'Spring Boot', 'FastAPI', 'Machine Learning', 'Deep Learning',
        'Generative AI & LLMs', 'AWS', 'Docker', 'Kubernetes', 'Git & GitHub', 'PostgreSQL'
    ],
    'Electronics & Communication Engineering': [
        'C++', 'Python', 'Embedded Systems', 'VLSI Design', 'Verilog', 'IoT', 'MATLAB',
        'Digital Signal Processing', 'Linux', 'SQL', 'Data Structures & Algorithms', 'Git & GitHub'
    ],
    'Electrical & Electronics Engineering': [
        'MATLAB', 'Power Systems', 'PLC & SCADA', 'Embedded Systems', 'C++', 'Python',
        'AutoCAD', 'IoT', 'Linux', 'SQL'
    ],
    'Mechanical Engineering': [
        'AutoCAD', 'SolidWorks', 'ANSYS', 'Robotics & ROS', 'MATLAB', 'Python', 'C++', 'Linux'
    ],
    'Civil Engineering': [
        'AutoCAD', 'Revit', 'Structural Analysis', 'ANSYS', 'MATLAB', 'Python', 'SQL'
    ]
}

COMPANIES = [
    # Tier 1 - Super Dream (20+ LPA)
    {'name': 'Google', 'role': 'Software Engineer', 'min_pkg': 28.0, 'max_pkg': 44.0, 'depts': ['Computer Science & Engineering', 'Electronics & Communication Engineering']},
    {'name': 'Microsoft', 'role': 'Software Development Engineer', 'min_pkg': 26.0, 'max_pkg': 42.0, 'depts': ['Computer Science & Engineering', 'Electronics & Communication Engineering']},
    {'name': 'Amazon', 'role': 'SDE-1', 'min_pkg': 24.0, 'max_pkg': 36.0, 'depts': ['Computer Science & Engineering', 'Electronics & Communication Engineering', 'Electrical & Electronics Engineering']},
    {'name': 'Apple', 'role': 'Systems Software Engineer', 'min_pkg': 27.0, 'max_pkg': 43.0, 'depts': ['Computer Science & Engineering', 'Electronics & Communication Engineering']},
    {'name': 'Adobe', 'role': 'Member of Technical Staff', 'min_pkg': 22.0, 'max_pkg': 34.0, 'depts': ['Computer Science & Engineering', 'Electronics & Communication Engineering']},
    {'name': 'Goldman Sachs', 'role': 'Engineering & Tech Analyst', 'min_pkg': 21.0, 'max_pkg': 32.0, 'depts': ['Computer Science & Engineering', 'Electronics & Communication Engineering', 'Electrical & Electronics Engineering']},
    {'name': 'NVIDIA', 'role': 'AI & Silicon Systems Engineer', 'min_pkg': 25.0, 'max_pkg': 38.0, 'depts': ['Computer Science & Engineering', 'Electronics & Communication Engineering']},
    {'name': 'Morgan Stanley', 'role': 'Technology Associate', 'min_pkg': 19.5, 'max_pkg': 28.0, 'depts': ['Computer Science & Engineering', 'Electronics & Communication Engineering']},

    # Tier 2 - Dream Tech & Product (10 - 20 LPA)
    {'name': 'Cisco', 'role': 'Network Software Engineer', 'min_pkg': 14.0, 'max_pkg': 19.5, 'depts': ['Computer Science & Engineering', 'Electronics & Communication Engineering']},
    {'name': 'Oracle', 'role': 'Member Technical Staff', 'min_pkg': 12.5, 'max_pkg': 18.5, 'depts': ['Computer Science & Engineering', 'Electronics & Communication Engineering']},
    {'name': 'Qualcomm', 'role': 'Hardware / Embedded Engineer', 'min_pkg': 14.0, 'max_pkg': 20.0, 'depts': ['Electronics & Communication Engineering', 'Electrical & Electronics Engineering', 'Computer Science & Engineering']},
    {'name': 'Texas Instruments', 'role': 'VLSI & Analog Design Engineer', 'min_pkg': 15.0, 'max_pkg': 22.5, 'depts': ['Electronics & Communication Engineering', 'Electrical & Electronics Engineering']},
    {'name': 'Intel', 'role': 'Firmware & Silicon Validation Engineer', 'min_pkg': 13.0, 'max_pkg': 18.5, 'depts': ['Electronics & Communication Engineering', 'Computer Science & Engineering']},
    {'name': 'Salesforce', 'role': 'Associate Member Technical Staff', 'min_pkg': 16.0, 'max_pkg': 23.0, 'depts': ['Computer Science & Engineering']},
    {'name': 'Swiggy', 'role': 'Software Development Engineer', 'min_pkg': 14.0, 'max_pkg': 21.0, 'depts': ['Computer Science & Engineering']},
    {'name': 'Razorpay', 'role': 'Backend Systems Engineer', 'min_pkg': 15.0, 'max_pkg': 22.0, 'depts': ['Computer Science & Engineering']},
    {'name': 'Walmart Global Tech', 'role': 'Software Engineer', 'min_pkg': 13.5, 'max_pkg': 19.0, 'depts': ['Computer Science & Engineering', 'Electronics & Communication Engineering']},

    # Tier 3 - Core Engineering & Consulting (6 - 10 LPA)
    {'name': 'Deloitte', 'role': 'Technology Analyst', 'min_pkg': 7.6, 'max_pkg': 9.8, 'depts': None},
    {'name': 'PwC', 'role': 'Technology Consulting Associate', 'min_pkg': 7.0, 'max_pkg': 9.2, 'depts': None},
    {'name': 'Zoho Corp', 'role': 'Software Developer', 'min_pkg': 6.5, 'max_pkg': 9.5, 'depts': ['Computer Science & Engineering', 'Electronics & Communication Engineering']},
    {'name': 'L&T Infotech', 'role': 'Graduate Engineer Trainee', 'min_pkg': 6.0, 'max_pkg': 8.0, 'depts': None},
    {'name': 'Tata Motors', 'role': 'Automotive Design Engineer', 'min_pkg': 6.0, 'max_pkg': 8.5, 'depts': ['Mechanical Engineering', 'Electrical & Electronics Engineering']},
    {'name': 'Bosch', 'role': 'Automotive Embedded Systems Engineer', 'min_pkg': 6.5, 'max_pkg': 9.2, 'depts': ['Electronics & Communication Engineering', 'Electrical & Electronics Engineering', 'Mechanical Engineering']},
    {'name': 'Siemens', 'role': 'Digital Industries Engineer', 'min_pkg': 6.2, 'max_pkg': 8.8, 'depts': ['Electrical & Electronics Engineering', 'Mechanical Engineering']},
    {'name': 'Schneider Electric', 'role': 'Power Automation Engineer', 'min_pkg': 6.0, 'max_pkg': 8.2, 'depts': ['Electrical & Electronics Engineering']},
    {'name': 'Maruti Suzuki', 'role': 'Graduate Engineer Trainee', 'min_pkg': 6.5, 'max_pkg': 8.6, 'depts': ['Mechanical Engineering', 'Electrical & Electronics Engineering']},
    {'name': 'L&T Construction', 'role': 'Civil Infrastructure Project Engineer', 'min_pkg': 5.8, 'max_pkg': 7.8, 'depts': ['Civil Engineering']},

    # Mass & IT Services (3.5 - 7.5 LPA)
    {'name': 'TCS', 'role': 'System Engineer (Ninja/Digital/Prime)', 'min_pkg': 3.6, 'max_pkg': 7.5, 'depts': None},
    {'name': 'Infosys', 'role': 'Systems Associate / Specialist', 'min_pkg': 3.6, 'max_pkg': 7.0, 'depts': None},
    {'name': 'Wipro', 'role': 'Project Engineer', 'min_pkg': 3.5, 'max_pkg': 6.5, 'depts': None},
    {'name': 'Accenture', 'role': 'Associate Software Engineer', 'min_pkg': 4.5, 'max_pkg': 6.8, 'depts': None},
    {'name': 'Cognizant', 'role': 'Programmer Analyst', 'min_pkg': 4.2, 'max_pkg': 6.2, 'depts': None},
    {'name': 'Capgemini', 'role': 'Senior Analyst', 'min_pkg': 4.0, 'max_pkg': 6.5, 'depts': None}
]

FIRST_NAMES = [
    'Aarav', 'Aditi', 'Ananya', 'Arjun', 'Bhavya', 'Chetan', 'Dev', 'Diya',
    'Gaurav', 'Isha', 'Kavya', 'Karan', 'Manish', 'Neha', 'Nikhil', 'Pooja',
    'Pranav', 'Rahul', 'Riya', 'Rohan', 'Sakshi', 'Sameer', 'Shreya', 'Siddharth',
    'Sneha', 'Tanvi', 'Varun', 'Vidya', 'Vikram', 'Yash', 'Meera', 'Rishi',
    'Suresh', 'Deepika', 'Kunal', 'Harsh', 'Preeti', 'Sunil', 'Swati', 'Akash',
    'Anil', 'Priya', 'Tarun', 'Anjali', 'Vivek', 'Nandini', 'Rajesh', 'Sanjana',
    'Amit', 'Divya', 'Karthik', 'Niharika', 'Mohit', 'Rakesh', 'Sanya', 'Aditya',
    'Shalini', 'Abhinav', 'Priyanka', 'Tushar', 'Alok', 'Ritika', 'Ayush', 'Sarthak',
    'Simran', 'Harshit', 'Pallavi', 'Shivam', 'Ishita', 'Akshay', 'Komal', 'Varsha'
]

LAST_NAMES = [
    'Sharma', 'Verma', 'Patel', 'Reddy', 'Iyer', 'Nair', 'Deshmukh', 'Gupta',
    'Singh', 'Chopra', 'Rao', 'Bose', 'Kumar', 'Mehta', 'Joshi', 'Kulkarni',
    'Pandey', 'Mishra', 'Bhat', 'Menon', 'Chatterjee', 'Agarwal', 'Pillai', 'Saxena',
    'Das', 'Choudhury', 'Nambiar', 'Mukherjee', 'Sen', 'Banerjee', 'Trivedi', 'Kapoor',
    'Malhotra', 'Varma', 'Ghosh', 'Dutta', 'Thakur', 'Bhardwaj', 'Narayanan'
]

def clear_data(session):
    """Deletes all records from student_skills, placements, students, and skills."""
    session.query(Placement).delete()
    session.query(StudentSkill).delete()
    session.query(Student).delete()
    session.query(Skill).delete()
    session.commit()
    print("All existing records cleared.")

def seed_sample_data(session, target_student_count=275):
    """
    Generates rich, high-quality fictional sample data for college placement analysis
    across graduation years 2018 to 2026 and 5 engineering departments.
    """
    random.seed(42)  # Deterministic seed for reproducible baseline
    
    # 1. Create Skills
    skill_objs = {}
    for s_name in SKILLS_POOL:
        skill = session.query(Skill).filter(Skill.skill_name == s_name).first()
        if not skill:
            skill = Skill(skill_name=s_name)
            session.add(skill)
        skill_objs[s_name] = skill
    session.flush()

    dept_short = {
        'Computer Science & Engineering': 'CS',
        'Electronics & Communication Engineering': 'EC',
        'Electrical & Electronics Engineering': 'EE',
        'Mechanical Engineering': 'ME',
        'Civil Engineering': 'CE'
    }

    # Department student distribution across all 9 years (2018-2026)
    dept_distribution = {
        'Computer Science & Engineering': 110,
        'Electronics & Communication Engineering': 68,
        'Electrical & Electronics Engineering': 36,
        'Mechanical Engineering': 36,
        'Civil Engineering': 25
    }

    batches = list(range(2018, 2027))  # 2018 to 2026 inclusive
    students = []
    
    # Track roll sequences per year and department
    dept_year_counter = {}

    for dept, total_count in dept_distribution.items():
        prefix = dept_short[dept]
        sub_branches = DEPT_SUB_BRANCHES.get(dept, ['Core'])
        
        # Distribute students evenly across batches 2018-2026
        students_per_batch = total_count // len(batches)
        extra = total_count % len(batches)

        student_idx_in_dept = 0
        for b_idx, grad_year in enumerate(batches):
            count_for_year = students_per_batch + (1 if b_idx < extra else 0)
            
            for _ in range(count_for_year):
                student_idx_in_dept += 1
                counter_key = (grad_year, prefix)
                dept_year_counter[counter_key] = dept_year_counter.get(counter_key, 0) + 1
                seq = dept_year_counter[counter_key]

                sub_branch = sub_branches[(student_idx_in_dept - 1) % len(sub_branches)]
                roll = f"{grad_year}{prefix}{seq:03d}"
                name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"

                # ~88% eligibility rate
                eligible = random.random() < 0.88

                student = Student(
                    roll_no=roll,
                    student_name=name,
                    department=dept,
                    sub_branch=sub_branch,
                    graduation_year=grad_year,
                    eligible=eligible
                )
                session.add(student)
                session.flush()

                # Assign 3 to 6 relevant skills
                affinity = DEPT_SKILL_AFFINITY.get(dept, SKILLS_POOL[:8])
                k_skills = min(len(affinity), random.randint(3, 5))
                chosen = set(random.sample(affinity, k=k_skills))
                
                # Cross-disciplinary skill probability
                if random.random() < 0.35:
                    chosen.add(random.choice(SKILLS_POOL))

                for s_name in chosen:
                    if s_name in skill_objs:
                        student.skills.append(skill_objs[s_name])

                students.append(student)

    session.flush()

    # 3. Create Placements
    # Realistic placement rates for eligible candidates
    dept_placement_prob = {
        'Computer Science & Engineering': 0.88,
        'Electronics & Communication Engineering': 0.80,
        'Electrical & Electronics Engineering': 0.68,
        'Mechanical Engineering': 0.62,
        'Civil Engineering': 0.52
    }

    total_offers = 0
    placed_student_count = 0

    for s in students:
        prob = dept_placement_prob.get(s.department, 0.65)
        if not s.eligible:
            # Low chance for ineligible students (e.g. cleared backlog in late drive)
            prob *= 0.12

        if random.random() < prob:
            placed_student_count += 1
            # Number of offers: 1 offer (72%), 2 offers (22%), 3 offers (6%)
            offer_roll = random.random()
            if offer_roll > 0.94:
                num_offers = 3
            elif offer_roll > 0.72:
                num_offers = 2
            else:
                num_offers = 1

            # Filter companies suitable for this department
            suitable_comps = [
                c for c in COMPANIES
                if c['depts'] is None or s.department in c['depts']
            ]
            if not suitable_comps:
                suitable_comps = COMPANIES

            used_companies = set()
            for _ in range(num_offers):
                avail_comps = [c for c in suitable_comps if c['name'] not in used_companies]
                if not avail_comps:
                    avail_comps = suitable_comps
                
                comp = random.choice(avail_comps)
                used_companies.add(comp['name'])

                pkg = round(random.uniform(comp['min_pkg'], comp['max_pkg']), 2)

                # Placement drive occurs between Aug (year - 1) and Apr (year)
                base_year = s.graduation_year - 1
                base_date = date(base_year, 8, 1) + timedelta(days=random.randint(0, 240))

                statuses = ['Placed', 'Placed', 'Offer Accepted', 'Offer Extended', 'Joining Confirmed']
                status = random.choice(statuses)

                placement = Placement(
                    student_id=s.student_id,
                    company=comp['name'],
                    role=comp['role'],
                    package_lpa=pkg,
                    placement_date=base_date,
                    status=status
                )
                session.add(placement)
                total_offers += 1

    session.commit()
    print(f"Sample data successfully generated: {len(students)} students, {total_offers} placement offers across batches 2018-2026 and {len(SKILLS_POOL)} skills.")
    return len(students), total_offers

def append_sample_data(session, count=40):
    """
    Appends new diverse fictional student records and realistic placement offers
    without deleting existing records, allowing users to see graphs dynamically update.
    """
    # 1. Ensure skills exist
    skill_objs = {}
    for s_name in SKILLS_POOL:
        skill = session.query(Skill).filter(Skill.skill_name == s_name).first()
        if not skill:
            skill = Skill(skill_name=s_name)
            session.add(skill)
        skill_objs[s_name] = skill
    session.flush()

    dept_short = {
        'Computer Science & Engineering': 'CS',
        'Electronics & Communication Engineering': 'EC',
        'Electrical & Electronics Engineering': 'EE',
        'Mechanical Engineering': 'ME',
        'Civil Engineering': 'CE'
    }

    # Query existing rolls to avoid collision
    existing_rolls = {r[0] for r in session.query(Student.roll_no).all()}

    # Recent years (2025, 2026) are ideal for observing dynamic updates in charts
    candidate_years = [2025, 2026]
    
    new_students = []
    dept_placement_prob = {
        'Computer Science & Engineering': 0.88,
        'Electronics & Communication Engineering': 0.80,
        'Electrical & Electronics Engineering': 0.68,
        'Mechanical Engineering': 0.62,
        'Civil Engineering': 0.52
    }

    for _ in range(count):
        dept = random.choice(SAMPLE_DEPARTMENTS)
        prefix = dept_short[dept]
        grad_year = random.choice(candidate_years)
        sub_branches = DEPT_SUB_BRANCHES.get(dept, ['Core'])
        sub_branch = random.choice(sub_branches)
        
        # Determine unique roll_no
        seq = 1
        while f"{grad_year}{prefix}{seq:03d}" in existing_rolls:
            seq += 1
        roll = f"{grad_year}{prefix}{seq:03d}"
        existing_rolls.add(roll)

        name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
        eligible = random.random() < 0.88

        student = Student(
            roll_no=roll,
            student_name=name,
            department=dept,
            sub_branch=sub_branch,
            graduation_year=grad_year,
            eligible=eligible
        )
        session.add(student)
        session.flush()

        # Add skills
        affinity = DEPT_SKILL_AFFINITY.get(dept, SKILLS_POOL[:8])
        k_skills = min(len(affinity), random.randint(3, 5))
        chosen = set(random.sample(affinity, k=k_skills))
        if random.random() < 0.4:
            chosen.add(random.choice(SKILLS_POOL))

        for s_name in chosen:
            if s_name in skill_objs:
                student.skills.append(skill_objs[s_name])

        new_students.append(student)

    session.flush()

    total_new_offers = 0
    for s in new_students:
        prob = dept_placement_prob.get(s.department, 0.65)
        if not s.eligible:
            prob *= 0.12

        if random.random() < prob:
            offer_roll = random.random()
            if offer_roll > 0.94:
                num_offers = 3
            elif offer_roll > 0.72:
                num_offers = 2
            else:
                num_offers = 1

            suitable_comps = [
                c for c in COMPANIES
                if c['depts'] is None or s.department in c['depts']
            ]
            if not suitable_comps:
                suitable_comps = COMPANIES

            used_companies = set()
            for _ in range(num_offers):
                avail_comps = [c for c in suitable_comps if c['name'] not in used_companies]
                if not avail_comps:
                    avail_comps = suitable_comps
                comp = random.choice(avail_comps)
                used_companies.add(comp['name'])

                pkg = round(random.uniform(comp['min_pkg'], comp['max_pkg']), 2)
                base_year = s.graduation_year - 1
                base_date = date(base_year, 8, 1) + timedelta(days=random.randint(0, 240))
                status = random.choice(['Placed', 'Placed', 'Offer Accepted', 'Offer Extended', 'Joining Confirmed'])

                placement = Placement(
                    student_id=s.student_id,
                    company=comp['name'],
                    role=comp['role'],
                    package_lpa=pkg,
                    placement_date=base_date,
                    status=status
                )
                session.add(placement)
                total_new_offers += 1

    session.commit()
    print(f"Appended {len(new_students)} new students and {total_new_offers} placement offers.")
    return len(new_students), total_new_offers

def export_data_to_files(session, export_dir='../data'):
    """
    Exports the current database content into clean CSV and JSON files
    for easy offline viewing, presentation, and data interchange.
    """
    abs_export_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), export_dir))
    os.makedirs(abs_export_dir, exist_ok=True)

    # 1. Export Students CSV
    students = session.query(Student).order_by(Student.roll_no.asc()).all()
    students_csv_path = os.path.join(abs_export_dir, 'sample_students.csv')
    with open(students_csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['student_id', 'roll_no', 'student_name', 'department', 'sub_branch', 'graduation_year', 'eligible', 'skills', 'placement_offers'])
        for s in students:
            skills_str = '; '.join([sk.skill_name for sk in s.skills])
            writer.writerow([
                s.student_id,
                s.roll_no,
                s.student_name,
                s.department,
                s.sub_branch or '',
                s.graduation_year,
                'Yes' if s.eligible else 'No',
                skills_str,
                len(s.placements)
            ])

    # 2. Export Placements CSV
    placements = session.query(Placement).join(Student).order_by(Placement.placement_date.desc(), Placement.placement_id.desc()).all()
    placements_csv_path = os.path.join(abs_export_dir, 'sample_placements.csv')
    with open(placements_csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['placement_id', 'roll_no', 'student_name', 'department', 'sub_branch', 'graduation_year', 'company', 'role', 'package_lpa', 'placement_date', 'status'])
        for p in placements:
            writer.writerow([
                p.placement_id,
                p.student.roll_no if p.student else '',
                p.student.student_name if p.student else '',
                p.student.department if p.student else '',
                p.student.sub_branch or '' if p.student else '',
                p.student.graduation_year if p.student else '',
                p.company,
                p.role,
                p.package_lpa,
                p.placement_date.strftime('%Y-%m-%d') if p.placement_date else '',
                p.status
            ])

    # 3. Export Comprehensive Dataset JSON
    json_path = os.path.join(abs_export_dir, 'sample_dataset.json')
    data_dump = {
        'metadata': {
            'system': 'Student Placement Data Analysis System',
            'total_students': len(students),
            'total_placement_offers': len(placements),
            'batches_covered': '2018-2026',
            'departments': SAMPLE_DEPARTMENTS,
            'skills_count': len(SKILLS_POOL)
        },
        'students': [s.to_dict(include_placements=True) for s in students],
        'placements': [p.to_dict(include_student=True) for p in placements]
    }
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data_dump, f, indent=2, default=str)

    print(f"Sample data successfully exported to:")
    print(f"  - {students_csv_path}")
    print(f"  - {placements_csv_path}")
    print(f"  - {json_path}")

if __name__ == '__main__':
    init_db()
    sess = next(get_session())
    clear_data(sess)
    s_cnt, p_cnt = seed_sample_data(sess, target_student_count=275)
    export_data_to_files(sess)
    sess.close()
