import os
import time
import uuid
import logging
from typing import List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from supabase import create_client, Client
from concurrent.futures import ThreadPoolExecutor
import asyncio

# ---------- Supabase Config ----------
SUPABASE_URL = "https://edzqjailcajqxwxjxidg.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkenFqYWlsY2FqcXh3eGp4aWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNTE2NTQsImV4cCI6MjA3NjYyNzY1NH0.BKKCyEjW-l_CpOMKnpuAPO9ZCuBSL0Hr2lgAZjIeqb0"

# ---------- Configuration ----------
BUCKET_NAME = "cvs"
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.doc', '.txt', '.png', '.jpg', '.jpeg'}

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ---------- Logging Config ----------
logger = logging.getLogger("cv_upload_logger")

router = APIRouter()

# ---------- Helper Functions ----------
def generate_unique_filename(original_filename: str, employee_id: str) -> tuple[str, str]:
    """Generate unique filename and path for storage"""
    file_extension = os.path.splitext(original_filename)[1].lower()
    unique_filename = f"{int(time.time())}_{uuid.uuid4().hex}{file_extension}"
    unique_path = f"{employee_id}/{unique_filename}"
    return unique_filename, unique_path

def validate_file_extension(filename: str) -> bool:
    """Validate if file extension is allowed"""
    file_extension = os.path.splitext(filename)[1].lower()
    return file_extension in ALLOWED_EXTENSIONS

def validate_file_size(content: bytes) -> bool:
    """Validate file size"""
    return len(content) <= MAX_FILE_SIZE

def handle_supabase_response(response, operation: str) -> dict:
    """Handle Supabase response - SIMPLIFIED VERSION"""
    try:
        # If response is None or empty, consider it successful
        if response is None:
            return {"success": True}
        
        # Check if response has error attribute
        if hasattr(response, 'error'):
            if response.error:
                return {"success": False, "error": str(response.error)}
            else:
                return {"success": True}
        
        # Check if response is a string (unexpected)
        if isinstance(response, str):
            if "error" in response.lower():
                return {"success": False, "error": response}
            else:
                return {"success": True}
                
        # For any other response type, assume success
        return {"success": True}
        
    except Exception as e:
        logger.error(f"Error handling Supabase {operation} response: {e}")
        return {"success": False, "error": f"Response handling error: {str(e)}"}

async def upload_to_supabase(file_path: str, content: bytes, filename: str) -> dict:
    """Upload file to Supabase storage"""
    try:
        logger.info(f"Uploading {filename} to {file_path}")
        
        # Upload file content directly
        response = supabase.storage.from_(BUCKET_NAME).upload(file_path, content)
        
        # Check if upload was successful
        result = handle_supabase_response(response, "upload")
        
        if result["success"]:
            logger.info(f"✅ Upload successful for {filename}")
            return {
                "success": True,
                "file_path": file_path,
                "public_url": supabase.storage.from_(BUCKET_NAME).get_public_url(file_path)
            }
        else:
            logger.error(f"❌ Upload failed for {filename}: {result.get('error', 'Unknown error')}")
            return result
            
    except Exception as e:
        logger.error(f"❌ Upload exception for {filename}: {e}")
        return {"success": False, "error": str(e)}

async def process_single_file(file: UploadFile, employee_id: str) -> dict:
    """Process and upload a single file"""
    try:
        # Read file content
        content = await file.read()
        
        # Validate file
        if len(content) == 0:
            return {
                "filename": file.filename,
                "success": False,
                "error": "File is empty"
            }

        if not validate_file_size(content):
            return {
                "filename": file.filename,
                "success": False,
                "error": f"File size exceeds {MAX_FILE_SIZE // (1024*1024)}MB limit"
            }

        if not validate_file_extension(file.filename):
            return {
                "filename": file.filename,
                "success": False,
                "error": f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
            }

        # Generate unique filename
        unique_filename, unique_path = generate_unique_filename(file.filename, employee_id)

        # Upload to Supabase
        upload_result = await upload_to_supabase(unique_path, content, file.filename)
        
        if not upload_result["success"]:
            return {
                "filename": file.filename,
                "success": False,
                "error": upload_result.get("error", "Upload failed")
            }

        result = {
            "filename": file.filename,
            "storage_filename": unique_filename,
            "supabase_path": unique_path,
            "public_url": upload_result["public_url"],
            "success": True
        }

        logger.info(f"🎉 Successfully processed {file.filename}")
        return result

    except Exception as e:
        logger.error(f"💥 Error processing {file.filename}: {e}")
        return {
            "filename": file.filename,
            "success": False,
            "error": str(e)
        }

# -----------------------------
# Upload CV to Supabase Bucket (FIXED)
# -----------------------------
@router.post("/upload_cv/")
async def upload_cv(
    employee_id: str = Form(...),
    files: List[UploadFile] = File(...)
):
    """Upload multiple CV files with parallel processing"""
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    logger.info(f"🚀 Starting upload for employee {employee_id} with {len(files)} files")

    # Process files concurrently
    tasks = [process_single_file(file, employee_id) for file in files]
    saved_files = await asyncio.gather(*tasks)

    # Calculate success statistics
    successful_uploads = [f for f in saved_files if f.get("success")]
    failed_uploads = [f for f in saved_files if not f.get("success")]

    # Log detailed results
    logger.info("=" * 50)
    logger.info("📊 UPLOAD SUMMARY:")
    logger.info(f"   Total files: {len(files)}")
    logger.info(f"   ✅ Successful: {len(successful_uploads)}")
    logger.info(f"   ❌ Failed: {len(failed_uploads)}")
    
    for result in saved_files:
        if result["success"]:
            logger.info(f"   ✅ {result['filename']} -> {result['supabase_path']}")
        else:
            logger.error(f"   ❌ {result['filename']} -> {result.get('error', 'Unknown error')}")
    logger.info("=" * 50)

    return {
        "success": True,
        "employee_id": employee_id,
        "uploaded_files": saved_files,
        "summary": {
            "total": len(files),
            "successful": len(successful_uploads),
            "failed": len(failed_uploads)
        }
    }

# -----------------------------
# List Files from Supabase Bucket (FIXED)
# -----------------------------
@router.get("/list_cv/")
async def list_cv(employee_id: str):
    """List all CV files for an employee"""
    try:
        logger.info(f"📁 Listing files for employee: {employee_id}")
        
        # List files from Supabase bucket
        response = supabase.storage.from_(BUCKET_NAME).list(employee_id)
        
        # Handle response
        result = handle_supabase_response(response, "list")
        if not result["success"]:
            raise HTTPException(status_code=500, detail=f"Error listing files: {result.get('error')}")

        files = []
        for item in response:
            if hasattr(item, 'name') or (isinstance(item, dict) and item.get('name')):
                item_name = item.name if hasattr(item, 'name') else item['name']
                file_path = f"{employee_id}/{item_name}"
                public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(file_path)
                
                files.append({
                    "filename": item_name,
                    "supabase_path": file_path,
                    "public_url": public_url,
                    "created_at": getattr(item, 'created_at', '') if hasattr(item, 'created_at') else item.get('created_at', ''),
                    "updated_at": getattr(item, 'updated_at', '') if hasattr(item, 'updated_at') else item.get('updated_at', ''),
                    "size": getattr(item, 'metadata', {}).get('size', 0) if hasattr(item, 'metadata') else item.get('metadata', {}).get('size', 0)
                })

        # Sort files by creation time (newest first)
        files.sort(key=lambda x: x.get('created_at', ''), reverse=True)

        logger.info(f"📋 Found {len(files)} files for employee {employee_id}")
        
        return {
            "success": True,
            "employee_id": employee_id,
            "files": files
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"💥 Error listing CVs for {employee_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error listing files: {str(e)}")

# -----------------------------
# Delete CV from Supabase Bucket (FIXED)
# -----------------------------
@router.delete("/delete_cv/")
async def delete_cv(employee_id: str, file_path: str):
    """Delete a specific CV file"""
    try:
        logger.info(f"🗑️ Deleting file: {file_path} for employee: {employee_id}")
        
        # Validate file path belongs to employee
        if not file_path.startswith(f"{employee_id}/"):
            raise HTTPException(status_code=400, detail="File path does not belong to this employee")

        # Delete file from Supabase bucket
        response = supabase.storage.from_(BUCKET_NAME).remove([file_path])

        # Handle response
        result = handle_supabase_response(response, "delete")
        if not result["success"]:
            raise HTTPException(status_code=500, detail=f"Error deleting file: {result.get('error')}")

        logger.info(f"✅ Successfully deleted {file_path}")
        
        return {
            "success": True,
            "message": f"File {file_path} deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"💥 Error deleting file {file_path}: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting file: {str(e)}")

# -----------------------------
# Test Connection (FIXED)
# -----------------------------
@router.get("/test_connection/")
async def test_supabase_connection():
    """Test Supabase connection"""
    try:
        logger.info("🔌 Testing Supabase connection...")
        
        # Simple test - list buckets or try a small operation
        response = supabase.storage.list_buckets()
        
        result = handle_supabase_response(response, "connection_test")
        if result["success"]:
            return {
                "success": True,
                "message": "✅ Supabase connection successful",
                "bucket": BUCKET_NAME
            }
        else:
            return {
                "success": False,
                "error": f"❌ Supabase connection failed: {result.get('error')}"
            }

    except Exception as e:
        logger.error(f"💥 Connection test failed: {e}")
        return {
            "success": False,
            "error": f"❌ Connection test failed: {str(e)}"
        }