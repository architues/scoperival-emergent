import requests
import sys
import time
import uuid
from datetime import datetime

class ScoperivalAPITester:
    def __init__(self, base_url="https://ba3bc982-a283-4930-9744-0221fdff4458.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.user_email = f"test_user_{uuid.uuid4().hex[:8]}@example.com"
        self.user_password = "TestPass123!"
        self.company_name = "Test Company"
        self.competitor_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.json()}")
                except:
                    print(f"Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_register(self):
        """Test user registration"""
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": self.user_email,
                "password": self.user_password,
                "company_name": self.company_name
            }
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            return True
        return False

    def test_login(self):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={
                "email": self.user_email,
                "password": self.user_password
            }
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            return True
        return False

    def test_get_me(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "me",
            200
        )
        return success

    def test_add_competitor(self):
        """Test adding a competitor"""
        success, response = self.run_test(
            "Add Competitor",
            "POST",
            "competitors",
            200,
            data={
                "domain": "stripe.com",
                "company_name": "Stripe"
            }
        )
        if success and 'id' in response:
            self.competitor_id = response['id']
            return True
        return False

    def test_discover_pages(self):
        """Test page discovery"""
        success, response = self.run_test(
            "Discover Pages",
            "POST",
            "competitors/discover-pages",
            200,
            data={
                "domain": "stripe.com"
            }
        )
        if success and 'suggestions' in response:
            self.suggestions = response['suggestions']
            return True
        return False

    def test_add_tracked_pages(self):
        """Test adding tracked pages"""
        if not self.competitor_id:
            print("❌ No competitor ID available for adding pages")
            return False
            
        # Use first two suggestions or create default ones
        pages = []
        if hasattr(self, 'suggestions') and self.suggestions:
            for suggestion in self.suggestions[:2]:
                pages.append({
                    "url": suggestion["url"],
                    "page_type": suggestion["page_type"]
                })
        else:
            pages = [
                {"url": "https://stripe.com/pricing", "page_type": "pricing"},
                {"url": "https://stripe.com/blog", "page_type": "blog"}
            ]
            
        success, response = self.run_test(
            "Add Tracked Pages",
            "POST",
            f"competitors/{self.competitor_id}/pages",
            200,
            data={
                "urls": pages
            }
        )
        return success

    def test_get_competitors(self):
        """Test getting competitors list"""
        success, response = self.run_test(
            "Get Competitors",
            "GET",
            "competitors",
            200
        )
        return success

    def test_scan_competitor(self):
        """Test scanning a competitor"""
        if not self.competitor_id:
            print("❌ No competitor ID available for scanning")
            return False
            
        success, response = self.run_test(
            "Scan Competitor",
            "POST",
            f"competitors/{self.competitor_id}/scan",
            200
        )
        return success

    def test_get_dashboard_stats(self):
        """Test getting dashboard stats"""
        success, response = self.run_test(
            "Get Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        return success

    def test_get_changes(self):
        """Test getting changes"""
        success, response = self.run_test(
            "Get Changes",
            "GET",
            "changes",
            200
        )
        return success

    def test_delete_competitor(self):
        """Test deleting a competitor"""
        if not self.competitor_id:
            print("❌ No competitor ID available for deletion")
            return False
            
        success, response = self.run_test(
            "Delete Competitor",
            "DELETE",
            f"competitors/{self.competitor_id}",
            200
        )
        return success

def main():
    # Setup
    tester = ScoperivalAPITester()
    
    # Test Authentication
    print("\n=== Testing Authentication ===")
    if not tester.test_register():
        print("❌ Registration failed, stopping tests")
        return 1
        
    if not tester.test_get_me():
        print("❌ Get current user failed")
    
    # Test login with a new instance
    login_tester = ScoperivalAPITester()
    login_tester.user_email = tester.user_email
    login_tester.user_password = tester.user_password
    
    if not login_tester.test_login():
        print("❌ Login failed")
    
    # Test Competitor Management
    print("\n=== Testing Competitor Management ===")
    if not tester.test_add_competitor():
        print("❌ Add competitor failed, stopping competitor tests")
    else:
        tester.test_discover_pages()
        tester.test_add_tracked_pages()
        tester.test_get_competitors()
    
    # Test Scanning and Analysis
    print("\n=== Testing Scanning and Analysis ===")
    if tester.competitor_id:
        tester.test_scan_competitor()
        
    # Test Dashboard and Analytics
    print("\n=== Testing Dashboard and Analytics ===")
    tester.test_get_dashboard_stats()
    tester.test_get_changes()
    
    # Test Deletion
    print("\n=== Testing Deletion ===")
    if tester.competitor_id:
        tester.test_delete_competitor()
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())