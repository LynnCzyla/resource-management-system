# build_static.py
import os

def build_static_site():
    """Prepare for static site deployment"""
    print("🚀 Building static site...")
    
    # Create root index.html if not exists
    if not os.path.exists("index.html"):
        with open("index.html", "w") as f:
            f.write('''<!DOCTYPE html>
<html>
<head>
    <title>Resource Management System</title>
    <meta http-equiv="refresh" content="0; url=login/HTML_Files/login.html">
</head>
<body>
    <p>Redirecting to login page...</p>
</body>
</html>''')
        print("✅ Created index.html")
    
    # Run the fix script
    print("🔧 Fixing file paths...")
    try:
        import fix_for_static_site
        fix_for_static_site.fix_for_static_site()
    except ImportError:
        print("⚠️ Could not import fix_for_static_site.py")
    
    print("🎉 Static site build complete!")
    print("\nYour static site will be available at:")
    print("  https://finalpls-resource-management-system-frontend.onrender.com")
    print("\nMake sure to set API_URL environment variable to your backend URL")

if __name__ == "__main__":
    build_static_site()