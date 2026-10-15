"""Controlled benchmark fixture: SQL Injection Vulnerabilities"""
import sqlite3

def get_user_by_username_fstring(cursor: sqlite3.Cursor, username: str):
    # VULNERABLE: f-string interpolation into SQL statement
    cursor.execute(f"SELECT * FROM users WHERE username = '{username}'")
    return cursor.fetchone()

def get_item_by_name_percent(cursor: sqlite3.Cursor, query: str):
    # VULNERABLE: percent-formatting into SQL query
    cursor.execute("SELECT * FROM items WHERE name = '%s'" % query)
    return cursor.fetchall()

def get_product_by_id_concat(cursor: sqlite3.Cursor, product_id: str):
    # VULNERABLE: string concatenation into SQL query
    cursor.execute("SELECT * FROM products WHERE id = " + product_id)
    return cursor.fetchone()
