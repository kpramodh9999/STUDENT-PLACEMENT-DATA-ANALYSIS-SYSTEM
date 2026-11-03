from flask import Blueprint, request, jsonify
from database import get_session, get_active_db_type
from services.analytics_service import AnalyticsService
from models import Student, Placement

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')

@analytics_bp.route('/dashboard', methods=['GET'])
def dashboard_analytics():
    session = next(get_session())
    try:
        data = AnalyticsService.get_dashboard_summary(session)
        data['db_type'] = get_active_db_type()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@analytics_bp.route('/department', methods=['GET'])
def department_analytics():
    session = next(get_session())
    try:
        grad_year = request.args.get('graduation_year')
        placement_year = request.args.get('placement_year')
        department = request.args.get('department')
        sub_branch = request.args.get('sub_branch')
        
        g_year = int(grad_year) if grad_year and grad_year.isdigit() else None
        p_year = int(placement_year) if placement_year and placement_year.isdigit() else None
        dept = department.strip() if department else None
        sub = sub_branch.strip() if sub_branch else None

        data = AnalyticsService.get_department_analytics(
            session, grad_year=g_year, placement_year=p_year, department=dept, sub_branch=sub
        )
        data['db_type'] = get_active_db_type()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@analytics_bp.route('/package', methods=['GET'])
def package_analytics():
    session = next(get_session())
    try:
        grad_year = request.args.get('graduation_year')
        placement_year = request.args.get('placement_year')
        department = request.args.get('department')
        sub_branch = request.args.get('sub_branch')

        g_year = int(grad_year) if grad_year and grad_year.isdigit() else None
        p_year = int(placement_year) if placement_year and placement_year.isdigit() else None
        dept = department.strip() if department else None
        sub = sub_branch.strip() if sub_branch else None

        data = AnalyticsService.get_package_analytics(
            session,
            grad_year=g_year,
            placement_year=p_year,
            department=dept,
            sub_branch=sub
        )
        data['db_type'] = get_active_db_type()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@analytics_bp.route('/skills', methods=['GET'])
def skill_insights():
    session = next(get_session())
    try:
        grad_year = request.args.get('graduation_year')
        department = request.args.get('department')
        sub_branch = request.args.get('sub_branch')

        g_year = int(grad_year) if grad_year and grad_year.isdigit() else None
        dept = department.strip() if department else None
        sub = sub_branch.strip() if sub_branch else None

        data = AnalyticsService.get_skill_insights(
            session, grad_year=g_year, department=dept, sub_branch=sub
        )
        data['db_type'] = get_active_db_type()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@analytics_bp.route('/health', methods=['GET'])
def health_check():
    session = next(get_session())
    try:
        student_count = session.query(Student).count()
        placement_count = session.query(Placement).count()
        return jsonify({
            'status': 'healthy',
            'db_type': active_db_type,
            'student_count': student_count,
            'placement_count': placement_count
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'db_type': active_db_type
        }), 500
    finally:
        session.close()
