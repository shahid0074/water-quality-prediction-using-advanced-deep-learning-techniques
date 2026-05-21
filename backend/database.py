import sqlite3
import hashlib
import os

DB_FILE = "users.db"

def init_db():
    """Initialize the SQLite database and create the users table if it doesn't exist."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

def _hash_password(password: str) -> str:
    """Helper to hash the password securely using SHA-256."""
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def create_user(username: str, password: str) -> bool:
    """
    Insert a new user into the database.
    Returns True if successful, False if the username already exists.
    """
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        hashed_pw = _hash_password(password)
        
        cursor.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", (username, hashed_pw))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        # Username already exists
        return False
    finally:
        conn.close()

def verify_user(username: str, password: str) -> bool:
    """
    Verify a user's credentials against the database.
    Returns True if valid, False otherwise.
    """
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    hashed_pw = _hash_password(password)
    cursor.execute("SELECT id FROM users WHERE username = ? AND password_hash = ?", (username, hashed_pw))
    
    user = cursor.fetchone()
    conn.close()
    
    return user is not None

# Initialize the table when the script is imported
init_db()
