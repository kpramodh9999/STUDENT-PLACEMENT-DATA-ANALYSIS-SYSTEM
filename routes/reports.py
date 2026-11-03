from flask import Blueprint, send_file, jsonify
from database import get_session
from services.report_service import ReportService

reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')

@reports_bp.route('/charts/department.png', methods=['GET'])
def department_chart():
    session = next(get_session())
    try:
        buf = ReportService.generate_department_placement_chart(session)
        return send_file(buf, mimetype='image/png', as_attachment=False, download_name='department_placement_chart.png')
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@reports_bp.route('/charts/package.png', methods=['GET'])
def package_chart():
    session = next(get_session())
    try:
        buf = ReportService.generate_package_distribution_chart(session)
        return send_file(buf, mimetype='image/png', as_attachment=False, download_name='package_distribution_chart.png')
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@reports_bp.route('/charts/skills.png', methods=['GET'])
def skills_chart():
    session = next(get_session())
    try:
        buf = ReportService.generate_skill_insights_chart(session)
        return send_file(buf, mimetype='image/png', as_attachment=False, download_name='skill_insights_chart.png')
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()
