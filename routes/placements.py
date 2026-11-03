from flask import Blueprint, request, jsonify
from sqlalchemy.orm import joinedload
from sqlalchemy import or_
from datetime import datetime
from database import get_session
from models import Placement, Student

placements_bp = Blueprint('placements', __name__, url_prefix='/api/placements')

@placements_bp.route('', methods=['GET'])
def get_placements():
    session = next(get_session())
    try:
        search = request.args.get('search', '').strip()
        department = request.args.get('department', '').strip()
        sub_branch = request.args.get('sub_branch', '').strip()
        company = request.args.get('company', '').strip()
        year = request.args.get('placement_year', '').strip()
        status = request.args.get('status', '').strip()
        page = max(1, int(request.args.get('page', 1)))
        limit = max(1, min(100, int(request.args.get('limit', 10))))

        query = session.query(Placement).join(Student).options(joinedload(Placement.student))

        if search:
            query = query.filter(
                or_(
                    Student.roll_no.ilike(f"%{search}%"),
                    Student.student_name.ilike(f"%{search}%"),
                    Placement.company.ilike(f"%{search}%"),
                    Placement.role.ilike(f"%{search}%")
                )
            )
        if department:
            query = query.filter(Student.department == department)
        if sub_branch:
            query = query.filter(Student.sub_branch == sub_branch)
        if company:
            query = query.filter(Placement.company == company)
        if status:
            query = query.filter(Placement.status == status)
        if year:
            try:
                y = int(year)
                # Filter by year of placement_date
                query = query.filter(
                    Placement.placement_date >= f"{y}-01-01",
                    Placement.placement_date <= f"{y}-12-31"
                )
            except ValueError:
                pass

        total_count = query.count()
        offset = (page - 1) * limit
        placements = query.order_by(Placement.placement_date.desc(), Placement.placement_id.desc()).offset(offset).limit(limit).all()

        return jsonify({
            'placements': [p.to_dict() for p in placements],
            'total_count': total_count,
            'page': page,
            'limit': limit,
            'total_pages': (total_count + limit - 1) // limit if limit > 0 else 1
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@placements_bp.route('/<int:placement_id>', methods=['GET'])
def get_placement(placement_id):
    session = next(get_session())
    try:
        placement = session.query(Placement).options(joinedload(Placement.student)).filter(Placement.placement_id == placement_id).first()
        if not placement:
            return jsonify({'error': 'Placement record not found'}), 404
        return jsonify({'placement': placement.to_dict()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@placements_bp.route('', methods=['POST'])
def create_placement():
    data = request.get_json() or {}
    roll_no = str(data.get('roll_no', '')).strip().upper()
    company = str(data.get('company', '')).strip()
    role = str(data.get('role', '')).strip()
    package_lpa_val = data.get('package_lpa') if data.get('package_lpa') is not None else data.get('package')
    placement_date_str = str(data.get('placement_date', '')).strip()
    status = str(data.get('status', 'Placed')).strip() or 'Placed'

    # Validations
    if not roll_no:
        return jsonify({'error': 'Student roll number is required'}), 400
    if not company:
        return jsonify({'error': 'Company name is required'}), 400
    if not role:
        return jsonify({'error': 'Job role is required'}), 400
    if package_lpa_val is None:
        return jsonify({'error': 'Package in LPA is required'}), 400
    try:
        package_lpa = float(package_lpa_val)
        if package_lpa <= 0 or package_lpa > 200:
            return jsonify({'error': 'Package in LPA must be a positive number up to 200 LPA'}), 400
    except ValueError:
        return jsonify({'error': 'Package in LPA must be a valid numeric value'}), 400

    if not placement_date_str:
        return jsonify({'error': 'Placement date is required'}), 400
    try:
        placement_date = datetime.strptime(placement_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid placement date format. Use YYYY-MM-DD'}), 400

    session = next(get_session())
    try:
        student = session.query(Student).filter(Student.roll_no == roll_no).first()
        if not student:
            return jsonify({'error': f"Student with Roll Number '{roll_no}' does not exist in student records"}), 404

        new_placement = Placement(
            student_id=student.student_id,
            company=company,
            role=role,
            package_lpa=round(package_lpa, 2),
            placement_date=placement_date,
            status=status
        )
        session.add(new_placement)
        session.commit()

        return jsonify({
            'message': 'Placement record created successfully',
            'placement': new_placement.to_dict()
        }), 201
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@placements_bp.route('/<int:placement_id>', methods=['PUT'])
def update_placement(placement_id):
    data = request.get_json() or {}
    session = next(get_session())
    try:
        placement = session.query(Placement).filter(Placement.placement_id == placement_id).first()
        if not placement:
            return jsonify({'error': 'Placement record not found'}), 404

        roll_no = str(data.get('roll_no', '')).strip().upper()
        if roll_no:
            student = session.query(Student).filter(Student.roll_no == roll_no).first()
            if not student:
                return jsonify({'error': f"Student with Roll Number '{roll_no}' not found"}), 404
            placement.student_id = student.student_id

        if 'company' in data:
            comp = str(data['company']).strip()
            if not comp:
                return jsonify({'error': 'Company cannot be empty'}), 400
            placement.company = comp

        if 'role' in data:
            rl = str(data['role']).strip()
            if not rl:
                return jsonify({'error': 'Job role cannot be empty'}), 400
            placement.role = rl

        raw_pkg = data.get('package_lpa') if data.get('package_lpa') is not None else data.get('package')
        if raw_pkg is not None:
            try:
                pkg = float(raw_pkg)
                if pkg <= 0 or pkg > 200:
                    return jsonify({'error': 'Package in LPA must be between 0.1 and 200'}), 400
                placement.package_lpa = round(pkg, 2)
            except ValueError:
                return jsonify({'error': 'Package must be a valid number'}), 400

        if 'placement_date' in data:
            try:
                placement.placement_date = datetime.strptime(str(data['placement_date']).strip(), '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid date format (YYYY-MM-DD)'}), 400

        if 'status' in data:
            st = str(data['status']).strip()
            if st:
                placement.status = st

        session.commit()
        return jsonify({
            'message': 'Placement record updated successfully',
            'placement': placement.to_dict()
        }), 200
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@placements_bp.route('/<int:placement_id>', methods=['DELETE'])
def delete_placement(placement_id):
    session = next(get_session())
    try:
        placement = session.query(Placement).filter(Placement.placement_id == placement_id).first()
        if not placement:
            return jsonify({'error': 'Placement record not found'}), 404

        company = placement.company
        session.delete(placement)
        session.commit()
        return jsonify({'message': f"Placement record for {company} deleted successfully"}), 200
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@placements_bp.route('/meta/options', methods=['GET'])
def get_placement_filter_options():
    session = next(get_session())
    try:
        companies = [c[0] for c in session.query(Placement.company).distinct().order_by(Placement.company.asc()).all() if c[0]]
        statuses = [s[0] for s in session.query(Placement.status).distinct().order_by(Placement.status.asc()).all() if s[0]]
        
        # Get distinct placement years, guaranteeing 2018 through 2026
        full_years = list(range(2026, 2017, -1))
        years_query = session.query(Placement.placement_date).distinct().all()
        db_years = [d[0].year for d in years_query if d[0]]
        years = sorted(list(set(full_years + db_years)), reverse=True)

        return jsonify({
            'companies': companies,
            'statuses': statuses,
            'placement_years': years
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()
