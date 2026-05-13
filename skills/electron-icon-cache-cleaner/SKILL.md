---
name: electron-icon-cache-cleaner
description: Clean Electron app icon caches when electron-builder packages still show old icons after updating build/icons/icon.ico. Handles electron-builder NSIS cache, Windows icon cache, and project build directories.
---

# Electron Icon Cache Cleaner

This skill helps resolve the common issue where electron-builder continues to use old icons even after updating `build/icon.svg` or `build/icons/icon.ico`.

## Problem

When updating an Electron app's icon, the following caches can prevent the new icon from appearing:

1. **electron-builder NSIS cache** - Stores compiled icons in `~/AppData/Local/electron-builder/cache/nsis`
2. **Project build directories** - `release/` and `dist/` folders with old artifacts
3. **Windows icon cache** - System-level thumbnail cache in Windows Explorer

Simply deleting the `release` folder is often insufficient.

## When to Use This Skill

Use this skill when:
- User says "electron-builder is using old icon"
- User says "I updated icon.ico but the installer still shows old icon"
- User says "Windows shows old icon for my Electron app"
- User has deleted `release` folder but icon still doesn't update

## Solution

### Step 1: Clean electron-builder Cache

Remove the NSIS cache directory:

```powershell
Remove-Item -Path "$env:LOCALAPPDATA\electron-builder\cache\nsis" -Recurse -Force -ErrorAction SilentlyContinue
```

### Step 2: Clean Project Build Directories

Remove build artifacts:

```powershell
Remove-Item -Path "release" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue
```

### Step 3: Verify Icon Files Exist

Ensure the new icon files are in place:
- `build/icon.svg` (source)
- `build/icon.png` (generated, 1024x1024 or 256x256)
- `build/icons/icon.ico` (generated, multi-resolution)

If missing, regenerate using:
```bash
node scripts/convert-icon.js
```

### Step 4: Rebuild

Run the build command:
```bash
pnpm electron:build
# or
npm run electron:build
```

### Step 5: Windows Icon Cache (if still showing old icon)

If Windows Explorer still shows the old icon for the `.exe` file:

1. **Move or rename** the installer file - Windows caches icons by file path
2. **Restart Explorer** or reboot to clear system icon cache
3. **Copy to different folder** - Sometimes the cache is folder-specific

## Quick Reference: Cache Locations

| Cache Type | Location |
|-----------|----------|
| electron-builder NSIS | `%LOCALAPPDATA%\electron-builder\cache\nsis` |
| Project release | `./release` |
| Project dist | `./dist` |
| Windows icon cache | System-level, requires restart |

## Automated Script

Use the provided script for one-command cleanup:

```bash
python scripts/clean_icon_cache.py
```

This script handles Steps 1-2 automatically.

## Summary

The key insight is that electron-builder caches compiled icons separately from the project directory. The NSIS cache at `%LOCALAPPDATA%\electron-builder\cache\nsis` must be cleared for new icons to take effect.
