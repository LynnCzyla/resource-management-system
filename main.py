# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from upload_cv import router as upload_router
from project_recommendation import router as recommend_router
from extract_skills import router as skills_router  # This imports your extract_skills endpoint
import os

app = FastAPI(title="Resource Management System API")

# CORS configuration
origins = [
    "http://localhost:3000",
    "http://localhost:8000", 
    "https://finalpls-resource-management-system-frontend.onrender.com",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include ONLY the endpoints you actually have
app.include_router(upload_router, prefix="/api")
app.include_router(recommend_router, prefix="/api")
app.include_router(skills_router, prefix="/api")  # This adds /api/extract_skills

# Root endpoint - Update to show only ACTUAL endpoints
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
            "extract_skills": "/api/extract_skills"  # ONLY THIS from extract_skills.py
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