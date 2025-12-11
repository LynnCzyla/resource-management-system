# fix_js.py
import os
import re

def fix_js_files():
    """Fix ALL JS files to have correct API URLs with /api/ prefix"""
    
    backend_url = "https://finalpls-resource-management-system.onrender.com"
    
    folders = [
        "static_site/login/JS_Files", 
        "static_site/Employee/JS_Files",
        "static_site/ProjectManager/JS_Files", 
        "static_site/ResourceManager/JS_Files"
    ]
    
    for folder in folders:
        if not os.path.exists(folder):
            print(f"⚠️  Folder not found: {folder}")
            continue
            
        for file in os.listdir(folder):
            if not file.endswith(".js"):
                continue
                
            filepath = os.path.join(folder, file)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Fix 1: Replace localhost with backend URL + /api
            content = content.replace("http://localhost:8000", f"{backend_url}/api")
            content = content.replace("localhost:8000", f"{backend_url.replace('https://', '')}/api")
            
            # Fix 2: If backend URL is already there without /api/, add it
            if f"{backend_url}/" in content and "/api/" not in content:
                # Look for patterns like: https://backend.com/endpoint
                pattern = rf'{re.escape(backend_url)}/(?!api/)(\w+/)'
                def add_api_prefix(match):
                    return f"{backend_url}/api/{match.group(1)}"
                
                content = re.sub(pattern, add_api_prefix, content)
            
            # Fix 3: Ensure HTTPS
            content = content.replace("http://", "https://")
            
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
            
            print(f"✅ Fixed: {filepath}")
    
    print("✅ All JS files fixed!")

if __name__ == "__main__":
    fix_js_files()