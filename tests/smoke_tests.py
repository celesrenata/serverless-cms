#!/usr/bin/env python3
"""
Smoke tests to verify basic functionality after deployment.
Run after each deployment to ensure the system is operational.
"""

import argparse
import json
import sys
import requests
from typing import Dict, List

class SmokeTest:
    def __init__(self, environment: str):
        self.environment = environment
        self.api_base_url = self._get_api_url(environment)
        self.admin_url = self._get_admin_url(environment)
        self.public_url = self._get_public_url(environment)
        self.results: List[Dict] = []
    
    def _get_api_url(self, env: str) -> str:
        """Get API URL based on environment."""
        urls = {
            'dev': 'https://api-dev.your-domain.com/api/v1',
            'staging': 'https://api-staging.your-domain.com/api/v1',
            'prod': 'https://api.your-domain.com/api/v1',
        }
        return urls.get(env, urls['dev'])
    
    def _get_admin_url(self, env: str) -> str:
        """Get admin panel URL based on environment."""
        urls = {
            'dev': 'https://admin-dev.your-domain.com',
            'staging': 'https://admin-staging.your-domain.com',
            'prod': 'https://admin.your-domain.com',
        }
        return urls.get(env, urls['dev'])
    
    def _get_public_url(self, env: str) -> str:
        """Get public website URL based on environment."""
        urls = {
            'dev': 'https://dev.your-domain.com',
            'staging': 'https://staging.your-domain.com',
            'prod': 'https://www.your-domain.com',
        }
        return urls.get(env, urls['dev'])
    
    def test_api_health(self) -> bool:
        """Test if API is responding."""
        try:
            response = requests.get(f"{self.api_base_url}/health", timeout=10)
            success = response.status_code == 200
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
            response = requests.get(
                f"{self.api_base_url}/content",
                params={'type': 'post', 'status': 'published', 'limit': 5},
                timeout=10
            )
            success = response.status_code in [200, 404]  # 404 is ok if no content
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
            response = requests.get(self.admin_url, timeout=10)
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
            response = requests.get(self.public_url, timeout=10)
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
            response = requests.options(
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
    
    def run_all_tests(self) -> bool:
        """Run all smoke tests."""
        print(f"\n🔍 Running smoke tests for {self.environment} environment...\n")
        
        tests = [
            self.test_api_health,
            self.test_content_list,
            self.test_admin_panel_loads,
            self.test_public_website_loads,
            self.test_cors_headers,
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
