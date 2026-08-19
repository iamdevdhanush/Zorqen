import sys, os
sys.path.append(os.path.abspath('.'))  # ensure current dir is in path
from fastapi.testclient import TestClient
import main
from routers.auth import _oauth_states
client = TestClient(main.app)
_oauth_states = _oauth_states
_oauth_states['some_state'] = 'pending'
resp = client.get('/auth/github/callback?code=dummycode&state=some_state', follow_redirects=False)
print('Status:', resp.status_code)
print('Headers:', dict(resp.headers))
print('Set-Cookie header:', resp.headers.get('set-cookie'))
print('Client cookies dict:', client.cookies.get_dict())
