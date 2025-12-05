# create_frontend.py
import os

# Create simple frontend folder
os.makedirs("frontend", exist_ok=True)

# Create index.html that redirects to your backend
index_html = """<!DOCTYPE html>
<html>
<head>
    <title>Resource Management System</title>
    <meta http-equiv="refresh" content="0; url=https://finalpls-resource-management-system.onrender.com/">
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            text-align: center;
            padding: 40px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            backdrop-filter: blur(10px);
        }
        h1 {
            margin-bottom: 20px;
        }
        a {
            color: #fff;
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Resource Management System</h1>
        <p>Redirecting to application...</p>
        <p>If you are not redirected automatically, <a href="https://finalpls-resource-management-system.onrender.com/">click here</a>.</p>
    </div>
</body>
</html>"""

with open("frontend/index.html", "w") as f:
    f.write(index_html)

print("Created frontend/index.html")