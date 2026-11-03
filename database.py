import logging
import pymysql
from sqlalchemy import URL, create_engine, text, event
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session
from sqlalchemy.pool import NullPool
from config import Config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Base = declarative_base()
engine = None
SessionLocal = None
active_db_type = 'unknown'

def get_active_db_type():
    global active_db_type
    if active_db_type == 'unknown' and engine is not None:
        return 'MySQL' if 'mysql' in str(engine.url) else 'SQLite'
    return active_db_type

def try_connect_mysql():
    """Attempt direct fast probe connection to MySQL."""
    try:
        # Try connecting with pymysql directly to check credentials
        conn = pymysql.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            port=Config.MYSQL_PORT,
            connect_timeout=2
        )
        with conn.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{Config.MYSQL_DB}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        logger.warning(f"MySQL check: {e}")
        return False

def init_engine():
    global engine, SessionLocal, active_db_type
    
    mysql_ready = False
    if Config.DB_TYPE == 'mysql':
        mysql_ready = try_connect_mysql()
        
    if mysql_ready:
        try:
            mysql_uri = URL.create(
                drivername='mysql+pymysql',
                username=Config.MYSQL_USER,
                password=Config.MYSQL_PASSWORD,
                host=Config.MYSQL_HOST,
                port=Config.MYSQL_PORT,
                database=Config.MYSQL_DB,
                query={'charset': 'utf8mb4'}
            )
            test_engine = create_engine(
                mysql_uri,
                pool_pre_ping=True,
                pool_recycle=3600
            )
            with test_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            engine = test_engine
            active_db_type = 'MySQL'
            logger.info(f"Successfully connected to MySQL database '{Config.MYSQL_DB}' on {Config.MYSQL_HOST}:{Config.MYSQL_PORT}")
        except Exception as e:
            logger.warning(f"Could not initialize MySQL engine: {e}")
            mysql_ready = False

    if not mysql_ready:
        active_db_type = 'SQLite' if Config.DB_TYPE == 'sqlite' else 'SQLite (MySQL Fallback)'
        sqlite_uri = f"sqlite:///{Config.SQLITE_PATH}"
        # Use NullPool for SQLite so file handles are released when sessions close,
        # preventing Windows file locking issues when zipping or archiving the project.
        engine = create_engine(
            sqlite_uri,
            connect_args={'check_same_thread': False, 'timeout': 15},
            poolclass=NullPool
        )
        # Enable PRAGMA busy_timeout
        @event.listens_for(engine, 'connect')
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute('PRAGMA busy_timeout = 5000;')
            cursor.close()
        logger.info(f"Using {active_db_type} database at {Config.SQLITE_PATH}.")

    SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
    return engine

def get_session():
    """Get a database session context."""
    if SessionLocal is None:
        init_engine()
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

def init_db():
    """Create all tables defined in models."""
    global engine
    if engine is None:
        init_engine()
    
    import models  # Ensure all models are registered
    Base.metadata.create_all(bind=engine)
    logger.info(f"Database schema verified/created successfully ({active_db_type}).")
