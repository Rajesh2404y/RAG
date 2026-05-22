"""
Integration test — auth flow: register → login → get /me.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_register_and_login():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        reg = await client.post("/api/v1/auth/register", json={
            "email": "test@example.com",
            "password": "TestPass123!",
            "full_name": "Test User",
        })
        assert reg.status_code == 201

        login = await client.post("/api/v1/auth/login", json={
            "email": "test@example.com",
            "password": "TestPass123!",
        })
        assert login.status_code == 200
        token = login.json()["access_token"]

        me = await client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200
        assert me.json()["email"] == "test@example.com"
