from flask import Blueprint, request, jsonify
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_
from database import get_session
from models import Student, Skill, StudentSkill

students_bp = Blueprint('students', __name__, url_prefix='/api/students')

@students_bp.route('', methods=['GET'])
def get_students():
    session = next(get_session())
    try:
        search = request.args.get('search', '').strip()
        department = request.args.get('department', '').strip()
        sub_branch = request.args.get('sub_branch', '').strip()
        grad_year = request.args.get('graduation_year', '').strip()
        eligible_str = request.args.get('eligible', '').strip()
        page = max(1, int(request.args.get('page', 1)))
        limit = max(1, min(100, int(request.args.get('limit', 10))))

        query = session.query(Student)

        # Filters
        if search:
            query = query.filter(
                or_(
                    Student.roll_no.ilike(f"%{search}%"),
                    Student.student_name.ilike(f"%{search}%")
                )
            )
        if department:
            query = query.filter(Student.department == department)
        if sub_branch:
            query = query.filter(Student.sub_branch == sub_branch)
        if grad_year:
            try:
                query = query.filter(Student.graduation_year == int(grad_year))
            except ValueError:
                pass
        if eligible_str in ['true', 'false']:
            query = query.filter(Student.eligible == (eligible_str == 'true'))

        total_count = query.count()
        offset = (page - 1) * limit
        students = query.order_by(Student.roll_no.asc()).offset(offset).limit(limit).all()

        return jsonify({
            'students': [s.to_dict() for s in students],
            'total_count': total_count,
            'page': page,
            'limit': limit,
            'total_pages': (total_count + limit - 1) // limit if limit > 0 else 1
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@students_bp.route('/<int:student_id>', methods=['GET'])
def get_student(student_id):
    session = next(get_session())
    try:
        student = session.query(Student).filter(Student.student_id == student_id).first()
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        return jsonify({'student': student.to_dict()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@students_bp.route('', methods=['POST'])
def create_student():
    data = request.get_json() or {}
    roll_no = str(data.get('roll_no', '')).strip().upper()
    student_name = str(data.get('student_name', '')).strip()
    department = str(data.get('department', '')).strip()
    sub_branch = str(data.get('sub_branch', '')).strip() or None
    graduation_year = data.get('graduation_year')
    eligible = bool(data.get('eligible', True))
    skill_names = data.get('skills', [])

    # Validations
    if not roll_no:
        return jsonify({'error': 'Roll number is required'}), 400
    if not student_name:
        return jsonify({'error': 'Student name is required'}), 400
    if not department:
        return jsonify({'error': 'Department is required'}), 400
    if not graduation_year:
        return jsonify({'error': 'Graduation year is required'}), 400
    try:
        graduation_year = int(graduation_year)
        if graduation_year < 2000 or graduation_year > 2050:
            return jsonify({'error': 'Please provide a valid graduation year'}), 400
    except ValueError:
        return jsonify({'error': 'Graduation year must be a valid number'}), 400

    session = next(get_session())
    try:
        # Check uniqueness of roll_no
        existing = session.query(Student).filter(Student.roll_no == roll_no).first()
        if existing:
            return jsonify({'error': f"Student with Roll Number '{roll_no}' already exists"}), 409

        new_student = Student(
            roll_no=roll_no,
            student_name=student_name,
            department=department,
            sub_branch=sub_branch,
            graduation_year=graduation_year,
            eligible=eligible
        )
        session.add(new_student)
        session.flush()

        # Handle skills
        if isinstance(skill_names, list):
            for sname in skill_names:
                clean_name = str(sname).strip()
                if not clean_name:
                    continue
                skill = session.query(Skill).filter(Skill.skill_name.ilike(clean_name)).first()
                if not skill:
                    skill = Skill(skill_name=clean_name)
                    session.add(skill)
                    session.flush()
                new_student.skills.append(skill)

        session.commit()
        return jsonify({
            'message': 'Student created successfully',
            'student': new_student.to_dict()
        }), 201
    except IntegrityError as e:
        session.rollback()
        return jsonify({'error': 'Database integrity error. Check unique roll number.'}), 400
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@students_bp.route('/<int:student_id>', methods=['PUT'])
def update_student(student_id):
    data = request.get_json() or {}
    session = next(get_session())
    try:
        student = session.query(Student).filter(Student.student_id == student_id).first()
        if not student:
            return jsonify({'error': 'Student not found'}), 404

        roll_no = str(data.get('roll_no', student.roll_no)).strip().upper()
        student_name = str(data.get('student_name', student.student_name)).strip()
        department = str(data.get('department', student.department)).strip()
        sub_branch = str(data.get('sub_branch', student.sub_branch or '')).strip() or None
        grad_year_val = data.get('graduation_year', student.graduation_year)
        eligible = bool(data.get('eligible', student.eligible))

        if not roll_no:
            return jsonify({'error': 'Roll number cannot be empty'}), 400
        if not student_name:
            return jsonify({'error': 'Student name cannot be empty'}), 400
        if not department:
            return jsonify({'error': 'Department cannot be empty'}), 400

        try:
            grad_year = int(grad_year_val)
        except ValueError:
            return jsonify({'error': 'Invalid graduation year'}), 400

        # Check unique roll_no if changed
        if roll_no != student.roll_no:
            existing = session.query(Student).filter(Student.roll_no == roll_no).first()
            if existing:
                return jsonify({'error': f"Another student with Roll Number '{roll_no}' already exists"}), 409

        student.roll_no = roll_no
        student.student_name = student_name
        student.department = department
        student.sub_branch = sub_branch
        student.graduation_year = grad_year
        student.eligible = eligible

        # Update skills if provided
        if 'skills' in data and isinstance(data['skills'], list):
            student.skills.clear()
            for sname in data['skills']:
                clean_name = str(sname).strip()
                if not clean_name:
                    continue
                skill = session.query(Skill).filter(Skill.skill_name.ilike(clean_name)).first()
                if not skill:
                    skill = Skill(skill_name=clean_name)
                    session.add(skill)
                    session.flush()
                student.skills.append(skill)

        session.commit()
        return jsonify({
            'message': 'Student updated successfully',
            'student': student.to_dict()
        }), 200
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@students_bp.route('/<int:student_id>', methods=['DELETE'])
def delete_student(student_id):
    session = next(get_session())
    try:
        student = session.query(Student).filter(Student.student_id == student_id).first()
        if not student:
            return jsonify({'error': 'Student not found'}), 404

        roll_no = student.roll_no
        name = student.student_name
        session.delete(student)
        session.commit()
        return jsonify({'message': f"Student {name} ({roll_no}) deleted successfully"}), 200
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@students_bp.route('/meta/options', methods=['GET'])
def get_filter_options():
    """Provides unique departments, graduation years (2018-2026), and available skills for UI dropdowns."""
    session = next(get_session())
    try:
        departments = [d[0] for d in session.query(Student.department).distinct().order_by(Student.department.asc()).all() if d[0]]
        # Always guarantee all years from 2018 through 2026
        full_years = list(range(2026, 2017, -1))
        db_years = [y[0] for y in session.query(Student.graduation_year).distinct().all() if y[0]]
        grad_years = sorted(list(set(full_years + db_years)), reverse=True)
        skills = [s.skill_name for s in session.query(Skill).order_by(Skill.skill_name.asc()).all()]
        return jsonify({
            'departments': departments,
            'graduation_years': grad_years,
            'skills': skills
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()
