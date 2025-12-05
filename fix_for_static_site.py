# fix_for_static_site.py
import os
import json

def fix_for_static_site():
    """Fix files for static site deployment"""
    
    # Get API URL from environment variable (set in Render)
    api_url = os.getenv("API_URL", "https://finalpls-resource-management-system.onrender.com")
    print(f"API URL: {api_url}")
    
    # Process all HTML files
    html_folders = [
        "login/HTML_Files",
        "Employee/HTML_Files", 
        "ProjectManager/HTML_Files",
        "ResourceManager/HTML_Files"
    ]
    
    for folder in html_folders:
        if os.path.exists(folder):
            for file in os.listdir(folder):
                if file.endswith(".html"):
                    fix_html_file(folder, file, api_url)
    
    # Process all JS files
    js_folders = [
        "login/JS_Files",
        "Employee/JS_Files",
        "ProjectManager/JS_Files",
        "ResourceManager/JS_Files"
    ]
    
    for folder in js_folders:
        if os.path.exists(folder):
            for file in os.listdir(folder):
                if file.endswith(".js"):
                    fix_js_file(folder, file, api_url)
    
    print("✅ All files fixed for static site!")

def fix_html_file(folder, filename, api_url):
    """Fix paths in HTML file for static site"""
    filepath = os.path.join(folder, filename)
    
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Get folder name (login, Employee, etc.)
    folder_name = folder.split("/")[0]
    
    # Fix CSS paths - use relative paths
    content = content.replace('href="../CSS_Files/', 'href="CSS_Files/')
    content = content.replace('href="CSS_Files/', f'../{folder_name}/CSS_Files/')
    
    # Fix JS paths - use relative paths
    content = content.replace('src="../JS_Files/', 'src="JS_Files/')
    content = content.replace('src="JS_Files/', f'../{folder_name}/JS_Files/')
    
    # Fix API URLs in inline JavaScript
    content = content.replace("http://localhost:8000", api_url)
    content = content.replace("localhost:8000", api_url.replace("https://", "").replace("http://", ""))
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    
    print(f"✅ Fixed HTML: {filepath}")

def fix_js_file(folder, filename, api_url):
    """Fix paths in JS file for static site"""
    filepath = os.path.join(folder, filename)
    
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Fix API URLs
    content = content.replace("http://localhost:8000", api_url)
    content = content.replace("localhost:8000", api_url.replace("https://", "").replace("http://", ""))
    
    # Create a configuration object at the top of each JS file
    config_js = f"""
// API Configuration
const API_CONFIG = {{
    BASE_URL: "{api_url}",
    ENDPOINTS: {{
        UPLOAD_CV: "{api_url}/api/upload_cv",
        RECOMMENDATIONS: "{api_url}/api/recommendations",
        PROCESS_RESUME: "{api_url}/api/process-resume"
    }}
}};
"""
    
    # Add config to beginning of file
    content = config_js + content
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    
    print(f"✅ Fixed JS: {filepath}")

if __name__ == "__main__":
    fix_for_static_site()