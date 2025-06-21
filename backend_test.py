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

TEST_COMPETITOR = {
    "domain": "stripe.com",
    "company_name": "Stripe Inc."
}

# Store auth token
auth_token = None

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