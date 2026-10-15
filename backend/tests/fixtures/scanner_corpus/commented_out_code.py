"""Controlled benchmark fixture: Commented-out Code (Should NOT trigger alerts)"""

# Inactive old SQL code:
# cursor.execute(f"SELECT * FROM users WHERE name = '{username}'")
# cursor.execute("SELECT * FROM items WHERE id = " + item_id)

# Inactive old shell execution:
# os.system(f"rm -rf {target_dir}")
# subprocess.run(f"curl {url}", shell=True)

# Inactive old file access:
# with open(request.args.get("file"), "r") as f:
#     data = f.read()

def active_clean_function():
    return "This file contains zero active vulnerabilities"
