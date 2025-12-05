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
                
                # Fix CSS paths
                content = content.replace('href="../CSS_Files/', 'href="/static/' + folder.split("/")[0] + '/CSS_Files/')
                
                # Fix JS paths
                content = content.replace('src="../JS_Files/', 'src="/static/' + folder.split("/")[0] + '/JS_Files/')
                
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"Fixed: {filepath}")

print("✅ All HTML files fixed!")