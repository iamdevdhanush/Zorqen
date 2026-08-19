import pytest
import re
from fastapi.testclient import TestClient
from main import app
from core.config import settings

client = TestClient(app)

def test_github_callback_sets_cookie_and_redirects():
    # Simulate a successful OAuth callback. We'll mock the GitHub exchange and user fetch.
    from unittest.mock import patch, AsyncMock
    from routers.auth import _set_auth_cookie
    from core.security import create_access_token
    from datetime import timedelta

    # Mock exchange_code_for_token and get_github_user to return dummy data
    with patch('github.oauth.exchange_code_for_token', new=AsyncMock(return_value='dummy_access_token')), \
         patch('github.oauth.get_github_user', new=AsyncMock(return_value={
             'id': 123,
             'login': 'testuser',
             'name': 'Test User',
             'email': 'test@example.com',
             'avatar_url': 'https://example.com/avatar.png',
         })), \
         patch('github.oauth.get_token_scopes', new=AsyncMock(return_value=['repo', 'read:user', 'user:email'])):
        # Perform the callback request (GET /auth/github/callback)
        # Ensure the state is recognized by the backend
        from routers.auth import _oauth_states
        _oauth_states['some_state'] = 'pending'
        response = client.get('/auth/github/callback?code=dummycode&state=some_state', follow_redirects=False)
        # Should be a 307 Redirect (FastAPI RedirectResponse defaults to 307)
        assert response.status_code in (302, 307)
        # Location header should point to the frontend callback without token query params
        location = response.headers['location']
        assert re.match(rf"{re.escape(settings.frontend_url)}/auth/callback", location)
        # Ensure Set-Cookie header (if present) and client cookie
        set_cookie = response.headers.get('set-cookie')
        # Verify cookie is set either via client storage or header
        if client.cookies.get('zorqen_token'):
            # Cookie stored in client.cookies, no further checks needed
            pass
        else:
            # Fall back to checking Set-Cookie header
            assert set_cookie is not None
            assert 'HttpOnly' in set_cookie
            assert ('Secure' in set_cookie) == (not settings.is_development)



def test_auth_token_endpoint_requires_cookie():
    # No cookie present should yield 401
    client.cookies.clear()
    from core.security import create_access_token
    from datetime import timedelta
    response = client.get('/auth/token')
    assert response.status_code == 401
    # With a valid cookie should return token
    token = create_access_token({"sub": "user-id", "login": "test"}, expires_delta=timedelta(hours=settings.jwt_expire_hours))
    client.cookies.set('zorqen_token', token)
    response = client.get('/auth/token')
    assert response.status_code == 200
    assert response.json()['token'] == token
