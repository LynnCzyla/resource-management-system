from typing import List
from pathlib import Path
import shutil
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from urllib.parse import unquote

# -----------------------------
# FastAPI router & upload folder
# -----------------------------
router = APIRouter()
UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# -----------------------------
# Upload CV Endpoint
# -----------------------------
@router.post("/upload_cv/")
async def upload_cv(
    employee_id: str = Form(...),
    files: List[UploadFile] = File(...)
):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    employee_folder = UPLOAD_DIR / employee_id
    employee_folder.mkdir(parents=True, exist_ok=True)

    saved_files = []

    for file in files:
        file_path = employee_folder / file.filename

        # Save locally
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        saved_files.append({
            "filename": file.filename,
            "path": str(file_path)
        })

    return {"success": True, "files": saved_files}


# -----------------------------
# List Files Endpoint
# -----------------------------
@router.get("/list_cv/")
async def list_cv(employee_id: str):
    employee_folder = UPLOAD_DIR / employee_id
    if not employee_folder.exists():
        return {"success": True, "files": []}

    files = [{"filename": f.name, "path": str(f)} for f in employee_folder.iterdir() if f.is_file()]
    return {"success": True, "files": files}


# -----------------------------
# Delete CV Endpoint
# -----------------------------
@router.delete("/delete_cv/")
async def delete_cv(employee_id: str, filename: str):
    filename = unquote(filename)
    employee_folder = UPLOAD_DIR / employee_id
    file_path = employee_folder / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    try:
        file_path.unlink()
        # Remove folder if empty
        if employee_folder.exists() and not any(employee_folder.iterdir()):
            employee_folder.rmdir()

        return {"success": True, "message": f"{filename} deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting file: {str(e)}")
