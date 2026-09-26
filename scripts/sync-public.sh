#!/usr/bin/env bash
# ==============================================================================
# Sync Script: Private Repository -> Public Showcase Repository
# Private: https://github.com/maoroch/air_satpayev.git
# Public:  https://github.com/maoroch/air-satpayev-iot-platform.git
# ==============================================================================

set -euo pipefail

PUBLIC_REMOTE="public"
PUBLIC_REPO_URL="https://github.com/maoroch/air-satpayev-iot-platform.git"
SHOWCASE_BRANCH="showcase"

echo "============================================================"
echo "🚀 Air Satpayev: Syncing to Public Showcase Repository"
echo "============================================================"

# 1. Verify we are inside a git repository
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "❌ Error: Not inside a git repository."
    exit 1
fi

# 2. Ensure public remote is properly configured
if ! git remote get-url "$PUBLIC_REMOTE" >/dev/null 2>&1; then
    echo "🔗 Adding git remote '$PUBLIC_REMOTE' -> $PUBLIC_REPO_URL"
    git remote add "$PUBLIC_REMOTE" "$PUBLIC_REPO_URL"
else
    echo "✓ Remote '$PUBLIC_REMOTE' configured: $(git remote get-url $PUBLIC_REMOTE)"
fi

# 3. Check for uncommitted working tree changes
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "⚠️ Warning: You have uncommitted changes in your working tree."
    echo "Please commit your changes to your private repo before syncing:"
    echo "   git add ."
    echo "   git commit -m 'your message'"
    exit 1
fi

# 4. Remember original branch
CURRENT_BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "main")
echo "📌 Current private branch: $CURRENT_BRANCH"

# 5. Create / reset showcase branch from current branch
echo "📦 Switching to '$SHOWCASE_BRANCH' branch for showcase packaging..."
git checkout -B "$SHOWCASE_BRANCH" "$CURRENT_BRANCH"

# 6. Swap README with English Portfolio Case Study
if [ -f "README.showcase.md" ]; then
    echo "📄 Applying English Portfolio Case Study (README.showcase.md -> README.md)..."
    cp README.showcase.md README.md
    git add README.md
    git commit -m "docs(showcase): sync latest codebase with English portfolio case study" --allow-empty
else
    echo "⚠️ Warning: README.showcase.md not found, using existing README.md"
fi

# 7. Push to public repository main branch
echo "🌐 Pushing showcase branch to $PUBLIC_REMOTE:main..."
git push "$PUBLIC_REMOTE" "$SHOWCASE_BRANCH:main" --force

# 8. Return to original branch
echo "↩️ Switching back to original branch '$CURRENT_BRANCH'..."
git checkout "$CURRENT_BRANCH"

echo ""
echo "============================================================"
echo "🎉 Showcase synchronized successfully!"
echo "Public repository: https://github.com/maoroch/air-satpayev-iot-platform"
echo "============================================================"
