import sys
from security.custom_checks import scan_file as custom_scan_file
from security.secret_detector import scan_content as secret_scan_content

# Test fixtures for each category

fixtures = {
    "sql_injection": {
        "vulnerable": (
            "app/db.py",
            '''
import sqlite3

def get_user(user_id):
    query = f"SELECT * FROM users WHERE id = {user_id}"
    cursor.execute(query)
'''
        ),
        "safe": (
            "app/db.py",
            '''
import sqlite3

def get_user(user_id):
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
'''
        )
    },
    "command_injection": {
        "vulnerable": (
            "app/exec.py",
            '''
import subprocess

def ping(host):
    subprocess.run(f"ping {host}", shell=True)
'''
        ),
        "safe": (
            "app/exec.py",
            '''
import subprocess

def ping(host):
    subprocess.run(["ping", "-c", "1", host], shell=False)
'''
        )
    },
    "path_traversal": {
        "vulnerable": (
            "app/files.py",
            '''
from flask import request

def read_doc():
    filename = request.args.get('file')
    with open(request.args.get('file'), 'r') as f:
        return f.read()
'''
        ),
        "safe": (
            "app/files.py",
            '''
from pathlib import Path
from werkzeug.utils import secure_filename

def read_doc(safe_name):
    clean = secure_filename(safe_name)
    target = Path("/safe/dir") / clean
    with open(target, 'r') as f:
        return f.read()
'''
        )
    },
    "hardcoded_secrets": {
        "vulnerable": (
            "config.py",
            '''
AWS_KEY = "AKIAIOSFODNN7EXAMPLE"
GITHUB_TOKEN = "ghp_1234567890abcdefghijklmnopqrstuvwxyz"
STRIPE_KEY = "sk_live_123456789012345678901234"
'''
        ),
        "safe": (
            "config.py",
            '''
import os
AWS_KEY = os.environ.get("AWS_KEY")
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")
STRIPE_KEY = os.environ.get("STRIPE_KEY")
'''
        )
    },
    "cors_wildcard": {
        "vulnerable": (
            "app/server.py",
            '''
response.headers['Access-Control-Allow-Origin'] = '*'
'''
        ),
        "safe": (
            "app/server.py",
            '''
response.headers['Access-Control-Allow-Origin'] = 'https://app.example.com'
'''
        )
    },
    "insecure_deserialization": {
        "vulnerable": (
            "app/data.py",
            '''
import pickle

def load_data(raw):
    return pickle.loads(raw)
'''
        ),
        "safe": (
            "app/data.py",
            '''
import json

def load_data(raw):
    return json.loads(raw)
'''
        )
    },
    "insecure_random": {
        "vulnerable": (
            "app/auth.py",
            '''
import random
# session token generation
def generate_token():
    return str(random.randint(100000, 999999))
'''
        ),
        "safe": (
            "app/auth.py",
            '''
import secrets
def generate_token():
    return secrets.token_hex(32)
'''
        )
    },
    "missing_auth": {
        "vulnerable": (
            "app/routes.py",
            '''
from fastapi import APIRouter
router = APIRouter()

@router.delete("/admin/users/{id}")
async def delete_user(id: int):
    return {"deleted": id}
'''
        ),
        "safe": (
            "app/routes.py",
            '''
from fastapi import APIRouter, Depends
from auth import get_current_user
router = APIRouter()

@router.delete("/admin/users/{id}")
async def delete_user(id: int, user = Depends(get_current_user)):
    return {"deleted": id}
'''
        )
    }
}

print("================ SECURITY DETECTOR TEST RESULTS ================\n")

results = {}

for cat, pair in fixtures.items():
    vuln_path, vuln_code = pair["vulnerable"]
    safe_path, safe_code = pair["safe"]
    
    # Run custom checks
    vuln_custom = custom_scan_file(vuln_path, vuln_code)
    safe_custom = custom_scan_file(safe_path, safe_code)
    
    # Run secret scan
    vuln_secrets = secret_scan_content(vuln_code, vuln_path)
    safe_secrets = secret_scan_content(safe_code, safe_path)
    
    all_vuln = [f"{f.check_name}:{f.vulnerability_type}" for f in vuln_custom] + [f"secret:{f.pattern_name}" for f in vuln_secrets]
    all_safe = [f"{f.check_name}:{f.vulnerability_type}" for f in safe_custom] + [f"secret:{f.pattern_name}" for f in safe_secrets]
    
    tp = len(all_vuln) > 0
    fp = len(all_safe) > 0
    fn = not tp
    tn = not fp
    
    results[cat] = {
        "TP": tp,
        "FP": fp,
        "FN": fn,
        "TN": tn,
        "vuln_detected": all_vuln,
        "safe_detected": all_safe
    }
    
    status = "PASS" if (tp and not fp) else "FAIL"
    print(f"[{status}] Category: {cat}")
    print(f"  Vulnerable detected: {tp} -> {all_vuln}")
    print(f"  Safe detected (FP): {fp} -> {all_safe}")
    print()

# Also test an edge case that frequently causes false positives in regex scanners
fp_tests = {
    "sql_commented": (
        "app/db.py",
        '''
# cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")
def test():
    pass
'''
    ),
    "random_unrelated": (
        "app/game.py",
        '''
import random
# A secret game of dice
roll = random.randint(1, 6)
'''
    ),
    "command_safe_subprocess": (
        "app/cmd.py",
        '''
import subprocess
# shell=False is explicitly specified
subprocess.run(["ls", "-la"], shell=False)
'''
    )
}

print("================ FALSE POSITIVE EDGE CASES ================\n")
for name, (path, code) in fp_tests.items():
    findings = custom_scan_file(path, code)
    found = [f"{f.check_name}:{f.vulnerability_type}" for f in findings]
    print(f"Edge case '{name}':")
    print(f"  Triggered: {len(found) > 0} -> {found}")
