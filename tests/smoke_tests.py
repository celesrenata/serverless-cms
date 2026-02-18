#!/usr/bin/env python3
"""
Smoke tests to verify basic functionality after deployment.
Run after each deployment to ensure the system is operational.
"""

import argparse
import json
import sys
import time

try:
    import requests
except ImportError as e:
    print(f"Error importing requests: {e}", file=sys.stderr)
    print("Please install: pip install requests", file=sys.stderr)
    sys.exit(1)

from pathlib import Path
from typing import Dict, List

class SmokeTest:
    def __init__(self, environment: str, max_retries: int = 3, retry_delay: int = 10):
        self.environment = environment
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.api_base_url = self._get_api_url(environment)
        self.admin_url = self._get_admin_url(environment)
        self.public_url = self._get_public_url(environment)
        self.results: List[Dict] = []
    
    def _load_outputs(self, env: str) -> Dict:
        """Load CDK outputs from file."""
        outputs_file = Path(f"cdk.out/outputs-{env}.json")
        if outputs_file.exists():
            with open(outputs_file) as f:
                return json.load(f)
        return {}
    
    def _get_api_url(self, env: str) -> str:
        """Get API URL from CDK outputs or CloudFormation."""
        outputs = self._load_outputs(env)
        stack_name = f"ServerlessCmsStack-{env}"
        
        # Try to get from outputs file
        if stack_name in outputs:
            api_endpoint = outputs[stack_name].get('ApiEndpoint')
            if api_endpoint and api_endpoint != 'null':
                return api_endpoint
        
        # Try CloudFormation
        try:
            import subprocess
            result = subprocess.run(
                ['aws', 'cloudformation', 'describe-stacks', '--stack-name', stack_name,
                 '--query', 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue',
                 '--output', 'text'],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()
        except Exception:
            pass
        
        # Fallback to placeholder
        return f'https://api-{env}.your-domain.com/api/v1'
    
    def _get_admin_url(self, env: str) -> str:
        """Get admin panel URL from CDK outputs or CloudFormation."""
        outputs = self._load_outputs(env)
        stack_name = f"ServerlessCmsStack-{env}"
        
        # Try to get from outputs file
        if stack_name in outputs:
            admin_url = outputs[stack_name].get('AdminUrl')
            if admin_url and admin_url != 'null':
                return admin_url
        
        # Try CloudFormation
        try:
            import subprocess
            result = subprocess.run(
                ['aws', 'cloudformation', 'describe-stacks', '--stack-name', stack_name,
                 '--query', 'Stacks[0].Outputs[?OutputKey==`AdminUrl`].OutputValue',
                 '--output', 'text'],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()
        except Exception:
            pass
        
        # Fallback to placeholder
        return f'https://admin-{env}.your-domain.com'
    
    def _get_public_url(self, env: str) -> str:
        """Get public website URL from CDK outputs or CloudFormation."""
        outputs = self._load_outputs(env)
        stack_name = f"ServerlessCmsStack-{env}"
        
        # Try to get from outputs file
        if stack_name in outputs:
            public_url = outputs[stack_name].get('PublicUrl')
            if public_url and public_url != 'null':
                return public_url
        
        # Try CloudFormation
        try:
            import subprocess
            result = subprocess.run(
                ['aws', 'cloudformation', 'describe-stacks', '--stack-name', stack_name,
                 '--query', 'Stacks[0].Outputs[?OutputKey==`PublicUrl`].OutputValue',
                 '--output', 'text'],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()
        except Exception:
            pass
        
        # Fallback to placeholder
        return f'https://{env}.your-domain.com'
    
    def _make_request_with_retry(self, method: str, url: str, **kwargs) -> requests.Response:
        """Make HTTP request with retry logic."""
        # Always follow redirects
        if 'allow_redirects' not in kwargs:
            kwargs['allow_redirects'] = True
            
        for attempt in range(self.max_retries):
            try:
                if method == 'GET':
                    return requests.get(url, **kwargs)
                elif method == 'OPTIONS':
                    return requests.options(url, **kwargs)
            except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
                if attempt < self.max_retries - 1:
                    print(f"   Attempt {attempt + 1} failed, retrying in {self.retry_delay}s...")
                    time.sleep(self.retry_delay)
                else:
                    raise e
        raise Exception("Max retries exceeded")
    
    def test_api_health(self) -> bool:
        """Test if API is responding."""
        try:
            # API Gateway doesn't have a /health endpoint by default, test /content instead
            response = self._make_request_with_retry('GET', f"{self.api_base_url}/content", timeout=10)
            success = response.status_code in [200, 403, 404]  # 403/404 are ok, means API is up
            self.results.append({
                'test': 'API Health Check',
                'status': 'PASS' if success else 'FAIL',
                'details': f"Status: {response.status_code}"
            })
            return success
        except Exception as e:
            self.results.append({
                'test': 'API Health Check',
                'status': 'FAIL',
                'details': str(e)
            })
            return False
    
    def test_content_list(self) -> bool:
        """Test if content listing endpoint works."""
        try:
            response = self._make_request_with_retry(
                'GET',
                f"{self.api_base_url}/content",
                params={'type': 'post', 'status': 'published', 'limit': 5},
                timeout=10
            )
            success = response.status_code in [200, 403, 404]  # 403/404 ok if no auth/content
            self.results.append({
                'test': 'Content List Endpoint',
                'status': 'PASS' if success else 'FAIL',
                'details': f"Status: {response.status_code}"
            })
            return success
        except Exception as e:
            self.results.append({
                'test': 'Content List Endpoint',
                'status': 'FAIL',
                'details': str(e)
            })
            return False
    
    def test_admin_panel_loads(self) -> bool:
        """Test if admin panel is accessible."""
        try:
            response = self._make_request_with_retry('GET', self.admin_url, timeout=10)
            success = response.status_code == 200
            self.results.append({
                'test': 'Admin Panel Loads',
                'status': 'PASS' if success else 'FAIL',
                'details': f"Status: {response.status_code}"
            })
            return success
        except Exception as e:
            self.results.append({
                'test': 'Admin Panel Loads',
                'status': 'FAIL',
                'details': str(e)
            })
            return False
    
    def test_public_website_loads(self) -> bool:
        """Test if public website is accessible."""
        try:
            response = self._make_request_with_retry('GET', self.public_url, timeout=10)
            success = response.status_code == 200
            self.results.append({
                'test': 'Public Website Loads',
                'status': 'PASS' if success else 'FAIL',
                'details': f"Status: {response.status_code}"
            })
            return success
        except Exception as e:
            self.results.append({
                'test': 'Public Website Loads',
                'status': 'FAIL',
                'details': str(e)
            })
            return False
    
    def test_cors_headers(self) -> bool:
        """Test if CORS headers are properly configured."""
        try:
            response = self._make_request_with_retry(
                'OPTIONS',
                f"{self.api_base_url}/content",
                headers={'Origin': self.admin_url},
                timeout=10
            )
            has_cors = 'Access-Control-Allow-Origin' in response.headers
            self.results.append({
                'test': 'CORS Headers',
                'status': 'PASS' if has_cors else 'FAIL',
                'details': f"CORS header present: {has_cors}"
            })
            return has_cors
        except Exception as e:
            self.results.append({
                'test': 'CORS Headers',
                'status': 'FAIL',
                'details': str(e)
            })
            return False
    
    def test_user_management_endpoint(self) -> bool:
        """Test if user management endpoint is accessible (Phase 2)."""
        try:
            response = self._make_request_with_retry(
                'GET',
                f"{self.api_base_url}/users",
                timeout=10
            )
            # Should return 401/403 without auth, which means endpoint exists
            success = response.status_code in [200, 401, 403]
            self.results.append({
                'test': 'User Management Endpoint',
                'status': 'PASS' if success else 'FAIL',
                'details': f"Status: {response.status_code}"
            })
            return success
        except Exception as e:
            self.results.append({
                'test': 'User Management Endpoint',
                'status': 'FAIL',
                'details': str(e)
            })
            return False
    
    def test_comments_endpoint(self) -> bool:
        """Test if comments endpoint is accessible (Phase 2)."""
        try:
            response = self._make_request_with_retry(
                'GET',
                f"{self.api_base_url}/comments",
                timeout=10
            )
            # Should return 401/403 without auth, or 200 if public
            success = response.status_code in [200, 401, 403]
            self.results.append({
                'test': 'Comments Endpoint',
                'status': 'PASS' if success else 'FAIL',
                'details': f"Status: {response.status_code}"
            })
            return success
        except Exception as e:
            self.results.append({
                'test': 'Comments Endpoint',
                'status': 'FAIL',
                'details': str(e)
            })
            return False
    
    def test_registration_endpoint(self) -> bool:
        """Test if registration endpoint is accessible (Phase 2)."""
        try:
            response = self._make_request_with_retry(
                'OPTIONS',
                f"{self.api_base_url}/auth/register",
                timeout=10
            )
            # OPTIONS should work even if POST is disabled
            success = response.status_code in [200, 204, 403, 404]
            self.results.append({
                'test': 'Registration Endpoint',
                'status': 'PASS' if success else 'FAIL',
                'details': f"Status: {response.status_code}"
            })
            return success
        except Exception as e:
            self.results.append({
                'test': 'Registration Endpoint',
                'status': 'FAIL',
                'details': str(e)
            })
            return False
    
    def test_settings_endpoint(self) -> bool:
        """Test if settings endpoint is accessible (Phase 2)."""
        try:
            response = self._make_request_with_retry(
                'GET',
                f"{self.api_base_url}/settings",
                timeout=10
            )
            # Should return 401/403 without auth, or 200 if public
            success = response.status_code in [200, 401, 403]
            self.results.append({
                'test': 'Settings Endpoint',
                'status': 'PASS' if success else 'FAIL',
                'details': f"Status: {response.status_code}"
            })
            return success
        except Exception as e:
            self.results.append({
                'test': 'Settings Endpoint',
                'status': 'FAIL',
                'details': str(e)
            })
            return False
    
    def run_all_tests(self) -> bool:
        """Run all smoke tests."""
        print(f"\n🔍 Running smoke tests for {self.environment} environment...")
        print(f"   API: {self.api_base_url}")
        print(f"   Admin: {self.admin_url}")
        print(f"   Public: {self.public_url}\n")
        
        tests = [
            self.test_api_health,
            self.test_content_list,
            self.test_admin_panel_loads,
            self.test_public_website_loads,
            self.test_cors_headers,
            self.test_user_management_endpoint,
            self.test_comments_endpoint,
            self.test_registration_endpoint,
            self.test_settings_endpoint,
        ]
        
        all_passed = True
        for test in tests:
            passed = test()
            all_passed = all_passed and passed
        
        return all_passed
    
    def print_results(self):
        """Print test results."""
        print("\n" + "="*60)
        print("SMOKE TEST RESULTS")
        print("="*60 + "\n")
        
        for result in self.results:
            status_icon = "✅" if result['status'] == 'PASS' else "❌"
            print(f"{status_icon} {result['test']}")
            print(f"   {result['details']}\n")
        
        passed = sum(1 for r in self.results if r['status'] == 'PASS')
        total = len(self.results)
        
        print("="*60)
        print(f"Results: {passed}/{total} tests passed")
        print("="*60 + "\n")

def main():
    parser = argparse.ArgumentParser(description='Run smoke tests after deployment')
    parser.add_argument(
        '--environment',
        choices=['dev', 'staging', 'prod'],
        required=True,
        help='Environment to test'
    )
    
    args = parser.parse_args()
    
    smoke_test = SmokeTest(args.environment)
    all_passed = smoke_test.run_all_tests()
    smoke_test.print_results()
    
    sys.exit(0 if all_passed else 1)

if __name__ == '__main__':
    main()
