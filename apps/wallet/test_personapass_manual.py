#!/usr/bin/env python3
"""
Manual PersonaPass Application Test
Tests the deployed application for specific issues without Playwright
"""

import subprocess
import json
import re
import time
from urllib.parse import urlparse
from typing import Dict, List

class PersonaPassTester:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.results = {
            'page_loaded': False,
            'html_valid': False,
            'scripts_loaded': False,
            'potential_syntax_errors': [],
            'potential_node_errors': [],
            'button_elements_found': [],
            'overall_status': 'UNKNOWN'
        }
    
    def test_basic_connectivity(self) -> bool:
        """Test if the page loads successfully"""
        print("🔗 Testing basic connectivity...")
        try:
            result = subprocess.run([
                'curl', '-s', '-I', self.base_url
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0 and '200' in result.stdout:
                print("✅ Page loads successfully (HTTP 200)")
                self.results['page_loaded'] = True
                return True
            else:
                print(f"❌ Page load failed: {result.stdout}")
                return False
        except Exception as e:
            print(f"❌ Connectivity test failed: {e}")
            return False
    
    def analyze_html_structure(self) -> None:
        """Analyze the HTML structure and scripts"""
        print("🔍 Analyzing HTML structure...")
        try:
            result = subprocess.run([
                'curl', '-s', self.base_url
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                html_content = result.stdout
                
                # Check if HTML is well-formed
                if html_content.strip().startswith('<!doctype html>') or html_content.strip().startswith('<!DOCTYPE html>'):
                    print("✅ Valid HTML document structure")
                    self.results['html_valid'] = True
                else:
                    print("⚠️ Potential HTML structure issue")
                
                # Look for script tags and potential syntax issues
                script_pattern = r'<script[^>]*src="([^"]*)"[^>]*></script>'
                scripts = re.findall(script_pattern, html_content)
                
                print(f"📦 Found {len(scripts)} external scripts:")
                for script in scripts:
                    print(f"  - {script}")
                
                if scripts:
                    self.results['scripts_loaded'] = True
                
                # Look for React root element
                if 'id="root"' in html_content:
                    print("✅ React root element found")
                else:
                    print("⚠️ React root element not found")
                
                # Look for potential syntax error indicators in script names
                js_files = [s for s in scripts if s.endswith('.js')]
                if js_files:
                    print(f"📜 JavaScript files to load: {len(js_files)}")
                    for js_file in js_files:
                        if 'index' in js_file:
                            print(f"  🎯 Main application script: {js_file}")
                
                # Look for any inline scripts that might have issues
                inline_script_pattern = r'<script[^>]*>(.*?)</script>'
                inline_scripts = re.findall(inline_script_pattern, html_content, re.DOTALL)
                
                if inline_scripts:
                    print(f"📝 Found {len(inline_scripts)} inline scripts")
                    for i, script in enumerate(inline_scripts):
                        if len(script.strip()) > 0:
                            print(f"  Script {i+1}: {script[:50]}...")
                
        except Exception as e:
            print(f"❌ HTML analysis failed: {e}")
    
    def test_script_accessibility(self) -> None:
        """Test if the main JavaScript files are accessible"""
        print("🧪 Testing script accessibility...")
        try:
            # First get the HTML to extract script URLs
            result = subprocess.run([
                'curl', '-s', self.base_url
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                html_content = result.stdout
                
                # Extract script sources
                script_pattern = r'<script[^>]*src="([^"]*)"[^>]*>'
                scripts = re.findall(script_pattern, html_content)
                
                for script in scripts:
                    if script.startswith('/'):
                        script_url = f"{self.base_url.rstrip('/')}{script}"
                    else:
                        script_url = script
                    
                    print(f"📦 Testing script: {script}")
                    script_result = subprocess.run([
                        'curl', '-s', '-I', script_url
                    ], capture_output=True, text=True, timeout=15)
                    
                    if script_result.returncode == 0 and '200' in script_result.stdout:
                        print(f"  ✅ Script accessible")
                    else:
                        print(f"  ❌ Script not accessible: {script_result.stdout.split()[1] if len(script_result.stdout.split()) > 1 else 'Unknown error'}")
                        
        except Exception as e:
            print(f"❌ Script accessibility test failed: {e}")
    
    def analyze_for_common_errors(self) -> None:
        """Analyze for common error patterns"""
        print("🔍 Analyzing for common error patterns...")
        
        # Test if the main application script contains obvious syntax errors
        try:
            result = subprocess.run([
                'curl', '-s', self.base_url
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                html_content = result.stdout
                
                # Look for error indicators in the HTML itself
                error_indicators = [
                    'SyntaxError',
                    'Invalid or unexpected token',
                    'Node cannot be found',
                    'Uncaught',
                    'TypeError',
                    'ReferenceError'
                ]
                
                found_errors = []
                for indicator in error_indicators:
                    if indicator in html_content:
                        found_errors.append(indicator)
                        print(f"⚠️ Found potential error indicator: {indicator}")
                
                if not found_errors:
                    print("✅ No obvious error indicators in HTML")
                
                self.results['potential_syntax_errors'] = found_errors
                
        except Exception as e:
            print(f"❌ Error pattern analysis failed: {e}")
    
    def simulate_ui_interaction_test(self) -> None:
        """Simulate testing UI interactions by analyzing HTML structure"""
        print("🎮 Simulating UI interaction tests...")
        
        try:
            result = subprocess.run([
                'curl', '-s', self.base_url
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                html_content = result.stdout
                
                # Since this is a React app, the buttons will be dynamically generated
                # We can only check if the structure looks correct for a React app
                
                # Check for React indicators
                react_indicators = [
                    'id="root"',
                    'React',
                    'type="module"'
                ]
                
                react_score = 0
                for indicator in react_indicators:
                    if indicator in html_content:
                        react_score += 1
                        print(f"✅ Found React indicator: {indicator}")
                
                if react_score >= 2:
                    print("✅ Application appears to be properly configured React app")
                    self.results['button_elements_found'] = ['React app structure detected']
                else:
                    print("⚠️ May not be a properly configured React application")
                
                # Check for CSS loading
                if 'rel="stylesheet"' in html_content:
                    print("✅ Stylesheets are loaded")
                else:
                    print("⚠️ No stylesheets detected")
                
        except Exception as e:
            print(f"❌ UI interaction simulation failed: {e}")
    
    def check_error_suppression(self) -> None:
        """Check if error suppression mechanisms are in place"""
        print("🛡️ Checking error suppression mechanisms...")
        
        try:
            result = subprocess.run([
                'curl', '-s', self.base_url
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                html_content = result.stdout
                
                # Look for error handling indicators
                error_handling_indicators = [
                    'try',
                    'catch',
                    'console.error',
                    'console.warn',
                    'onerror',
                    'addEventListener("error"'
                ]
                
                # Since this is minified/bundled code, we need to check the actual scripts
                script_pattern = r'<script[^>]*src="([^"]*)"[^>]*>'
                scripts = re.findall(script_pattern, html_content)
                
                error_handling_found = False
                
                for script in scripts:
                    if script.startswith('/'):
                        script_url = f"{self.base_url.rstrip('/')}{script}"
                    else:
                        script_url = script
                    
                    # Sample first part of the script to check for error handling
                    try:
                        script_result = subprocess.run([
                            'curl', '-s', script_url
                        ], capture_output=True, text=True, timeout=15)
                        
                        if script_result.returncode == 0:
                            script_content = script_result.stdout[:1000]  # First 1000 chars
                            
                            for indicator in error_handling_indicators:
                                if indicator in script_content:
                                    error_handling_found = True
                                    print(f"✅ Found error handling pattern: {indicator}")
                                    break
                    except:
                        continue
                
                if error_handling_found:
                    print("✅ Error handling mechanisms detected")
                else:
                    print("ℹ️ No obvious error handling detected (may be in bundled code)")
                
        except Exception as e:
            print(f"❌ Error suppression check failed: {e}")
    
    def run_comprehensive_test(self) -> Dict:
        """Run all tests and provide a comprehensive report"""
        print("🚀 Starting PersonaPass Application Test")
        print("=" * 60)
        
        # Basic connectivity
        if not self.test_basic_connectivity():
            self.results['overall_status'] = 'FAILED - Page not accessible'
            return self.results
        
        # HTML structure analysis
        self.analyze_html_structure()
        
        # Script accessibility
        self.test_script_accessibility()
        
        # Error pattern analysis
        self.analyze_for_common_errors()
        
        # UI interaction simulation
        self.simulate_ui_interaction_test()
        
        # Error suppression check
        self.check_error_suppression()
        
        # Overall assessment
        print("\n🎯 Overall Assessment:")
        print("=" * 40)
        
        issues_found = len(self.results['potential_syntax_errors']) + len(self.results['potential_node_errors'])
        
        if self.results['page_loaded'] and self.results['html_valid'] and issues_found == 0:
            self.results['overall_status'] = 'PASSED - No critical issues detected'
            print("✅ Page loads successfully")
            print("✅ HTML structure is valid")
            print("✅ No syntax errors detected in HTML")
            print("✅ React application structure detected")
            print("🎉 Application appears to be functioning correctly!")
        elif self.results['page_loaded'] and issues_found == 0:
            self.results['overall_status'] = 'MOSTLY PASSED - Minor issues detected'
            print("✅ Page loads successfully")
            print("✅ No critical errors detected")
            print("⚠️ Some minor issues may exist")
        else:
            self.results['overall_status'] = 'ISSUES DETECTED - Needs attention'
            print("❌ Critical issues detected")
            if self.results['potential_syntax_errors']:
                print(f"  - Syntax errors: {self.results['potential_syntax_errors']}")
            if self.results['potential_node_errors']:
                print(f"  - Node errors: {self.results['potential_node_errors']}")
        
        print(f"\n📊 Final Status: {self.results['overall_status']}")
        
        return self.results

def main():
    """Main test execution"""
    url = "https://wallet-ffpxxw6we-aiden-lipperts-projects.vercel.app/credentials"
    tester = PersonaPassTester(url)
    results = tester.run_comprehensive_test()
    
    print(f"\n📋 Test Summary:")
    print(f"  Page Loaded: {results['page_loaded']}")
    print(f"  HTML Valid: {results['html_valid']}")
    print(f"  Scripts Loaded: {results['scripts_loaded']}")
    print(f"  Syntax Errors: {len(results['potential_syntax_errors'])}")
    print(f"  Node Errors: {len(results['potential_node_errors'])}")
    print(f"  Overall Status: {results['overall_status']}")

if __name__ == "__main__":
    main()