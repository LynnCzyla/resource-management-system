from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from upload_cv import router as upload_router
from project_recommendation import router as recommend_router
from extract_skills import router as skills_router
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import os

app = FastAPI(title="Resource Management System")

# Allow all origins
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve all files
app.mount("/static", StaticFiles(directory="."), name="static")

# Include API routes
app.include_router(upload_router)
app.include_router(recommend_router)
app.include_router(skills_router)

# Show login page at root
@app.get("/")
async def root():
    try:
        with open("login/HTML_Files/login.html", "r", encoding="utf-8") as f:
            html = f.read()
        # Fix CSS/JS paths
        html = html.replace('href="../CSS_Files/', 'href="/static/login/CSS_Files/')
        html = html.replace('src="../JS_Files/', 'src="/static/login/JS_Files/')
        return HTMLResponse(content=html)
    except Exception as e:
        return {"error": f"Could not load login page: {str(e)}"}

# Health check
@app.get("/health")
async def health():
    return {"status": "ok", "message": "Resource Management System is running"}

# Show API docs at /docs (default FastAPI)