"""Controlled benchmark fixture: Safe Command Execution Alternatives"""
import subprocess

def ping_host_safe_list(target_ip: str):
    # SAFE: Array of arguments, shell=False by default (no shell interpolation)
    subprocess.run(["ping", "-c", "1", target_ip], check=True)

def git_status_literal():
    # SAFE: Static arguments array
    subprocess.run(["git", "status", "--short"], capture_output=True)
