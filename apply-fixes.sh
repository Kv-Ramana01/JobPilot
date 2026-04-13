#!/bin/bash
# apply-fixes.sh - Run this from the root of your jobpilot project
# Usage: bash apply-fixes.sh /path/to/fixes/directory

FIXES_DIR="${1:-.}"

echo "Applying JobPilot TypeScript fixes..."

# 1. Fix notifications route
cp "$FIXES_DIR/notifications-route.ts" app/api/notifications/route.ts
echo "✅ Fixed app/api/notifications/route.ts"

# 2. Fix auto-apply route
cp "$FIXES_DIR/auto-apply-route.ts" app/api/applications/auto-apply/route.ts
echo "✅ Fixed app/api/applications/auto-apply/route.ts"

# 3. Fix playwright service
cp "$FIXES_DIR/playwright-apply.ts" services/playwright-apply.ts
echo "✅ Fixed services/playwright-apply.ts"

# 4. Fix actions/jobs.ts
cp "$FIXES_DIR/actions-jobs.ts" actions/jobs.ts
echo "✅ Fixed actions/jobs.ts"

# 5. Fix applications route
cp "$FIXES_DIR/applications-route.ts" app/api/applications/route.ts
echo "✅ Fixed app/api/applications/route.ts"

# 6. Fix application [id] route
cp "$FIXES_DIR/application-id-route.ts" app/api/applications/[id]/route.ts
echo "✅ Fixed app/api/applications/[id]/route.ts"

# 7. Fix cron route
cp "$FIXES_DIR/cron-route.ts" app/api/cron/route.ts
echo "✅ Fixed app/api/cron/route.ts"

# 8. Fix AI route
cp "$FIXES_DIR/ai-route.ts" app/api/ai/route.ts
echo "✅ Fixed app/api/ai/route.ts"

# 9. Fix jobs route
cp "$FIXES_DIR/jobs-route.ts" app/api/jobs/route.ts
echo "✅ Fixed app/api/jobs/route.ts"

# 10. Fix next.config.ts
cp "$FIXES_DIR/next.config.ts" next.config.ts
echo "✅ Fixed next.config.ts"

# 11. Fix seed.ts
cp "$FIXES_DIR/seed.ts" prisma/seed.ts
echo "✅ Fixed prisma/seed.ts"

echo ""
echo "All fixes applied! Now run:"
echo "  npm run build"