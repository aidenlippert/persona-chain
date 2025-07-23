#!/usr/bin/env python3
"""
Comprehensive debugging investigation of the credentials page issues
"""

import asyncio
from playwright.async_api import async_playwright
import json
from datetime import datetime
import sys

async def comprehensive_debug_investigation():
    """
    Perform a deep dive investigation of the credentials page issues
    """
    
    async with async_playwright() as p:
        # Launch browser with extended debugging options
        browser = await p.chromium.launch(
            headless=True,  # Set to True for CI/automation
            args=[
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--enable-logging',
                '--v=1'
            ]
        )
        
        # Create context with network monitoring
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        
        page = await context.new_page()
        
        # Storage for capturing all data
        debug_data = {
            'timestamp': datetime.now().isoformat(),
            'url': 'https://wallet-14mn5sesf-aiden-lipperts-projects.vercel.app/credentials',
            'console_logs': [],
            'network_requests': [],
            'errors': [],
            'dom_analysis': {},
            'performance_metrics': {},
            'page_state': {}
        }
        
        print("🔍 Starting comprehensive debugging investigation...")
        print(f"Target URL: {debug_data['url']}")
        print("=" * 80)
        
        # Set up event listeners for comprehensive monitoring
        
        # Console message handler
        def handle_console(msg):
            console_entry = {
                'timestamp': datetime.now().isoformat(),
                'type': msg.type,
                'text': msg.text,
                'location': str(msg.location) if hasattr(msg, 'location') and msg.location else None
            }
            debug_data['console_logs'].append(console_entry)
            
            # Print important console messages immediately
            if msg.type in ['error', 'warning']:
                print(f"🚨 CONSOLE {msg.type.upper()}: {msg.text}")
                if hasattr(msg, 'location') and msg.location:
                    print(f"   Location: {msg.location}")
        
        page.on('console', handle_console)
        
        # Network request handler
        def handle_request(request):
            request_data = {
                'timestamp': datetime.now().isoformat(),
                'method': request.method,
                'url': request.url,
                'headers': dict(request.headers),
                'resource_type': request.resource_type
            }
            debug_data['network_requests'].append(request_data)
            print(f"📡 REQUEST: {request.method} {request.url}")
        
        def handle_response(response):
            # Find corresponding request
            for req in debug_data['network_requests']:
                if req['url'] == response.url:
                    req.update({
                        'status': response.status,
                        'status_text': response.status_text,
                        'headers_response': dict(response.headers),
                        'ok': response.ok
                    })
                    break
            
            # Print failed requests immediately
            if not response.ok:
                print(f"❌ FAILED REQUEST: {response.status} {response.url}")
                print(f"   Status Text: {response.status_text}")
                
                # Check for MIME type issues
                content_type = response.headers.get('content-type', '')
                if response.url.endswith('.js') and 'javascript' not in content_type:
                    print(f"⚠️  MIME TYPE ISSUE: JS file served as {content_type}")
                elif response.url.endswith('.css') and 'css' not in content_type:
                    print(f"⚠️  MIME TYPE ISSUE: CSS file served as {content_type}")
        
        page.on('request', handle_request)
        page.on('response', handle_response)
        
        # Page error handler
        def handle_page_error(error):
            error_data = {
                'timestamp': datetime.now().isoformat(),
                'message': str(error),
                'type': 'page_error'
            }
            debug_data['errors'].append(error_data)
            print(f"🚨 PAGE ERROR: {error}")
        
        page.on('pageerror', handle_page_error)
        
        try:
            print("\n1️⃣ NAVIGATING TO CREDENTIALS PAGE...")
            print("-" * 50)
            
            # Navigate to the credentials page
            response = await page.goto(debug_data['url'], wait_until='networkidle', timeout=30000)
            
            print(f"✅ Initial navigation complete")
            print(f"   Status: {response.status}")
            print(f"   URL: {page.url}")
            
            # Wait a bit for any dynamic content
            await page.wait_for_timeout(3000)
            
            print("\n2️⃣ ANALYZING PAGE STATE...")
            print("-" * 50)
            
            # Capture page title and basic state
            title = await page.title()
            print(f"Page Title: {title}")
            
            # Check if error boundary is displayed
            error_boundary = await page.query_selector('[data-testid="error-boundary"], .error-boundary, [class*="error"]')
            if error_boundary:
                error_text = await error_boundary.text_content()
                print(f"🚨 ERROR BOUNDARY DETECTED: {error_text}")
                debug_data['page_state']['error_boundary'] = error_text
            
            # Check for specific error ID
            error_id_element = await page.query_selector('text=error_1752949879501_1luutf')
            if error_id_element:
                print(f"🎯 FOUND SPECIFIC ERROR ID: error_1752949879501_1luutf")
                debug_data['page_state']['specific_error_found'] = True
            
            # Capture DOM structure
            body_html = await page.evaluate('() => document.body.innerHTML')
            debug_data['dom_analysis']['body_length'] = len(body_html)
            debug_data['dom_analysis']['has_react_root'] = 'id="root"' in body_html
            
            # Check for React hydration
            react_elements = await page.query_selector_all('[data-reactroot], #root > *')
            debug_data['dom_analysis']['react_elements_count'] = len(react_elements)
            print(f"React elements found: {len(react_elements)}")
            
            print("\n3️⃣ TESTING JAVASCRIPT EXECUTION...")
            print("-" * 50)
            
            # Test basic JavaScript execution
            try:
                js_test = await page.evaluate('() => typeof window !== "undefined" && typeof document !== "undefined"')
                print(f"JavaScript execution: {'✅ Working' if js_test else '❌ Failed'}")
                debug_data['page_state']['js_execution'] = js_test
            except Exception as e:
                print(f"❌ JavaScript execution failed: {e}")
                debug_data['page_state']['js_execution'] = False
                debug_data['errors'].append({
                    'timestamp': datetime.now().isoformat(),
                    'message': f"JS execution test failed: {e}",
                    'type': 'js_execution_error'
                })
            
            # Check for React
            try:
                react_loaded = await page.evaluate('() => typeof window.React !== "undefined"')
                print(f"React loaded: {'✅ Yes' if react_loaded else '❌ No'}")
                debug_data['page_state']['react_loaded'] = react_loaded
            except Exception as e:
                print(f"React check failed: {e}")
                debug_data['page_state']['react_loaded'] = False
            
            print("\n4️⃣ NETWORK ANALYSIS SUMMARY...")
            print("-" * 50)
            
            # Analyze network requests
            failed_requests = [req for req in debug_data['network_requests'] if 'status' in req and not req.get('ok', True)]
            successful_requests = [req for req in debug_data['network_requests'] if 'status' in req and req.get('ok', True)]
            
            print(f"Total requests: {len(debug_data['network_requests'])}")
            print(f"Successful requests: {len(successful_requests)}")
            print(f"Failed requests: {len(failed_requests)}")
            
            if failed_requests:
                print("\n❌ FAILED REQUESTS:")
                for req in failed_requests:
                    print(f"   {req['status']} {req['url']}")
                    if 'headers_response' in req:
                        content_type = req['headers_response'].get('content-type', 'unknown')
                        print(f"      Content-Type: {content_type}")
            
            print("\n5️⃣ CONSOLE LOGS SUMMARY...")
            print("-" * 50)
            
            error_logs = [log for log in debug_data['console_logs'] if log['type'] == 'error']
            warning_logs = [log for log in debug_data['console_logs'] if log['type'] == 'warning']
            
            print(f"Total console messages: {len(debug_data['console_logs'])}")
            print(f"Errors: {len(error_logs)}")
            print(f"Warnings: {len(warning_logs)}")
            
            if error_logs:
                print("\n🚨 CONSOLE ERRORS:")
                for error in error_logs:
                    print(f"   {error['text']}")
                    if error['location']:
                        print(f"      Location: {error['location']}")
            
            print("\n6️⃣ TAKING SCREENSHOT FOR VISUAL ANALYSIS...")
            print("-" * 50)
            
            # Take screenshot
            screenshot_path = '/home/rocz/persona-chain/apps/wallet/debug_screenshot.png'
            await page.screenshot(path=screenshot_path, full_page=True)
            print(f"Screenshot saved: {screenshot_path}")
            
            print("\n7️⃣ FINAL ANALYSIS...")
            print("-" * 50)
            
            # Summary analysis
            summary = {
                'critical_issues': [],
                'warnings': [],
                'recommendations': []
            }
            
            # Check for critical issues
            if len(error_logs) > 0:
                summary['critical_issues'].append(f"{len(error_logs)} console errors detected")
            
            if len(failed_requests) > 0:
                summary['critical_issues'].append(f"{len(failed_requests)} failed network requests")
            
            if not debug_data['page_state'].get('js_execution', True):
                summary['critical_issues'].append("JavaScript execution failed")
            
            if debug_data['page_state'].get('error_boundary'):
                summary['critical_issues'].append("Error boundary activated")
            
            # Print summary
            print("CRITICAL ISSUES:")
            for issue in summary['critical_issues']:
                print(f"  ❌ {issue}")
            
            if not summary['critical_issues']:
                print("  ✅ No critical issues detected")
            
            # Save debug data
            debug_file = '/home/rocz/persona-chain/apps/wallet/debug_report.json'
            with open(debug_file, 'w') as f:
                json.dump(debug_data, f, indent=2, default=str)
            print(f"\nDebug data saved: {debug_file}")
            
            return debug_data, summary
            
        except Exception as e:
            print(f"❌ ERROR during investigation: {e}")
            debug_data['errors'].append({
                'timestamp': datetime.now().isoformat(),
                'message': str(e),
                'type': 'investigation_error'
            })
            return debug_data, {'critical_issues': [str(e)], 'warnings': [], 'recommendations': []}
        
        finally:
            await browser.close()

async def main():
    """Main execution function"""
    try:
        debug_data, summary = await comprehensive_debug_investigation()
        
        print("\n" + "=" * 80)
        print("🎯 INVESTIGATION COMPLETE")
        print("=" * 80)
        
        return 0
    except Exception as e:
        print(f"❌ Investigation failed: {e}")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)