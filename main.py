# main.py - BACKEND API ONLY
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from upload_cv import router as upload_router
from project_recommendation import router as recommend_router
from extract_skills import router as skills_router
import os

app = FastAPI(title="Resource Management System API")

# CORS - allow requests from your static site
origins = [
    "http://localhost:3000",  # Local frontend
    "http://localhost:8000",  # Local backend
    "https://finalpls-resource-management-system-frontend.onrender.com",  # Your static site
    "*"  # For testing
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(upload_router, prefix="/api")
app.include_router(recommend_router, prefix="/api")
app.include_router(skills_router, prefix="/api")

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Resource Management System API",
        "endpoints": {
            "api_docs": "/docs",
            "api_redoc": "/redoc",
            "health": "/health",
            "upload_cv": "/api/upload_cv",
            "recommendations": "/api/recommendations/{project_id}",
            "process_resume": "/api/process-resume"
        },
        "frontend": "https://finalpls-resource-management-system-frontend.onrender.com"
    }

# Health check
@app.get("/health")
async def health():
    return {"status": "healthy", "service": "Resource Management System API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))