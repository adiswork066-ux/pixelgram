import requests
import sys
import json
from datetime import datetime

class InstagramAPITester:
    def __init__(self, base_url="https://insta-clone-1420.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.username = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_email = f"test_user_{datetime.now().strftime('%H%M%S')}@example.com"
        self.test_username = f"testuser{datetime.now().strftime('%H%M%S')}"
        self.test_password = "TestPass123!"

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")

    def make_request(self, method, endpoint, data=None, headers=None):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        request_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            request_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            request_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=request_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=request_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=request_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=request_headers, timeout=10)
            
            return response
        except requests.exceptions.RequestException as e:
            return None

    def test_user_registration(self):
        """Test user registration"""
        data = {
            "username": self.test_username,
            "email": self.test_user_email,
            "password": self.test_password
        }
        
        response = self.make_request('POST', '/api/auth/register', data)
        
        if response and response.status_code == 200:
            response_data = response.json()
            if 'access_token' in response_data and 'user' in response_data:
                self.token = response_data['access_token']
                self.user_id = response_data['user']['id']
                self.username = response_data['user']['username']
                self.log_test("User Registration", True)
                return True
            else:
                self.log_test("User Registration", False, "Missing token or user in response")
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else "No response"
            self.log_test("User Registration", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
        
        return False

    def test_user_login(self):
        """Test user login"""
        data = {
            "email": self.test_user_email,
            "password": self.test_password
        }
        
        response = self.make_request('POST', '/api/auth/login', data)
        
        if response and response.status_code == 200:
            response_data = response.json()
            if 'access_token' in response_data:
                self.token = response_data['access_token']
                self.log_test("User Login", True)
                return True
            else:
                self.log_test("User Login", False, "Missing token in response")
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else "No response"
            self.log_test("User Login", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
        
        return False

    def test_get_me(self):
        """Test getting current user info"""
        response = self.make_request('GET', '/api/auth/me')
        
        if response and response.status_code == 200:
            user_data = response.json()
            if 'id' in user_data and 'username' in user_data:
                self.log_test("Get Current User", True)
                return True
            else:
                self.log_test("Get Current User", False, "Missing user data")
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else "No response"
            self.log_test("Get Current User", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
        
        return False

    def test_user_search(self):
        """Test user search functionality"""
        response = self.make_request('GET', '/api/users/search?q=test')
        
        if response and response.status_code == 200:
            users = response.json()
            if isinstance(users, list):
                self.log_test("User Search", True)
                return True
            else:
                self.log_test("User Search", False, "Response is not a list")
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else "No response"
            self.log_test("User Search", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
        
        return False

    def test_get_user_profile(self):
        """Test getting user profile by ID"""
        if not self.user_id:
            self.log_test("Get User Profile", False, "No user ID available")
            return False
            
        response = self.make_request('GET', f'/api/users/{self.user_id}')
        
        if response and response.status_code == 200:
            profile = response.json()
            if 'id' in profile and 'followers_count' in profile:
                self.log_test("Get User Profile", True)
                return True
            else:
                self.log_test("Get User Profile", False, "Missing profile data")
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else "No response"
            self.log_test("Get User Profile", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
        
        return False

    def test_update_profile(self):
        """Test updating user profile"""
        data = {
            "bio": "Test bio for automated testing"
        }
        
        response = self.make_request('PUT', '/api/users/profile', data)
        
        if response and response.status_code == 200:
            updated_user = response.json()
            if updated_user.get('bio') == data['bio']:
                self.log_test("Update Profile", True)
                return True
            else:
                self.log_test("Update Profile", False, "Bio not updated")
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else "No response"
            self.log_test("Update Profile", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
        
        return False

    def test_create_post(self):
        """Test creating a post"""
        data = {
            "image": "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
            "caption": "Test post from automated testing"
        }
        
        response = self.make_request('POST', '/api/posts', data)
        
        if response and response.status_code == 200:
            post = response.json()
            if 'id' in post and 'image' in post:
                self.post_id = post['id']
                self.log_test("Create Post", True)
                return True
            else:
                self.log_test("Create Post", False, "Missing post data")
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else "No response"
            self.log_test("Create Post", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
        
        return False

    def test_get_posts(self):
        """Test getting posts feed"""
        response = self.make_request('GET', '/api/posts')
        
        if response and response.status_code == 200:
            posts = response.json()
            if isinstance(posts, list):
                self.log_test("Get Posts", True)
                return True
            else:
                self.log_test("Get Posts", False, "Response is not a list")
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else "No response"
            self.log_test("Get Posts", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
        
        return False

    def test_get_feed(self):
        """Test getting personalized feed"""
        response = self.make_request('GET', '/api/posts/feed')
        
        if response and response.status_code == 200:
            posts = response.json()
            if isinstance(posts, list):
                self.log_test("Get Feed", True)
                return True
            else:
                self.log_test("Get Feed", False, "Response is not a list")
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else "No response"
            self.log_test("Get Feed", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
        
        return False

    def test_like_post(self):
        """Test liking a post"""
        if not hasattr(self, 'post_id'):
            self.log_test("Like Post", False, "No post ID available")
            return False
            
        response = self.make_request('POST', f'/api/posts/{self.post_id}/like')
        
        if response and response.status_code == 200:
            like_data = response.json()
            if 'liked' in like_data and 'likes_count' in like_data:
                self.log_test("Like Post", True)
                return True
            else:
                self.log_test("Like Post", False, "Missing like data")
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else "No response"
            self.log_test("Like Post", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
        
        return False

    def test_create_comment(self):
        """Test creating a comment"""
        if not hasattr(self, 'post_id'):
            self.log_test("Create Comment", False, "No post ID available")
            return False
            
        data = {
            "text": "Test comment from automated testing"
        }
        
        response = self.make_request('POST', f'/api/posts/{self.post_id}/comments', data)
        
        if response and response.status_code == 200:
            comment = response.json()
            if 'id' in comment and 'text' in comment:
                self.comment_id = comment['id']
                self.log_test("Create Comment", True)
                return True
            else:
                self.log_test("Create Comment", False, "Missing comment data")
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else "No response"
            self.log_test("Create Comment", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
        
        return False

    def test_get_notifications(self):
        """Test getting notifications"""
        response = self.make_request('GET', '/api/notifications')
        
        if response and response.status_code == 200:
            notifications = response.json()
            if isinstance(notifications, list):
                self.log_test("Get Notifications", True)
                return True
            else:
                self.log_test("Get Notifications", False, "Response is not a list")
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else "No response"
            self.log_test("Get Notifications", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
        
        return False

    def test_get_conversations(self):
        """Test getting conversations"""
        response = self.make_request('GET', '/api/conversations')
        
        if response and response.status_code == 200:
            conversations = response.json()
            if isinstance(conversations, list):
                self.log_test("Get Conversations", True)
                return True
            else:
                self.log_test("Get Conversations", False, "Response is not a list")
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else "No response"
            self.log_test("Get Conversations", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
        
        return False

    def test_explore_posts(self):
        """Test explore/trending posts"""
        response = self.make_request('GET', '/api/explore')
        
        if response and response.status_code == 200:
            posts = response.json()
            if isinstance(posts, list):
                self.log_test("Explore Posts", True)
                return True
            else:
                self.log_test("Explore Posts", False, "Response is not a list")
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else "No response"
            self.log_test("Explore Posts", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
        
        return False

    def test_cloudinary_signature(self):
        """Test Cloudinary signature generation"""
        response = self.make_request('GET', '/api/cloudinary/signature?folder=posts')
        
        if response and response.status_code == 200:
            signature_data = response.json()
            if 'signature' in signature_data and 'cloud_name' in signature_data:
                self.log_test("Cloudinary Signature", True)
                return True
            else:
                self.log_test("Cloudinary Signature", False, "Missing signature data")
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else "No response"
            self.log_test("Cloudinary Signature", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
        
        return False

    def run_all_tests(self):
        """Run all API tests"""
        print(f"\n🚀 Starting Instagram Clone API Tests")
        print(f"Backend URL: {self.base_url}")
        print(f"Test User: {self.test_username} ({self.test_user_email})")
        print("-" * 50)

        # Authentication tests
        if not self.test_user_registration():
            print("❌ Registration failed, stopping tests")
            return self.get_results()

        # Test other endpoints with authenticated user
        self.test_get_me()
        self.test_user_search()
        self.test_get_user_profile()
        self.test_update_profile()
        self.test_create_post()
        self.test_get_posts()
        self.test_get_feed()
        self.test_like_post()
        self.test_create_comment()
        self.test_get_notifications()
        self.test_get_conversations()
        self.test_explore_posts()
        self.test_cloudinary_signature()

        return self.get_results()

    def get_results(self):
        """Get test results summary"""
        print("-" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        if success_rate >= 80:
            print(f"🎉 Success rate: {success_rate:.1f}% - Good!")
        elif success_rate >= 60:
            print(f"⚠️  Success rate: {success_rate:.1f}% - Needs improvement")
        else:
            print(f"🔴 Success rate: {success_rate:.1f}% - Major issues")

        return {
            'tests_run': self.tests_run,
            'tests_passed': self.tests_passed,
            'success_rate': success_rate,
            'user_created': bool(self.token)
        }

def main():
    tester = InstagramAPITester()
    results = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if results['success_rate'] >= 80 else 1

if __name__ == "__main__":
    sys.exit(main())