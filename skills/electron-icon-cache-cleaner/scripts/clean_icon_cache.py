#!/usr/bin/env python3
"""
Clean Electron icon caches for electron-builder.

This script removes:
1. electron-builder NSIS cache
2. Project release/ and dist/ directories

Usage:
    python clean_icon_cache.py [project_path]

If project_path is not specified, uses current directory.
"""

import os
import sys
import shutil
import platform
from pathlib import Path


def get_electron_builder_cache():
    """Get electron-builder cache directory based on OS."""
    system = platform.system()
    
    if system == "Windows":
        local_app_data = os.environ.get("LOCALAPPDATA")
        if local_app_data:
            return Path(local_app_data) / "electron-builder" / "cache" / "nsis"
    elif system == "Darwin":  # macOS
        home = Path.home()
        return home / "Library" / "Caches" / "electron-builder" / "nsis"
    else:  # Linux
        home = Path.home()
        cache_dir = os.environ.get("XDG_CACHE_HOME", home / ".cache")
        return Path(cache_dir) / "electron-builder" / "nsis"
    
    return None


def remove_directory(path, description):
    """Safely remove a directory."""
    if not path or not path.exists():
        print(f"  {description}: Not found (already clean)")
        return True
    
    try:
        shutil.rmtree(path)
        print(f"  [OK] {description}: Removed")
        return True
    except Exception as e:
        print(f"  [FAIL] {description}: {e}")
        return False


def main():
    # Get project path
    if len(sys.argv) > 1:
        project_path = Path(sys.argv[1]).resolve()
    else:
        project_path = Path.cwd()
    
    print("=" * 50)
    print("Electron Icon Cache Cleaner")
    print("=" * 50)
    print(f"Project path: {project_path}")
    print()
    
    # Track results
    all_success = True
    
    # 1. Clean electron-builder NSIS cache
    print("[1] Cleaning electron-builder NSIS cache...")
    nsis_cache = get_electron_builder_cache()
    if nsis_cache:
        all_success &= remove_directory(nsis_cache, "NSIS cache")
    else:
        print("  Could not determine cache location for this OS")
    print()
    
    # 2. Clean project directories
    print("[2] Cleaning project build directories...")
    
    release_dir = project_path / "release"
    all_success &= remove_directory(release_dir, "release/")
    
    dist_dir = project_path / "dist"
    all_success &= remove_directory(dist_dir, "dist/")
    print()
    
    # Summary
    print("=" * 50)
    if all_success:
        print("[OK] Cache cleanup completed successfully!")
        print()
        print("Next steps:")
        print("  1. Verify icon files exist in build/icons/")
        print("  2. Run: pnpm electron:build")
        print("  3. If Windows still shows old icon, move/rename the .exe file")
    else:
        print("[WARN] Some directories could not be removed.")
        print("       You may need to run with administrator privileges.")
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
