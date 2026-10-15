"""Controlled benchmark fixture: Command Injection Vulnerabilities"""
import os
import subprocess

def run_backup_system(archive_name: str):
    # VULNERABLE: os.system with formatted command
    os.system(f"tar -czf {archive_name}.tar.gz /var/data")

def ping_host_shell(target_ip: str):
    # VULNERABLE: subprocess with shell=True and dynamic input
    subprocess.run(f"ping -c 1 {target_ip}", shell=True)

def dynamic_eval_input(request_data: dict):
    # VULNERABLE: eval on user input
    user_expr = request_data.get("calc")
    return eval(user_expr)
