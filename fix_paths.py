# fix_paths.py
import os
import re

def fix_html_files():
    """Fix HTML files for static site"""
    
    backend_url = "https://finalpls-resource-management-system.onrender.com"
    
    folders = [
        "static_site/login/HTML_Files",
        "static_site/Employee/HTML_Files", 
        "static_site/ProjectManager/HTML_Files",
        "static_site/ResourceManager/HTML_Files"
    ]
    
    for folder in folders:
        if not os.path.exists(folder):
            print(f"⚠️  Folder not found: {folder}")
            continue
            
        for file in os.listdir(folder):
            if not file.endswith(".html"):
                continue
                
            filepath = os.path.join(folder, file)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            folder_name = folder.split("/")[1]  # "login", "Employee", etc.
            
            # Fix CSS paths - use relative paths within static_site
            content = content.replace('href="../CSS_Files/', f'href="../{folder_name}/CSS_Files/')
            content = content.replace('href="CSS_Files/', f'href="../{folder_name}/CSS_Files/')
            
            # Fix JS paths - use relative paths within static_site
            content = content.replace('src="../JS_Files/', f'src="../{folder_name}/JS_Files/')
            content = content.replace('src="JS_Files/', f'src="../{folder_name}/JS_Files/')
            
            # Fix API URLs - add /api/ prefix
            content = content.replace("http://localhost:8000", f"{backend_url}/api")
            content = content.replace("localhost:8000", f"{backend_url.replace('https://', '')}/api")
            
            # Also fix any hardcoded backend URLs without /api/
            if f"{backend_url}/" in content and "/api/" not in content:
                pattern = rf'{re.escape(backend_url)}/(?!api/)(\w+/)'
                content = re.sub(pattern, f"{backend_url}/api/", content)
            
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
            
            print(f"✅ Fixed: {filepath}")
    
    print("✅ All HTML files fixed!")

if __name__ == "__main__":
    fix_html_files()