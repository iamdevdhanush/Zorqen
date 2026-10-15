"""Controlled benchmark fixture: Safe File Access Alternatives"""
import os

STATIC_DIR = "/var/www/static"

def read_user_report_safe_basename(request_params: dict):
    # SAFE: Stripping path components via os.path.basename
    filename = os.path.basename(request_params.get("filename", ""))
    safe_path = os.path.join(STATIC_DIR, filename)
    with open(safe_path, "r") as f:
        return f.read()

def read_fixed_template():
    # SAFE: Fixed hardcoded path
    with open("templates/base.html", "r") as f:
        return f.read()
