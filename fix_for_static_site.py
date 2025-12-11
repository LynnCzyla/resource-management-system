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
    
    # Fix API URLs in inline JavaScript - KEEP /api/ prefix!
    content = content.replace("http://localhost:8000", f"{api_url}/api")  # ADD /api
    content = content.replace("localhost:8000", f"{api_url.replace('https://', '').replace('http://', '')}/api")
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    
    print(f"✅ Fixed HTML: {filepath}")

def fix_js_file(folder, filename, api_url):
    """Fix paths in JS file for static site"""
    filepath = os.path.join(folder, filename)
    
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Fix API URLs - KEEP /api/ prefix!
    content = content.replace("http://localhost:8000", f"{api_url}/api")  # ADD /api
    content = content.replace("localhost:8000", f"{api_url.replace('https://', '').replace('http://', '')}/api")
    
    # Remove the old API_CONFIG block if it exists (it has wrong URLs)
    if "const API_CONFIG = {" in content:
        # Find and remove the old config
        lines = content.split('\n')
        new_lines = []
        in_config = False
        brace_count = 0
        
        for line in lines:
            if "const API_CONFIG = {" in line:
                in_config = True
                brace_count = 1
                continue
            
            if in_config:
                brace_count += line.count('{')
                brace_count -= line.count('}')
                if brace_count <= 0 and '}' in line:
                    in_config = False
                continue
            
            new_lines.append(line)
        
        content = '\n'.join(new_lines)
    
    # Create a NEW configuration object with correct URLs
    config_js = f"""
// API Configuration for Static Site
const API_BASE_URL = "{api_url}";
const API_ENDPOINTS = {{
    BASE_URL: API_BASE_URL,
    UPLOAD_CV: API_BASE_URL + "/api/upload_cv",
    RECOMMENDATIONS: API_BASE_URL + "/api/recommendations",
    EXTRACT_SKILLS: API_BASE_URL + "/api/extract_skills",
    PROCESS_RESUME: API_BASE_URL + "/api/process-resume"
}};

// Helper function for API calls
async function apiFetch(endpoint, options = {{}}) {{
    const url = API_BASE_URL + '/api' + endpoint;
    const response = await fetch(url, {{
        ...options,
        headers: {{
            'Content-Type': 'application/json',
            ...options.headers
        }}
    }});
    return response;
}}
"""
    
    # Add config to beginning of file if not already there
    if "API_BASE_URL" not in content:
        content = config_js + "\n" + content
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    
    print(f"✅ Fixed JS: {filepath}")

if __name__ == "__main__":
    fix_for_static_site()