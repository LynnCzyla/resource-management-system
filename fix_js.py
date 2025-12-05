# fix_js.py
import os

folders = ["login/JS_Files", "Employee/JS_Files", "ProjectManager/JS_Files", "ResourceManager/JS_Files"]

backend_url = "https://finalpls-resource-management-system.onrender.com"

for folder in folders:
    if os.path.exists(folder):
        for file in os.listdir(folder):
            if file.endswith(".js"):
                filepath = os.path.join(folder, file)
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                
                # Update API URLs
                content = content.replace('http://localhost:8000', backend_url)
                
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"Fixed: {filepath}")

print("✅ All JS files fixed!")