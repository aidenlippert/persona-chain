#!/usr/bin/env python3
import asyncio
from playwright.async_api import async_playwright
import json
from datetime import datetime
import sys

async def analyze_wallet_errors():
    async with async_playwright() as p:
        # Launch browser with developer tools
        browser = await p.chromium.launch(
            headless=False,
            args=['--disable-web-security', '--disable-features=VizDisplayCompositor'],
        )
        
        page = await browser.new_page()
        
        # Collect all console messages
        console_messages = []
        network_failures = []
        js_errors = []
        
        # Set up console listener
        def handle_console(msg):
            console_messages.append({
                'type': msg.type,
                'text': msg.text,
                'location': msg.location if hasattr(msg, 'location') else None,
                'timestamp': datetime.now().isoformat()
            })
            print(f"🟡 Console [{msg.type}]: {msg.text}")
        
        # Set up page error listener
        def handle_page_error(error):
            js_errors.append({
                'message': str(error),
                'timestamp': datetime.now().isoformat()
            })
            print(f"🔴 Page Error: {error}")
        
        # Set up network failure listener
        def handle_response(response):
            if not response.ok:
                network_failures.append({
                    'url': response.url,
                    'status': response.status,
                    'statusText': response.status_text,
                    'timestamp': datetime.now().isoformat()
                })
                print(f"🌐 Network Failure: {response.status} {response.url}")
        
        page.on('console', handle_console)
        page.on('pageerror', handle_page_error)
        page.on('response', handle_response)
        
        print("🚀 Navigating to credentials page...")
        
        try:
            # Navigate to the credentials page
            await page.goto('https://wallet-oojl75o98-aiden-lipperts-projects.vercel.app/credentials', 
                           wait_until='networkidle', timeout=30000)
            
            # Wait for potential React errors to surface
            await page.wait_for_timeout(3000)
            
            print("📸 Taking screenshot...")
            await page.screenshot(path='/home/rocz/persona-chain/apps/wallet/wallet-error-analysis.png')
            
            # Check for "Something went wrong" text in DOM
            something_went_wrong_elements = await page.locator('text="Something went wrong"').all()
            
            print(f"🔍 Found {len(something_went_wrong_elements)} 'Something went wrong' messages")
            
            error_details = []
            for i, element in enumerate(something_went_wrong_elements):
                try:
                    # Get the element's text content and surrounding context
                    text = await element.text_content()
                    parent = element.locator('..')
                    parent_html = await parent.inner_html()
                    
                    error_details.append({
                        'index': i,
                        'text': text,
                        'parent_html': parent_html[:500] + '...' if len(parent_html) > 500 else parent_html
                    })
                    
                    print(f"📍 Error message {i+1}:")
                    print(f"   Text: {text}")
                    print(f"   Parent HTML: {parent_html[:200]}...")
                    
                except Exception as e:
                    print(f"❌ Could not analyze error element {i}: {e}")
            
            # Check for React Error Boundary components
            error_boundary_elements = await page.locator('[data-testid*="error"], [class*="error"], [class*="Error"]').all()
            print(f"🛡️ Found {len(error_boundary_elements)} potential error boundary elements")
            
            # Check React DevTools if available
            try:
                react_errors = await page.evaluate("""
                    () => {
                        // Try to access React DevTools or React Fiber
                        const rootElement = document.querySelector('#root') || document.querySelector('#__next');
                        if (rootElement && rootElement._reactInternalFiber) {
                            return 'React Fiber detected';
                        }
                        if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
                            return 'React DevTools detected';
                        }
                        return 'No React debugging info available';
                    }
                """)
                print(f"⚛️  React Debug Info: {react_errors}")
            except Exception as e:
                print(f"⚛️  React Debug Check Failed: {e}")
            
            # Get all error-related elements in the DOM
            error_text_elements = await page.locator('text=/error|Error|failed|Failed|wrong|Wrong/i').all()
            print(f"🔎 Found {len(error_text_elements)} elements containing error-related text")
            
            for i, element in enumerate(error_text_elements[:5]):  # Limit to first 5
                try:
                    text = await element.text_content()
                    if text and 'something went wrong' in text.lower():
                        tag_name = await element.evaluate('el => el.tagName')
                        class_name = await element.get_attribute('class') or ''
                        print(f"   📌 Error Element {i+1}: <{tag_name}> class='{class_name}' text='{text[:100]}...'")
                except Exception as e:
                    print(f"   ❌ Could not analyze error text element {i}: {e}")
            
            # Check the DOM structure around error messages
            if something_went_wrong_elements:
                print("\n🔬 DETAILED DOM ANALYSIS:")
                for i, element in enumerate(something_went_wrong_elements):
                    try:
                        # Get component hierarchy
                        hierarchy = await element.evaluate("""
                            (el) => {
                                const path = [];
                                let current = el;
                                while (current && current !== document.body) {
                                    const info = {
                                        tagName: current.tagName,
                                        className: current.className,
                                        id: current.id,
                                        dataTestId: current.getAttribute('data-testid')
                                    };
                                    path.push(info);
                                    current = current.parentElement;
                                }
                                return path;
                            }
                        """)
                        
                        print(f"   Component hierarchy for error {i+1}:")
                        for level, comp in enumerate(hierarchy[:5]):  # Show first 5 levels
                            indent = "    " * (level + 1)
                            test_id = f" data-testid='{comp['dataTestId']}'" if comp['dataTestId'] else ""
                            class_attr = f" class='{comp['className']}'" if comp['className'] else ""
                            id_attr = f" id='{comp['id']}'" if comp['id'] else ""
                            print(f"{indent}<{comp['tagName']}{id_attr}{class_attr}{test_id}>")
                            
                    except Exception as e:
                        print(f"   ❌ Could not analyze hierarchy for error {i}: {e}")
            
            # Wait a bit more to catch any delayed errors
            await page.wait_for_timeout(2000)
            
        except Exception as e:
            print(f"❌ Navigation failed: {e}")
        
        # Analyze collected data
        print("\n" + "="*60)
        print("📊 ERROR ANALYSIS SUMMARY")
        print("="*60)
        
        print(f"\n🟡 CONSOLE MESSAGES ({len(console_messages)} total):")
        for msg in console_messages:
            if 'error' in msg['type'].lower() or 'invalid' in msg['text'].lower() or 'token' in msg['text'].lower():
                print(f"   [{msg['type']}] {msg['text']}")
        
        print(f"\n🔴 JAVASCRIPT ERRORS ({len(js_errors)} total):")
        for error in js_errors:
            print(f"   {error['message']}")
        
        print(f"\n🌐 NETWORK FAILURES ({len(network_failures)} total):")
        for failure in network_failures:
            print(f"   {failure['status']} {failure['url']}")
        
        print(f"\n📍 ERROR UI ELEMENTS ({len(error_details)} total):")
        for detail in error_details:
            print(f"   Element {detail['index'] + 1}: {detail['text']}")
        
        # Final recommendations
        print("\n" + "="*60)
        print("💡 RECOMMENDATIONS")
        print("="*60)
        
        # Analyze patterns
        suppressed_errors = [msg for msg in console_messages if 'suppressed' in msg['text'].lower()]
        genuine_errors = [msg for msg in console_messages if msg['type'] == 'error' and 'suppressed' not in msg['text'].lower()]
        
        print(f"\n✅ Suppressed Errors: {len(suppressed_errors)}")
        print(f"🚨 Genuine Errors: {len(genuine_errors)}")
        
        if genuine_errors:
            print("\n🎯 GENUINE ERRORS TO INVESTIGATE:")
            for error in genuine_errors:
                print(f"   - {error['text']}")
        
        if len(error_details) > 0 and len(genuine_errors) == 0:
            print("\n🤔 ANALYSIS: 'Something went wrong' appears despite no genuine errors")
            print("   This suggests the ErrorBoundary is triggering even for suppressed errors")
            print("   Recommendation: Modify ErrorBoundary to not show UI for suppressed errors")
        
        if network_failures:
            print("\n🌐 NETWORK ISSUES DETECTED:")
            for failure in network_failures:
                print(f"   - {failure['status']} {failure['url']}")
        
        # Check if it's specifically our ErrorBoundary
        error_boundary_analysis = []
        if something_went_wrong_elements:
            print("\n🛡️ ERROR BOUNDARY ANALYSIS:")
            print("   Checking if 'Something went wrong' comes from our ErrorBoundary component...")
            
        await browser.close()
        
        return {
            'console_messages': console_messages,
            'js_errors': js_errors,
            'network_failures': network_failures,
            'error_ui_count': len(error_details),
            'suppressed_count': len(suppressed_errors),
            'genuine_error_count': len(genuine_errors)
        }

if __name__ == "__main__":
    # Run the analysis
    result = asyncio.run(analyze_wallet_errors())
    print(f"\n📈 Final Stats: {result['genuine_error_count']} genuine errors, {result['suppressed_count']} suppressed, {result['error_ui_count']} UI error messages")