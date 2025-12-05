from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.templating import Jinja2Templates
import os
from pathlib import Path

# Import your routers
from upload_cv import router as upload_router
from project_recommendation import router as recommend_router
from extract_skills import router as skills_router

app = FastAPI(title="Resource Management System")

# Allow all origins
# In your main.py, update the CORS middleware:
origins = [
    "http://localhost:8000",
    "http://localhost:3000",
    "https://finalpls-resource-management-system.onrender.com",
    "*"  # Keep this for testing, remove in production
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files from all directories
app.mount("/static/login", StaticFiles(directory="login"), name="login_static")
app.mount("/static/employee", StaticFiles(directory="Employee"), name="employee_static")
app.mount("/static/project-manager", StaticFiles(directory="ProjectManager"), name="pm_static")
app.mount("/static/resource-manager", StaticFiles(directory="ResourceManager"), name="rm_static")

# Include API routes with prefix
app.include_router(upload_router, prefix="/api")
app.include_router(recommend_router, prefix="/api")
app.include_router(skills_router, prefix="/api")

# ========== HTML ROUTES ==========

@app.get("/", response_class=HTMLResponse)
async def serve_login():
    """Serve login page"""
    try:
        with open("login/HTML_Files/login.html", "r", encoding="utf-8") as f:
            html = f.read()
        return HTMLResponse(content=html)
    except Exception as e:
        return f"""
        <html>
            <body>
                <h1>Error loading login page</h1>
                <p>{str(e)}</p>
                <p>Make sure login/HTML_Files/login.html exists</p>
            </body>
        </html>
        """

@app.get("/employee", response_class=HTMLResponse)
async def serve_employee_dashboard():
    """Serve employee dashboard"""
    try:
        with open("Employee/HTML_Files/dashboard.html", "r", encoding="utf-8") as f:
            html = f.read()
        return HTMLResponse(content=html)
    except Exception as e:
        return f"<h1>Error: {str(e)}</h1>"

@app.get("/employee/profile", response_class=HTMLResponse)
async def serve_employee_profile():
    """Serve employee profile"""
    try:
        with open("Employee/HTML_Files/myprofile.html", "r", encoding="utf-8") as f:
            html = f.read()
        return HTMLResponse(content=html)
    except Exception as e:
        return f"<h1>Error: {str(e)}</h1>"

@app.get("/project-manager", response_class=HTMLResponse)
async def serve_pm_dashboard():
    """Serve project manager dashboard"""
    try:
        with open("ProjectManager/HTML_Files/Dashboard.html", "r", encoding="utf-8") as f:
            html = f.read()
        return HTMLResponse(content=html)
    except Exception as e:
        return f"<h1>Error: {str(e)}</h1>"

@app.get("/project-manager/projects", response_class=HTMLResponse)
async def serve_pm_projects():
    """Serve project manager projects"""
    try:
        with open("ProjectManager/HTML_Files/My Projects.html", "r", encoding="utf-8") as f:
            html = f.read()
        return HTMLResponse(content=html)
    except Exception as e:
        return f"<h1>Error: {str(e)}</h1>"

@app.get("/project-manager/track", response_class=HTMLResponse)
async def serve_pm_track():
    """Serve project tracking"""
    try:
        with open("ProjectManager/HTML_Files/projecttrack.html", "r", encoding="utf-8") as f:
            html = f.read()
        return HTMLResponse(content=html)
    except Exception as e:
        return f"<h1>Error: {str(e)}</h1>"

@app.get("/project-manager/requests", response_class=HTMLResponse)
async def serve_pm_requests():
    """Serve resource requests"""
    try:
        with open("ProjectManager/HTML_Files/Resource Requests.html", "r", encoding="utf-8") as f:
            html = f.read()
        return HTMLResponse(content=html)
    except Exception as e:
        return f"<h1>Error: {str(e)}</h1>"

@app.get("/resource-manager", response_class=HTMLResponse)
async def serve_rm_dashboard():
    """Serve resource manager dashboard"""
    try:
        with open("ResourceManager/HTML_Files/dashboard.html", "r", encoding="utf-8") as f:
            html = f.read()
        return HTMLResponse(content=html)
    except Exception as e:
        return f"<h1>Error: {str(e)}</h1>"

@app.get("/resource-manager/employees", response_class=HTMLResponse)
async def serve_rm_employees():
    """Serve employee management"""
    try:
        with open("ResourceManager/HTML_Files/employee.html", "r", encoding="utf-8") as f:
            html = f.read()
        return HTMLResponse(content=html)
    except Exception as e:
        return f"<h1>Error: {str(e)}</h1>"

@app.get("/resource-manager/projects", response_class=HTMLResponse)
async def serve_rm_projects():
    """Serve project management"""
    try:
        with open("ResourceManager/HTML_Files/project.html", "r", encoding="utf-8") as f:
            html = f.read()
        return HTMLResponse(content=html)
    except Exception as e:
        return f"<h1>Error: {str(e)}</h1>"

@app.get("/resource-manager/requests", response_class=HTMLResponse)
async def serve_rm_requests():
    """Serve request management"""
    try:
        with open("ResourceManager/HTML_Files/request.html", "r", encoding="utf-8") as f:
            html = f.read()
        return HTMLResponse(content=html)
    except Exception as e:
        return f"<h1>Error: {str(e)}</h1>"

# Health check
@app.get("/health")
async def health():
    return {"status": "ok", "message": "Resource Management System is running"}

@app.get("/api/check")
async def api_check():
    return {"status": "API is working", "endpoints": ["/api/upload_cv", "/api/recommendations", "/api/process-resume"]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))