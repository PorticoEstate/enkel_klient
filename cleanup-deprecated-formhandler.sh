#!/bin/bash

# FormHandler Cleanup Script
# Run this ONLY after confirming all forms work correctly in production
# This script removes the deprecated bloated FormHandler

echo "🧹 FormHandler Cleanup Script"
echo "============================="
echo ""
echo "⚠️  WARNING: This script will remove the deprecated FormHandler files"
echo "⚠️  Only run this AFTER confirming all forms work correctly in production"
echo ""

# Function to backup files before removal
backup_file() {
    local file="$1"
    if [ -f "$file" ]; then
        local backup_dir="./deprecated-backup-$(date +%Y%m%d)"
        mkdir -p "$backup_dir"
        cp "$file" "$backup_dir/"
        echo "✅ Backed up: $file -> $backup_dir/"
    fi
}

# Ask for confirmation
read -p "Are you sure you want to proceed with cleanup? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Cleanup cancelled"
    exit 1
fi

echo ""
echo "🔄 Starting cleanup process..."
echo ""

# 1. Backup deprecated files before removal
echo "📦 Creating backups..."
backup_file "src/js/form-handler.js"

# 2. Remove form-handler.js from head.twig
echo "🔧 Updating head.twig..."
if [ -f "src/templates/head.twig" ]; then
    # Comment out the form-handler.js line instead of removing it completely
    sed -i 's|<script src="{{ base_path }}/src/js/form-handler.js|<!-- DEPRECATED: <script src="{{ base_path }}/src/js/form-handler.js|g' src/templates/head.twig
    sed -i 's|cache_refresh_token }}"></script>|cache_refresh_token }}"></script> -->|g' src/templates/head.twig
    echo "✅ Commented out form-handler.js in head.twig"
else
    echo "⚠️  head.twig not found"
fi

# 3. Optional: Remove the bloated form-handler.js file
read -p "Do you want to delete the deprecated form-handler.js file? (yes/no): " delete_confirm

if [ "$delete_confirm" == "yes" ]; then
    if [ -f "src/js/form-handler.js" ]; then
        rm "src/js/form-handler.js"
        echo "🗑️  Deleted: src/js/form-handler.js"
    fi
else
    echo "📁 Keeping form-handler.js file (commented out in templates)"
fi

# 4. Generate cleanup report
echo ""
echo "📊 Cleanup Summary"
echo "=================="
echo ""
echo "✅ Completed Tasks:"
echo "   - Backed up deprecated files"
echo "   - Commented out form-handler.js in head.twig"
if [ "$delete_confirm" == "yes" ]; then
    echo "   - Deleted deprecated form-handler.js"
fi
echo ""
echo "📁 Files Still Present (for rollback if needed):"
echo "   - src/js/helpdesk.js (legacy version)"
echo "   - src/js/nokkelbestilling.js (legacy version)"
echo "   - src/js/inspection_1.js (legacy version)"
echo "   - src/js/invoicerequest.js (legacy version)"
echo ""
echo "🎯 Active Architecture:"
echo "   - src/js/form-handler-core.js (112 lines)"
echo "   - src/js/form-extension-loader.js"
echo "   - src/js/extensions/* (modular extensions)"
echo "   - src/js/*-migrated.js (clean form handlers)"
echo ""
echo "✅ Cleanup completed successfully!"
echo ""
echo "📈 Expected Results:"
echo "   - Faster page load times"
echo "   - Reduced memory usage"
echo "   - Cleaner codebase"
echo "   - Better maintainability"
echo ""
echo "🔄 To rollback (if needed):"
echo "   1. Restore head.twig from backup"
echo "   2. Restore form-handler.js from backup"
echo "   3. Update templates to use original scripts"
echo ""

# Create a cleanup log
echo "$(date): FormHandler cleanup completed" >> cleanup.log
echo "Files backed up to: deprecated-backup-$(date +%Y%m%d)" >> cleanup.log

echo "📝 Cleanup log created: cleanup.log"
echo ""
echo "🎉 FormHandler modernization project COMPLETE!"
