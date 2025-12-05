# fix_paths.py
import os

# Fix HTML files
folders = ["login/HTML_Files", "Employee/HTML_Files", "ProjectManager/HTML_Files", "ResourceManager/HTML_Files"]

for folder in folders:
    if os.path.exists(folder):
        for file in os.listdir(folder):
            if file.endswith(".html"):
                filepath = os.path.join(folder, file)
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                
                folder_name = folder.split("/")[0]  # "login", "Employee", etc.
                
                # Fix CSS paths - use the mounted static paths
                content = content.replace('href="../CSS_Files/', f'href="/static/{folder_name}/CSS_Files/')
                content = content.replace('href="CSS_Files/', f'href="/static/{folder_name}/CSS_Files/')
                
                # Fix JS paths - use the mounted static paths
                content = content.replace('src="../JS_Files/', f'src="/static/{folder_name}/JS_Files/')
                content = content.replace('src="JS_Files/', f'src="/static/{folder_name}/JS_Files/')
                
                # Also fix any API URLs in inline JS
                backend_url = "https://finalpls-resource-management-system.onrender.com"
                content = content.replace('http://localhost:8000', backend_url)
                content = content.replace('localhost:8000', backend_url.replace("https://", ""))
                
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"Fixed: {filepath}")

print("✅ All HTML files fixed!")