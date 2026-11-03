import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend folder
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / '.env')

class Config:
    DB_TYPE = os.getenv('DB_TYPE', 'mysql').lower()
    MYSQL_HOST = os.getenv('MYSQL_HOST', '127.0.0.1')
    if MYSQL_HOST == 'localhost':
        MYSQL_HOST = '127.0.0.1'  # Prevent Windows IPv6 DNS resolution delay
        
    MYSQL_PORT = int(os.getenv('MYSQL_PORT', 3306))
    MYSQL_USER = os.getenv('MYSQL_USER', 'root')
    MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', 'root')
    MYSQL_DB = os.getenv('MYSQL_DB', 'placement_system')
    
    # SQLite file path
    SQLITE_PATH = BASE_DIR / 'placement_system.db'
    
    SECRET_KEY = os.getenv('SECRET_KEY', 'placement-system-secret-key-2026')
    DEBUG = os.getenv('FLASK_ENV', 'development') == 'development'
    PORT = int(os.getenv('PORT', 5000))
