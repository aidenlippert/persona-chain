#!/bin/bash

echo "🔍 PersonaPass Connector Status Check"
echo "===================================="
echo ""

# Check if services are running
echo "📡 Service Status:"
for port in 3000 3001 3002 3004; do
  if lsof -i:$port > /dev/null 2>&1; then
    case $port in
      3000) echo "   Dashboard:  ✅ Running on http://localhost:3000" ;;
      3001) echo "   GitHub:     ✅ Running on http://localhost:3001" ;;
      3002) echo "   LinkedIn:   ✅ Running on http://localhost:3002" ;;
      3004) echo "   Plaid:      ✅ Running on http://localhost:3004" ;;
    esac
  else
    case $port in
      3000) echo "   Dashboard:  ❌ Not running" ;;
      3001) echo "   GitHub:     ❌ Not running" ;;
      3002) echo "   LinkedIn:   ❌ Not running" ;;
      3004) echo "   Plaid:      ❌ Not running" ;;
    esac
  fi
done

echo ""
echo "🔧 Required OAuth App Updates:"
echo ""
echo "1. GitHub OAuth App:"
echo "   - Go to: https://github.com/settings/developers"
echo "   - Update Authorization callback URL to: http://localhost:3001/callback"
echo ""
echo "2. LinkedIn OAuth App:"
echo "   - Go to: https://www.linkedin.com/developers/apps"
echo "   - Add to Authorized redirect URLs: http://localhost:3002/callback"
echo ""
echo "3. Plaid: ✅ No changes needed (sandbox mode)"
echo ""
echo "📝 After updating OAuth apps, restart the connectors:"
echo "   ./run-all-connectors-v2.sh"
echo ""