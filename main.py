from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from upload_cv import router as upload_router
from project_recommendation import router as recommend_router
from extract_skills import router as skills_router
from fastapi.staticfiles import StaticFiles
from pathlib import Path

app = FastAPI(title="Unified Resource Management API")

# CORS
origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routers
app.include_router(upload_router)
app.include_router(recommend_router)
app.include_router(skills_router)

@app.get("/")
async def root():
    return {"message": "Unified API is running! Endpoints: /upload_cv/, /recommendations/{id}, /extract_skills/"}
