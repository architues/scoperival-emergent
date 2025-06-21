#!/usr/bin/env python3
import requests
import json
import time
import uuid
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Backend URL from frontend/.env
BACKEND_URL = "https://7a399e62-83c6-4fb2-959c-5b62d5296ba1.preview.emergentagent.com"
API_URL = f"{BACKEND_URL}/api"

# Test data
TEST_USER = {
    "email": f"test.user.{uuid.uuid4()}@example.com",
    "password": "SecurePassword123!",
    "company_name": "Acme Analytics Inc."
}

# Additional test users for authentication testing
TEST_USER_REGISTER = {
    "email": f"register.test.{uuid.uuid4()}@example.com",
    "password": "SecurePassword123!",
    "company_name": "Register Test Company"
}

TEST_USER_LOGIN = {
    "email": f"login.test.{uuid.uuid4()}@example.com",
    "password": "SecurePassword123!",
    "company_name": "Login Test Company"
}

TEST_COMPETITOR = {
    "domain": "stripe.com",
    "company_name": "Stripe Inc."
}

# Store auth tokens
auth_token = None
register_auth_token = None
login_auth_token = None

def log_response(response, endpoint):
    """Log response details"""
    logger.info(f"Response from {endpoint}: Status {response.status_code}")
    try:
        logger.info(f"Response body: {json.dumps(response.json(), indent=2)}")
    except:
        logger.info(f"Response text: {response.text}")

def test_health_check():
    """Test health check endpoints"""
    logger.info("\n=== Testing Health Check Endpoints ===")
    
    # Test root endpoint
    try:
        response = requests.get(f"{BACKEND_URL}/")
        log_response(response, "Root endpoint")
        assert response.status_code == 200, f"Root endpoint failed with status {response.status_code}"
        logger.info("Root endpoint test: PASSED")
    except Exception as e:
        logger.error(f"Root endpoint test FAILED: {str(e)}")
        return False
    
    # Test API root endpoint
    try:
        response = requests.get(f"{BACKEND_URL}/api/")
        log_response(response, "API root endpoint")
        assert response.status_code == 200, f"API root endpoint failed with status {response.status_code}"
        logger.info("API root endpoint test: PASSED")
    except Exception as e:
        logger.error(f"API root endpoint test FAILED: {str(e)}")
        return False
    
    # Test CORS
    try:
        response = requests.get(f"{API_URL}/test-cors")
        log_response(response, "CORS test GET")
        assert response.status_code == 200, f"CORS test GET failed with status {response.status_code}"
        logger.info("CORS test GET: PASSED")
        
        response = requests.post(f"{API_URL}/test-cors")
        log_response(response, "CORS test POST")
        assert response.status_code == 200, f"CORS test POST failed with status {response.status_code}"
        logger.info("CORS test POST: PASSED")
        
        # Test CORS preflight for auth endpoints
        headers = {
            "Origin": "https://example.com",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type, Authorization"
        }
        response = requests.options(f"{API_URL}/auth/login", headers=headers)
        log_response(response, "CORS preflight for login")
        assert response.status_code == 200, f"CORS preflight for login failed with status {response.status_code}"
        assert "Access-Control-Allow-Origin" in response.headers, "Missing CORS headers in preflight response"
        logger.info("CORS preflight for login: PASSED")
        
        response = requests.options(f"{API_URL}/auth/register", headers=headers)
        log_response(response, "CORS preflight for register")
        assert response.status_code == 200, f"CORS preflight for register failed with status {response.status_code}"
        assert "Access-Control-Allow-Origin" in response.headers, "Missing CORS headers in preflight response"
        logger.info("CORS preflight for register: PASSED")
    except Exception as e:
        logger.error(f"CORS test FAILED: {str(e)}")
        return False
    
    return True

def test_auth_api():
    """Test authentication endpoints"""
    global auth_token
    logger.info("\n=== Testing Authentication API ===")
    
    # Test user registration
    try:
        response = requests.post(
            f"{API_URL}/auth/register",
            json=TEST_USER
        )
        log_response(response, "User registration")
        
        if response.status_code == 200:
            auth_data = response.json()
            auth_token = auth_data.get("access_token")
            assert auth_token, "No access token in registration response"
            logger.info("User registration test: PASSED")
        else:
            # If registration fails with 400, user might already exist, try login
            logger.warning("Registration failed, trying login instead")
            return test_auth_login()
    except Exception as e:
        logger.error(f"User registration test FAILED: {str(e)}")
        return False
    
    return True

def test_auth_login():
    """Test login endpoint"""
    global auth_token
    logger.info("Testing login endpoint")
    
    try:
        response = requests.post(
            f"{API_URL}/auth/login",
            json={
                "email": TEST_USER["email"],
                "password": TEST_USER["password"]
            }
        )
        log_response(response, "User login")
        
        if response.status_code == 200:
            auth_data = response.json()
            auth_token = auth_data.get("access_token")
            assert auth_token, "No access token in login response"
            logger.info("User login test: PASSED")
            return True
        else:
            logger.error(f"Login failed with status {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"User login test FAILED: {str(e)}")
        return False

def test_detailed_authentication():
    """Detailed testing of authentication flow"""
    global register_auth_token, login_auth_token
    logger.info("\n=== Detailed Authentication Testing ===")
    
    # 1. Test registration with new user
    logger.info("1. Testing new user registration")
    try:
        response = requests.post(
            f"{API_URL}/auth/register",
            json=TEST_USER_REGISTER
        )
        log_response(response, "New user registration")
        
        if response.status_code == 200:
            auth_data = response.json()
            register_auth_token = auth_data.get("access_token")
            assert register_auth_token, "No access token in registration response"
            logger.info("New user registration: PASSED")
            
            # Verify token works with /me endpoint
            me_response = requests.get(
                f"{API_URL}/me",
                headers={"Authorization": f"Bearer {register_auth_token}"}
            )
            log_response(me_response, "/me endpoint after registration")
            assert me_response.status_code == 200, "/me endpoint failed after registration"
            user_data = me_response.json()
            assert user_data.get("email") == TEST_USER_REGISTER["email"], "Email mismatch in /me response"
            logger.info("Token verification after registration: PASSED")
        else:
            logger.error(f"New user registration failed with status {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"New user registration test FAILED: {str(e)}")
        return False
    
    # 2. Test registration with existing user (should fail)
    logger.info("2. Testing registration with existing user (should fail)")
    try:
        response = requests.post(
            f"{API_URL}/auth/register",
            json=TEST_USER_REGISTER
        )
        log_response(response, "Duplicate user registration")
        
        if response.status_code == 400:
            logger.info("Duplicate user registration correctly rejected: PASSED")
        else:
            logger.error(f"Duplicate user registration test FAILED: Expected 400, got {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"Duplicate user registration test FAILED: {str(e)}")
        return False
    
    # 3. Test registration and login flow
    logger.info("3. Testing registration and login flow")
    try:
        # Register new user
        response = requests.post(
            f"{API_URL}/auth/register",
            json=TEST_USER_LOGIN
        )
        log_response(response, "Registration for login test")
        
        if response.status_code == 200:
            logger.info("Registration for login test: PASSED")
            
            # Now try to login with this user
            login_response = requests.post(
                f"{API_URL}/auth/login",
                json={
                    "email": TEST_USER_LOGIN["email"],
                    "password": TEST_USER_LOGIN["password"]
                }
            )
            log_response(login_response, "Login after registration")
            
            if login_response.status_code == 200:
                auth_data = login_response.json()
                login_auth_token = auth_data.get("access_token")
                assert login_auth_token, "No access token in login response"
                logger.info("Login after registration: PASSED")
                
                # Verify token works with /me endpoint
                me_response = requests.get(
                    f"{API_URL}/me",
                    headers={"Authorization": f"Bearer {login_auth_token}"}
                )
                log_response(me_response, "/me endpoint after login")
                assert me_response.status_code == 200, "/me endpoint failed after login"
                user_data = me_response.json()
                assert user_data.get("email") == TEST_USER_LOGIN["email"], "Email mismatch in /me response"
                logger.info("Token verification after login: PASSED")
            else:
                logger.error(f"Login after registration failed with status {login_response.status_code}")
                return False
        else:
            logger.error(f"Registration for login test failed with status {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"Registration and login flow test FAILED: {str(e)}")
        return False
    
    # 4. Test login with incorrect password
    logger.info("4. Testing login with incorrect password")
    try:
        response = requests.post(
            f"{API_URL}/auth/login",
            json={
                "email": TEST_USER_LOGIN["email"],
                "password": "WrongPassword123!"
            }
        )
        log_response(response, "Login with incorrect password")
        
        if response.status_code == 401:
            logger.info("Login with incorrect password correctly rejected: PASSED")
        else:
            logger.error(f"Login with incorrect password test FAILED: Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"Login with incorrect password test FAILED: {str(e)}")
        return False
    
    # 5. Test login with non-existent user
    logger.info("5. Testing login with non-existent user")
    try:
        response = requests.post(
            f"{API_URL}/auth/login",
            json={
                "email": f"nonexistent.{uuid.uuid4()}@example.com",
                "password": "Password123!"
            }
        )
        log_response(response, "Login with non-existent user")
        
        if response.status_code == 401:
            logger.info("Login with non-existent user correctly rejected: PASSED")
        else:
            logger.error(f"Login with non-existent user test FAILED: Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"Login with non-existent user test FAILED: {str(e)}")
        return False
    
    # 6. Test JWT token validation
    logger.info("6. Testing JWT token validation")
    try:
        # Test with invalid token
        response = requests.get(
            f"{API_URL}/me",
            headers={"Authorization": "Bearer invalid_token_here"}
        )
        log_response(response, "/me with invalid token")
        
        if response.status_code == 401:
            logger.info("Invalid token correctly rejected: PASSED")
        else:
            logger.error(f"Invalid token test FAILED: Expected 401, got {response.status_code}")
            return False
        
        # Test with malformed token
        response = requests.get(
            f"{API_URL}/me",
            headers={"Authorization": "Bearer"}
        )
        log_response(response, "/me with malformed token")
        
        if response.status_code == 401:
            logger.info("Malformed token correctly rejected: PASSED")
        else:
            logger.error(f"Malformed token test FAILED: Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"JWT token validation test FAILED: {str(e)}")
        return False
    
    return True

def test_me_endpoint():
    """Test the /me endpoint to verify authentication"""
    global auth_token
    logger.info("Testing /me endpoint")
    
    if not auth_token:
        logger.error("No auth token available for /me endpoint test")
        return False
    
    try:
        response = requests.get(
            f"{API_URL}/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        log_response(response, "/me endpoint")
        
        if response.status_code == 200:
            user_data = response.json()
            assert user_data.get("email") == TEST_USER["email"], "Email mismatch in /me response"
            logger.info("/me endpoint test: PASSED")
            return True
        else:
            logger.error(f"/me endpoint failed with status {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"/me endpoint test FAILED: {str(e)}")
        return False

def test_competitors_api():
    """Test competitors API endpoints"""
    global auth_token
    logger.info("\n=== Testing Competitors API ===")
    
    if not auth_token:
        logger.error("No auth token available for competitors API test")
        return False
    
    # Test creating a competitor
    competitor_id = None
    try:
        response = requests.post(
            f"{API_URL}/competitors",
            json=TEST_COMPETITOR,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        log_response(response, "Create competitor")
        
        if response.status_code == 200:
            competitor_data = response.json()
            competitor_id = competitor_data.get("id")
            assert competitor_id, "No competitor ID in response"
            logger.info(f"Create competitor test: PASSED (ID: {competitor_id})")
        else:
            logger.error(f"Create competitor failed with status {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"Create competitor test FAILED: {str(e)}")
        return False
    
    # Test getting competitors list
    try:
        # Wait a moment to ensure data is saved
        time.sleep(1)
        
        response = requests.get(
            f"{API_URL}/competitors",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        log_response(response, "Get competitors")
        
        if response.status_code == 200:
            competitors = response.json()
            # Check if our created competitor is in the list
            found = False
            for comp in competitors:
                if comp.get("id") == competitor_id:
                    found = True
                    break
            
            if found:
                logger.info("Get competitors test: PASSED - Competitor found in list")
            else:
                logger.error("Get competitors test FAILED: Created competitor not found in list")
                # Detailed logging of all competitors
                logger.info(f"All competitors: {json.dumps(competitors, indent=2)}")
                logger.info(f"Looking for competitor ID: {competitor_id}")
                return False
        else:
            logger.error(f"Get competitors failed with status {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"Get competitors test FAILED: {str(e)}")
        return False
    
    # Test discover pages endpoint
    try:
        response = requests.post(
            f"{API_URL}/competitors/discover-pages",
            json={"domain": TEST_COMPETITOR["domain"]},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        log_response(response, "Discover pages")
        
        if response.status_code == 200:
            pages_data = response.json()
            suggestions = pages_data.get("suggestions", [])
            logger.info(f"Discover pages test: PASSED - Found {len(suggestions)} page suggestions")
            
            # Test adding tracked pages if we have suggestions
            if suggestions and competitor_id:
                # Take up to 2 suggestions for testing
                test_pages = suggestions[:2]
                urls_data = [{"url": page["url"], "page_type": page["page_type"]} for page in test_pages]
                
                response = requests.post(
                    f"{API_URL}/competitors/{competitor_id}/pages",
                    json={"urls": urls_data},
                    headers={"Authorization": f"Bearer {auth_token}"}
                )
                log_response(response, "Add tracked pages")
                
                if response.status_code == 200:
                    logger.info("Add tracked pages test: PASSED")
                else:
                    logger.error(f"Add tracked pages failed with status {response.status_code}")
                    # Non-critical test, continue
            
        else:
            logger.error(f"Discover pages failed with status {response.status_code}")
            # Non-critical test, continue
    except Exception as e:
        logger.error(f"Discover pages test FAILED: {str(e)}")
        # Non-critical test, continue
    
    # Test dashboard stats
    try:
        response = requests.get(
            f"{API_URL}/dashboard/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        log_response(response, "Dashboard stats")
        
        if response.status_code == 200:
            stats = response.json()
            total_competitors = stats.get("total_competitors", 0)
            assert total_competitors > 0, "No competitors found in dashboard stats"
            logger.info(f"Dashboard stats test: PASSED - Found {total_competitors} competitors")
        else:
            logger.error(f"Dashboard stats failed with status {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"Dashboard stats test FAILED: {str(e)}")
        return False
    
    return True

def test_database_connection():
    """Test database connection by verifying data persistence"""
    global auth_token
    logger.info("\n=== Testing Database Connection ===")
    
    if not auth_token:
        logger.error("No auth token available for database connection test")
        return False
    
    # Create a unique competitor for this test
    unique_competitor = {
        "domain": f"paypal-{uuid.uuid4()}.com",
        "company_name": f"PayPal Holdings Inc. {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    }
    
    # Create the competitor
    competitor_id = None
    try:
        response = requests.post(
            f"{API_URL}/competitors",
            json=unique_competitor,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        log_response(response, "Create unique competitor")
        
        if response.status_code == 200:
            competitor_data = response.json()
            competitor_id = competitor_data.get("id")
            assert competitor_id, "No competitor ID in response"
            logger.info(f"Create unique competitor: PASSED (ID: {competitor_id})")
        else:
            logger.error(f"Create unique competitor failed with status {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"Create unique competitor FAILED: {str(e)}")
        return False
    
    # Wait a moment to ensure data is saved
    time.sleep(2)
    
    # Verify the competitor exists in the database
    try:
        response = requests.get(
            f"{API_URL}/competitors",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        log_response(response, "Verify competitor persistence")
        
        if response.status_code == 200:
            competitors = response.json()
            # Check if our created competitor is in the list
            found = False
            for comp in competitors:
                if comp.get("id") == competitor_id:
                    found = True
                    break
            
            if found:
                logger.info("Database persistence test: PASSED - Unique competitor found in database")
            else:
                logger.error("Database persistence test FAILED: Unique competitor not found in database")
                # Detailed logging of all competitors
                logger.info(f"All competitors: {json.dumps(competitors, indent=2)}")
                logger.info(f"Looking for competitor ID: {competitor_id}")
                return False
        else:
            logger.error(f"Verify competitor persistence failed with status {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"Verify competitor persistence FAILED: {str(e)}")
        return False
    
    return True

def test_error_handling():
    """Test error handling in the API"""
    global auth_token
    logger.info("\n=== Testing Error Handling ===")
    
    # Test authentication failure
    try:
        response = requests.get(
            f"{API_URL}/me",
            headers={"Authorization": "Bearer invalid_token"}
        )
        log_response(response, "Authentication failure test")
        
        if response.status_code == 401:
            logger.info("Authentication failure test: PASSED - Correctly returned 401 for invalid token")
        else:
            logger.error(f"Authentication failure test FAILED: Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"Authentication failure test FAILED: {str(e)}")
        return False
    
    # Test invalid competitor creation (missing required field)
    if auth_token:
        try:
            response = requests.post(
                f"{API_URL}/competitors",
                json={"domain": "example.com"},  # Missing company_name
                headers={"Authorization": f"Bearer {auth_token}"}
            )
            log_response(response, "Invalid competitor creation test")
            
            if response.status_code in [400, 422]:  # FastAPI validation error
                logger.info("Invalid competitor creation test: PASSED - Correctly rejected invalid data")
            else:
                logger.error(f"Invalid competitor creation test FAILED: Expected 400/422, got {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"Invalid competitor creation test FAILED: {str(e)}")
            return False
    
    return True

def run_all_tests():
    """Run all tests and return results"""
    results = {
        "Health Check API": test_health_check(),
        "Authentication API": test_auth_api() and test_me_endpoint(),
        "Detailed Authentication": test_detailed_authentication(),
        "Competitors API": test_competitors_api(),
        "Database Connection": test_database_connection(),
        "Error Handling": test_error_handling()
    }
    
    logger.info("\n=== Test Results Summary ===")
    for test_name, result in results.items():
        status = "PASSED" if result else "FAILED"
        logger.info(f"{test_name}: {status}")
    
    return results

if __name__ == "__main__":
    logger.info(f"Starting Scoperival Backend API Tests against {BACKEND_URL}")
    run_all_tests()