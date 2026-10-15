"""Controlled benchmark fixture: Path Traversal Vulnerabilities"""

def read_user_report(request_params: dict):
    # VULNERABLE: Direct user input in file open
    filename = request_params.get("filename")
    with open(filename, "r") as f:
        return f.read()

def download_attachment(request_args: dict):
    # VULNERABLE: Direct user input in open without sanitization
    doc_path = request_args["path"]
    f = open(doc_path, "rb")
    return f.read()
