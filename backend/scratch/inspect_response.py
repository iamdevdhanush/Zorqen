from fastapi.testclient import TestClient
from main import app
from routers.auth import _oauth_states
client = TestClient(app)
_oauth_states = _oauth_states
_oauth_states['some_state'] = 'pending'
response = client.get('/auth/github/callback?code=dummycode&state=some_state', follow_redirects=False)
print('status:', response.status_code)
print('headers:', dict(response.headers))
print('cookies in client:', client.cookies.get_dict())
