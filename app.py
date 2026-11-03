import os
from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
from config import Config
from database import init_db, get_session, get_active_db_type
from models import Student
from seed_data import seed_sample_data, clear_data, export_data_to_files, append_sample_data

from routes.students import students_bp
from routes.placements import placements_bp
from routes.analytics import analytics_bp
from routes.reports import reports_bp

def create_app():
    # Frontend directory (HTML, CSS, JavaScript)
    frontend_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend'))
    if not os.path.isdir(frontend_folder):
        frontend_folder = os.path.join(os.path.dirname(__file__), 'static')

    app = Flask(__name__, static_folder=frontend_folder, static_url_path='')
    app.config.from_object(Config)

    # Enable CORS for frontend development
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Initialize Database Schema
    init_db()

    # Register Blueprints
    app.register_blueprint(students_bp)
    app.register_blueprint(placements_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(reports_bp)

    # Serve HTML Frontend
    @app.route('/', methods=['GET'])
    def serve_frontend():
        return send_from_directory(app.static_folder, 'index.html')

    @app.route('/<path:path>', methods=['GET'])
    def serve_static_file(path):
        target = os.path.join(app.static_folder, path)
        if os.path.isfile(target):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, 'index.html')

    @app.route('/static/<path:filename>', methods=['GET'])
    def serve_static_alias(filename):
        return send_from_directory(app.static_folder, filename)

    # Check if DB has data on startup; if empty, seed with initial sample dataset
    try:
        session = next(get_session())
        student_count = session.query(Student).count()
        if student_count == 0:
            print("Database is empty. Populating with initial fictional sample data...")
            seed_sample_data(session)
        session.close()
    except Exception as e:
        print(f"Notice during startup data check: {e}")

    # Seed and Clear admin endpoints
    @app.route('/api/admin/seed', methods=['POST'])
    def trigger_seed():
        session = next(get_session())
        try:
            clear_data(session)
            s_count, p_count = seed_sample_data(session)
            export_data_to_files(session)
            return jsonify({
                'message': 'Sample data successfully generated',
                'students_created': s_count,
                'placements_created': p_count
            }), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
        finally:
            session.close()

    @app.route('/api/admin/add-sample', methods=['POST'])
    def trigger_add_sample():
        count = request.json.get('count', 35) if request.is_json else 35
        session = next(get_session())
        try:
            s_count, p_count = append_sample_data(session, count=int(count))
            export_data_to_files(session)
            return jsonify({
                'message': f'Successfully appended {s_count} new students and {p_count} offers',
                'students_added': s_count,
                'placements_added': p_count
            }), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
        finally:
            session.close()

    @app.route('/api/admin/clear', methods=['POST'])
    def trigger_clear():
        session = next(get_session())
        try:
            clear_data(session)
            return jsonify({'message': 'All records cleared successfully. Database is now empty.'}), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
        finally:
            session.close()

    @app.route('/api/admin/sample-files/<filename>', methods=['GET'])
    def get_sample_file(filename):
        allowed = {'sample_students.csv', 'sample_placements.csv', 'sample_dataset.json'}
        if filename not in allowed:
            return jsonify({'error': 'File not found'}), 404
        data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data'))
        return send_from_directory(data_dir, filename, as_attachment=True)

    @app.route('/api/admin/download-zip', methods=['GET'])
    def download_project_zip():
        """Creates and downloads a complete, clean ZIP archive of the project."""
        import io, zipfile
        from flask import send_file
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        memory_file = io.BytesIO()
        with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            for root, dirs, files in os.walk(project_root):
                dirs[:] = [d for d in dirs if d not in ('.git', '__pycache__', '.pytest_cache', '.vscode')]
                for file in files:
                    if file.endswith(('.zip', '.pyc', '.tmp', '.db-journal', '.db-wal', '.db-shm')):
                        continue
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, project_root)
                    try:
                        zf.write(full_path, rel_path)
                    except Exception:
                        pass
        memory_file.seek(0)
        return send_file(
            memory_file,
            mimetype='application/zip',
            as_attachment=True,
            download_name='Placement_Cell_System_Project.zip'
        )

    @app.route('/api/health', methods=['GET'])
    def api_health():
        return jsonify({
            'status': 'online',
            'system': 'Student Placement Data Analysis System',
            'database': get_active_db_type()
        })

    @app.errorhandler(404)
    def not_found(e):
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Resource not found'}), 404
        return send_from_directory(app.static_folder, 'index.html')

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({'error': 'Internal server error'}), 500

    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('PORT', 5000))
    print(f"Starting Student Placement Data Analysis API on http://127.0.0.1:{port} (Database: {get_active_db_type()})")
    app.run(host='0.0.0.0', port=port, debug=False)
