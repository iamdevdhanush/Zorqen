"""Controlled benchmark fixture: Safe SQL Parameterized Alternatives"""
import sqlite3

def get_user_parameterized_tuple(cursor: sqlite3.Cursor, username: str):
    # SAFE: Standard parameterized placeholder (%s or ?)
    cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
    return cursor.fetchone()

def get_user_parameterized_named(cursor: sqlite3.Cursor, user_id: int):
    # SAFE: Named parameter binding
    cursor.execute("SELECT * FROM users WHERE id = :id", {"id": user_id})
    return cursor.fetchone()

def get_all_active_users_static(cursor: sqlite3.Cursor):
    # SAFE: Static query without variable interpolation
    cursor.execute("SELECT id, username, email FROM users WHERE is_active = 1")
    return cursor.fetchall()
