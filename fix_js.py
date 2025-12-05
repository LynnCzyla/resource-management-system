# fix_js.py
import os

backend_url = "https://finalpls-resource-management-system.onrender.com"  # YOUR BACKEND URL

folders = ["login/JS_Files", "Employee/JS_Files", "ProjectManager/JS_Files", "ResourceManager/JS_Files"]

for folder in folders:
    if os.path.exists(folder):
        for file in os.listdir(folder):
            if file.endswith(".js"):
                filepath = os.path.join(folder, file)
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                
                # Update API URLs - replace localhost with your Render URL
                content = content.replace('http://localhost:8000', backend_url)
                content = content.replace('localhost:8000', backend_url.replace("https://", ""))
                content = content.replace("'http://", "'https://")  # Force HTTPS
                
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"Fixed: {filepath}")

print("✅ All JS files fixed!")