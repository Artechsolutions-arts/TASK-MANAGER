#!/usr/bin/env python3
"""
Comprehensive API Test Script
Tests all major endpoints to ensure they work properly
"""
import requests
import json
from typing import Dict, Any

BASE_URL = "http://localhost:8001/api/v1"

def test_health_check():
    """Test health check endpoint"""
    print("Testing health check...")
    response = requests.get(f"{BASE_URL.replace('/api/v1', '')}/health")
    assert response.status_code == 200, f"Health check failed: {response.status_code}"
    print("[OK] Health check passed")
    return True

def test_login(email: str, password: str) -> Dict[str, Any]:
    """Test login endpoint"""
    print(f"\nTesting login with {email}...")
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password},
        headers={"Content-Type": "application/json", "Origin": "http://localhost:5173"}
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:200]}")
    
    if response.status_code == 200:
        data = response.json()
        assert "access_token" in data, "Missing access_token"
        assert "refresh_token" in data, "Missing refresh_token"
        print("[OK] Login successful")
        return data
    else:
        print(f"[FAIL] Login failed: {response.text}")
        return None

def test_get_current_user(token: str) -> Dict[str, Any]:
    """Test get current user endpoint"""
    print("\nTesting get current user...")
    response = requests.get(
        f"{BASE_URL}/users/me",
        headers={
            "Authorization": f"Bearer {token}",
            "Origin": "http://localhost:5173"
        }
    )
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"[OK] User retrieved: {data.get('email')}")
        return data
    else:
        print(f"[FAIL] Get user failed: {response.text}")
        return None

def test_list_projects(token: str):
    """Test list projects endpoint"""
    print("\nTesting list projects...")
    response = requests.get(
        f"{BASE_URL}/projects",
        headers={
            "Authorization": f"Bearer {token}",
            "Origin": "http://localhost:5173"
        }
    )
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"[OK] Projects retrieved: {len(data)} projects")
        return data
    else:
        print(f"[FAIL] List projects failed: {response.text}")
        return None

def test_list_tasks(token: str):
    """Test list tasks endpoint"""
    print("\nTesting list tasks...")
    response = requests.get(
        f"{BASE_URL}/tasks",
        headers={
            "Authorization": f"Bearer {token}",
            "Origin": "http://localhost:5173"
        }
    )
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"[OK] Tasks retrieved: {len(data)} tasks")
        return data
    else:
        print(f"[FAIL] List tasks failed: {response.text}")
        return None

def test_list_teams(token: str):
    """Test list teams endpoint"""
    print("\nTesting list teams...")
    response = requests.get(
        f"{BASE_URL}/teams",
        headers={
            "Authorization": f"Bearer {token}",
            "Origin": "http://localhost:5173"
        }
    )
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"[OK] Teams retrieved: {len(data)} teams")
        return data
    else:
        print(f"[FAIL] List teams failed: {response.text}")
        return None

def test_dashboard(token: str):
    """Test dashboard endpoint"""
    print("\nTesting dashboard...")
    response = requests.get(
        f"{BASE_URL}/analytics/dashboard",
        headers={
            "Authorization": f"Bearer {token}",
            "Origin": "http://localhost:5173"
        }
    )
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"[OK] Dashboard data retrieved")
        return data
    else:
        print(f"[FAIL] Dashboard failed: {response.text}")
        return None

def main():
    """Run all tests"""
    print("=" * 60)
    print("API Functionality Test Suite")
    print("=" * 60)
    
    # Test health check
    try:
        test_health_check()
    except Exception as e:
        print(f"[FAIL] Health check error: {e}")
        return
    
    # Test login
    token_data = test_login("ceo@demo.com", "ceo123")
    if not token_data:
        print("\n[FAIL] Cannot continue without authentication")
        return
    
    token = token_data["access_token"]
    
    # Test authenticated endpoints
    test_get_current_user(token)
    test_list_projects(token)
    test_list_tasks(token)
    test_list_teams(token)
    test_dashboard(token)
    
    print("\n" + "=" * 60)
    print("All tests completed!")
    print("=" * 60)

if __name__ == "__main__":
    main()
