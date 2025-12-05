import fitz  # PyMuPDF
from fastapi import APIRouter, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
import pandas as pd
import json
import logging
from typing import List, Dict, Set, Tuple, Optional
from functools import lru_cache
import io
import os
import re
from dataclasses import dataclass

# ============================================
# LOGGING SETUP
# ============================================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("recommendation_logger")

router = APIRouter()

# ============================================
# SUPABASE CONNECTION
# ============================================
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY")  # use the secure key
supabase = create_client(url, key)

# ============================================
# CONSTANTS & CONFIGURATION
# ============================================
SKILL_MAP = {
    "python": {"python", "python3", "python programming", "python basics"},
    "java": {"java", "java basics", "java programming"},
    "javascript": {"javascript", "js", "js programming"},
    "html": {"html", "html5"},
    "css": {"css", "css3"},
    "figma": {"figma", "ui/ux design tool"},
    "kotlin": {"kotlin", "kotlin programming"},
    "api_integration": {"api integration", "api design", "rest api", "rest api integration"},
    "ui": {"ui", "ui design", "user interface"},
    "ux": {"ux", "ux design", "user experience"}
}

EXP_WEIGHT = {"beginner": 1, "intermediate": 2, "advanced": 3}
MANAGER_ROLES = {"pm", "project manager", "proj. mgr.", "rm", "resource manager", "resource lead"}

# Pre-compute normalized skill mapping for faster lookups
NORMALIZED_SKILL_LOOKUP = {}
for normalized, variants in SKILL_MAP.items():
    for variant in variants:
        NORMALIZED_SKILL_LOOKUP[variant] = normalized

# ============================================
# DATA CLASSES
# ============================================
@dataclass
class PDFData:
    text: str
    metadata: Dict
    num_pages: int

# ============================================
# PDF PROCESSING WITH PyMuPDF
# ============================================
def extract_text_from_pdf(pdf_bytes: bytes) -> PDFData:
    """
    Extract text from PDF using PyMuPDF with fallback strategies
    """
    try:
        pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
        num_pages = pdf_document.page_count
        full_text = []
        metadata = {}
        
        # Extract metadata
        doc_metadata = pdf_document.metadata
        if doc_metadata:
            metadata = {
                "title": doc_metadata.get("title", ""),
                "author": doc_metadata.get("author", ""),
                "subject": doc_metadata.get("subject", ""),
                "keywords": doc_metadata.get("keywords", ""),
                "creator": doc_metadata.get("creator", ""),
                "producer": doc_metadata.get("producer", ""),
                "creation_date": doc_metadata.get("creationDate", ""),
                "modification_date": doc_metadata.get("modDate", "")
            }
        
        # Extract text from each page
        for page_num in range(num_pages):
            page = pdf_document[page_num]
            
            # Method 1: Standard text extraction
            text = page.get_text()
            
            # Method 2: If no text found, try with textpage for better extraction
            if not text.strip():
                textpage = page.get_textpage()
                text = textpage.extractText()
            
            # Method 3: If still no text, try OCR-like extraction with blocks
            if not text.strip():
                blocks = page.get_text("blocks")
                text = "\n".join([block[4] for block in blocks if block[4]])
            
            full_text.append(text)
        
        pdf_document.close()
        
        return PDFData(
            text="\n".join(full_text),
            metadata=metadata,
            num_pages=num_pages
        )
        
    except Exception as e:
        logger.error(f"Error extracting PDF text: {str(e)}")
        raise Exception(f"Failed to extract PDF content: {str(e)}")

def extract_text_with_coordinates(pdf_bytes: bytes) -> List[Dict]:
    """
    Extract text with coordinates for structured analysis
    """
    try:
        pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
        structured_data = []
        
        for page_num in range(pdf_document.page_count):
            page = pdf_document[page_num]
            
            # Get text with detailed information
            blocks = page.get_text("dict")["blocks"]
            
            for block in blocks:
                if "lines" in block:
                    for line in block["lines"]:
                        for span in line["spans"]:
                            structured_data.append({
                                "page": page_num + 1,
                                "text": span["text"],
                                "bbox": span["bbox"],
                                "font": span["font"],
                                "size": span["size"],
                                "flags": span["flags"]
                            })
        
        pdf_document.close()
        return structured_data
        
    except Exception as e:
        logger.error(f"Error extracting structured PDF data: {str(e)}")
        return []

def extract_tables_from_pdf(pdf_bytes: bytes) -> List[pd.DataFrame]:
    """
    Extract tables from PDF using PyMuPDF
    """
    try:
        pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
        tables = []
        
        for page_num in range(pdf_document.page_count):
            page = pdf_document[page_num]
            
            # Try to find tables by analyzing the page structure
            tabs = page.find_tables()
            
            if tabs.tables:
                for table in tabs.tables:
                    # Convert table to pandas DataFrame
                    df = table.to_pandas()
                    tables.append(df)
        
        pdf_document.close()
        return tables
        
    except Exception as e:
        logger.error(f"Error extracting tables from PDF: {str(e)}")
        return []

def extract_images_from_pdf(pdf_bytes: bytes) -> List[Dict]:
    """
    Extract images from PDF
    """
    try:
        pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
        images = []
        
        for page_num in range(pdf_document.page_count):
            page = pdf_document[page_num]
            image_list = page.get_images()
            
            for img_index, img in enumerate(image_list):
                xref = img[0]
                base_image = pdf_document.extract_image(xref)
                
                images.append({
                    "page": page_num + 1,
                    "index": img_index,
                    "width": base_image["width"],
                    "height": base_image["height"],
                    "format": base_image["ext"],
                    "data": base_image["image"][:100] if base_image.get("image") else None  # Preview only
                })
        
        pdf_document.close()
        return images
        
    except Exception as e:
        logger.error(f"Error extracting images from PDF: {str(e)}")
        return []

# ============================================
# TEXT ANALYSIS FUNCTIONS
# ============================================
def analyze_resume_text(text: str) -> Dict:
    """
    Analyze resume text to extract skills, experience, and other details
    """
    # Convert to lowercase for case-insensitive matching
    text_lower = text.lower()
    
    # Extract potential skills
    found_skills = []
    for normalized_skill, variants in SKILL_MAP.items():
        for variant in variants:
            if variant in text_lower:
                found_skills.append(normalized_skill)
                break  # Avoid duplicate adds if multiple variants match
    
    # Extract experience level patterns
    experience_level = "beginner"  # default
    exp_patterns = {
        "advanced": r"\b(senior|lead|expert|advanced|10\+|10\+\s*years)\b",
        "intermediate": r"\b(mid-level|intermediate|3-5|3\+|5\+|3-5\s*years)\b",
        "beginner": r"\b(junior|entry-level|fresher|0-2|1-2|0-3\s*years)\b"
    }
    
    for level, pattern in exp_patterns.items():
        if re.search(pattern, text_lower, re.IGNORECASE):
            experience_level = level
            break
    
    # Extract years of experience
    years_exp = 0
    year_patterns = [
        r"(\d+)\s*\+?\s*years?\s*(?:of)?\s*experience",
        r"experience\s*:\s*(\d+)\s*years?",
        r"(\d+)\s*years?\s*(?:of)?\s*exp"
    ]
    
    for pattern in year_patterns:
        match = re.search(pattern, text_lower)
        if match:
            try:
                years_exp = int(match.group(1))
                break
            except:
                pass
    
    # Extract potential job titles (simplified)
    title_keywords = [
        "developer", "engineer", "designer", "analyst", 
        "manager", "architect", "consultant", "specialist"
    ]
    
    possible_titles = []
    for keyword in title_keywords:
        if keyword in text_lower:
            # Look for patterns like "Software Developer" or "Senior Engineer"
            pattern = fr"\b(\w+\s+{keyword}|{keyword}\s+\w+)\b"
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            possible_titles.extend(matches)
    
    return {
        "skills": list(set(found_skills)),
        "experience_level": experience_level,
        "years_experience": years_exp,
        "possible_titles": list(set(possible_titles))[:5],  # Top 5 unique
        "text_length": len(text),
        "unique_words": len(set(text_lower.split()))
    }

# ============================================
# UTILITY FUNCTIONS
# ============================================
@lru_cache(maxsize=512)
def normalize_skill(skill: str) -> str:
    """Cached skill normalization for faster repeated lookups"""
    skill_lower = skill.lower().strip()
    return NORMALIZED_SKILL_LOOKUP.get(skill_lower, skill_lower)

def parse_skills(s) -> List[str]:
    """Fast skill parsing with type checking"""
    if isinstance(s, list):
        return s
    if isinstance(s, str):
        try:
            return json.loads(s)
        except:
            return []
    return []

@lru_cache(maxsize=128)
def normalize_role(title: str) -> str:
    """Cached role normalization"""
    title_lower = title.lower().strip()
    return "manager" if any(role in title_lower for role in MANAGER_ROLES) else "employee"

def normalize_skills_batch(skills_list: List[List[str]]) -> List[Set[str]]:
    """Batch normalize skills for better performance"""
    return [set(normalize_skill(s) for s in skills) for skills in skills_list]

def count_matches_fast(emp_skills_set: Set[str], required_skills_set: Set[str]) -> int:
    """Fast skill matching using pre-normalized sets"""
    return len(emp_skills_set & required_skills_set)

def calculate_assignment_details(assignment_type: str, total_available_hours: int = 40) -> Tuple[int, float, str]:
    """
    Calculate assigned hours, allocation percent, and final assignment type in one pass
    Returns: (assigned_hours, allocation_percent, final_assignment_type)
    """
    is_part_time = assignment_type and assignment_type.lower() == "part-time"
    
    if is_part_time:
        if total_available_hours >= 20:
            assigned_hours, allocation_percent = 20, 50.0
        elif total_available_hours >= 15:
            assigned_hours, allocation_percent = 15, 37.5
        elif total_available_hours >= 5:
            assigned_hours, allocation_percent = 5, 12.5
        else:
            assigned_hours = total_available_hours
            allocation_percent = round((total_available_hours / 40) * 100, 2)
    else:
        assigned_hours = min(total_available_hours, 40)
        allocation_percent = 100.0 if assigned_hours == 40 else round((assigned_hours / 40) * 100, 2)

    final_assignment_type = "Full-Time" if assigned_hours >= 35 else "Part-Time"
    
    return assigned_hours, allocation_percent, final_assignment_type

# ============================================
# PDF PROCESSING ENDPOINT
# ============================================
@router.post("/process-resume/")
async def process_resume(file: UploadFile = File(...)):
    """
    Process resume PDF and extract information
    """
    try:
        logger.info(f"Processing resume: {file.filename}")
        
        # Read PDF file
        pdf_bytes = await file.read()
        
        # Extract text from PDF
        pdf_data = extract_text_from_pdf(pdf_bytes)
        
        # Analyze resume content
        analysis = analyze_resume_text(pdf_data.text)
        
        # Optional: Extract tables (if needed)
        tables = extract_tables_from_pdf(pdf_bytes)
        
        # Optional: Extract images (preview only)
        images = extract_images_from_pdf(pdf_bytes)
        
        return {
            "filename": file.filename,
            "num_pages": pdf_data.num_pages,
            "metadata": pdf_data.metadata,
            "analysis": analysis,
            "extracted_tables": len(tables),
            "extracted_images": len(images),
            "text_preview": pdf_data.text[:1000] + "..." if len(pdf_data.text) > 1000 else pdf_data.text
        }
        
    except Exception as e:
        logger.error(f"Error processing resume: {str(e)}")
        return {"error": str(e)}

# ============================================
# MAIN RECOMMENDATION ENDPOINT
# ============================================
@router.post("/recommendations/{project_id}")
def get_recommendations(project_id: int):
    logger.info("Fetching project requirements for project_id=%s", project_id)
    
    # Fetch project requirements
    project_req = supabase.table("project_requirements").select("*")\
        .eq("project_id", project_id).execute().data
    
    if not project_req:
        logger.info("No project requirements found for project_id=%s", project_id)
        return {"recommendations": []}

    # Convert to DataFrame and normalize skills
    projects = pd.DataFrame(project_req)
    projects['required_skills_normalized'] = projects['required_skills'].apply(
        lambda skills: set(normalize_skill(s) for s in skills)
    )

    # Fetch all employees
    users = supabase.table("user_details").select("*").execute().data
    if not users:
        logger.info("No employees found in the database.")
        return {"recommendations": []}

    # Prepare employees DataFrame
    employees = pd.DataFrame(users)
    
    # Set default values for missing columns
    default_columns = {
        "skills": [],
        "total_available_hours": 40,
        "job_title": "",
        "status": "",
        "experience_level": ""
    }
    
    for col, default_val in default_columns.items():
        if col not in employees.columns:
            employees[col] = default_val

    # Parse and normalize skills efficiently
    employees['skills_parsed'] = employees['skills'].apply(parse_skills)
    employees['skills_normalized'] = employees['skills_parsed'].apply(
        lambda skills: set(normalize_skill(s) for s in skills)
    )
    
    # Normalize roles
    employees['role'] = employees['job_title'].apply(normalize_role)
    
    # Filter eligible employees once
    eligible_employees = employees[
        (employees['role'] == "employee") & 
        (employees['status'].str.lower() == "available")
    ].copy()

    logger.info("Eligible employees after filtering: %d found", len(eligible_employees))

    if eligible_employees.empty:
        logger.info("No eligible employees available.")
        return {"recommendations": []}

    # Pre-compute experience level groups for faster filtering
    exp_groups = {
        level: group for level, group in 
        eligible_employees.groupby(eligible_employees['experience_level'].str.lower())
    }

    def recommend_employees_optimized(project_row):
        """Optimized recommendation function with pre-computed data"""
        exp_level = project_row['experience_level'].lower()
        required_skills_set = project_row['required_skills_normalized']
        
        logger.info("Evaluating requirement: %s (%s)", 
                   project_row['required_skills'], exp_level)
        
        # Get candidates from pre-grouped data
        candidates = exp_groups.get(exp_level)
        
        if candidates is None or candidates.empty:
            logger.debug("No candidates found for experience level: %s", exp_level)
            return []

        # Vectorized skill matching
        candidates = candidates.copy()
        candidates['match_count'] = candidates['skills_normalized'].apply(
            lambda emp_skills: count_matches_fast(emp_skills, required_skills_set)
        )
        
        # Filter and score in one pass
        candidates = candidates[candidates['match_count'] > 0].copy()
        candidates['score'] = candidates['match_count'] * EXP_WEIGHT.get(exp_level, 1)
        
        # Sort and limit
        candidates = candidates.nlargest(project_row['quantity_needed'], 'score')

        # Build recommendations
        recommended_list = []
        preferred_type = project_row.get('preferred_assignment_type', 'Full-Time')
        
        for _, emp in candidates.iterrows():
            total_hours = emp.get('total_available_hours', 40)
            assigned_hours, allocation_percent, final_type = calculate_assignment_details(
                preferred_type, total_hours
            )

            recommended_list.append({
                'employee_id': emp['employee_id'],
                'user_id': emp['id'],
                'assignment_type': final_type,
                'assigned_hours': assigned_hours,
                'allocation_percent': allocation_percent,
                'total_available_hours': total_hours
            })

        logger.info("Recommended %d employees for %s", 
                   len(recommended_list), project_row['required_skills'])
        return recommended_list

    # Apply recommendations
    projects['recommended_employees'] = projects.apply(
        recommend_employees_optimized, axis=1
    )

    # Return results
    return {
        "recommendations": projects[[
            'experience_level', 
            'required_skills', 
            'preferred_assignment_type', 
            'recommended_employees'
        ]].to_dict(orient='records')
    }

# ============================================
# ENHANCED RESUME PROCESSING ENDPOINT
# ============================================
@router.post("/process-resume-enhanced/")
async def process_resume_enhanced(file: UploadFile = File(...)):
    """
    Enhanced resume processing with PyMuPDF
    """
    try:
        logger.info(f"Processing resume (enhanced): {file.filename}")
        
        # Read PDF file
        pdf_bytes = await file.read()
        
        # Extract text and metadata
        pdf_data = extract_text_from_pdf(pdf_bytes)
        
        # Extract structured text with coordinates
        structured_data = extract_text_with_coordinates(pdf_bytes)
        
        # Analyze resume content
        analysis = analyze_resume_text(pdf_data.text)
        
        # Extract tables
        tables = extract_tables_from_pdf(pdf_bytes)
        table_data = []
        for i, table in enumerate(tables):
            table_data.append({
                "table_index": i,
                "shape": table.shape,
                "columns": list(table.columns),
                "preview": table.head(3).to_dict(orient='records')
            })
        
        # Extract images
        images = extract_images_from_pdf(pdf_bytes)
        
        # Generate statistics
        word_count = len(pdf_data.text.split())
        char_count = len(pdf_data.text)
        paragraph_count = len([p for p in pdf_data.text.split('\n\n') if p.strip()])
        
        return {
            "filename": file.filename,
            "num_pages": pdf_data.num_pages,
            "metadata": pdf_data.metadata,
            "analysis": analysis,
            "statistics": {
                "word_count": word_count,
                "character_count": char_count,
                "paragraph_count": paragraph_count,
                "tables_found": len(tables),
                "images_found": len(images),
                "structured_blocks": len(structured_data)
            },
            "tables": table_data,
            "images_preview": [{"page": img["page"], "dimensions": f"{img['width']}x{img['height']}"} 
                              for img in images[:5]],  # First 5 images only
            "text_sample": pdf_data.text[:500]  # First 500 chars
        }
        
    except Exception as e:
        logger.error(f"Error in enhanced resume processing: {str(e)}")
        return {"error": str(e)}

# ============================================
# BULK PDF PROCESSING ENDPOINT
# ============================================
@router.post("/process-multiple-resumes/")
async def process_multiple_resumes(files: List[UploadFile] = File(...)):
    """
    Process multiple resumes in bulk
    """
    results = []
    
    for file in files:
        try:
            pdf_bytes = await file.read()
            pdf_data = extract_text_from_pdf(pdf_bytes)
            analysis = analyze_resume_text(pdf_data.text)
            
            results.append({
                "filename": file.filename,
                "status": "success",
                "num_pages": pdf_data.num_pages,
                "analysis": analysis
            })
            
        except Exception as e:
            results.append({
                "filename": file.filename,
                "status": "error",
                "error": str(e)
            })
    
    return {
        "total_files": len(files),
        "successful": len([r for r in results if r["status"] == "success"]),
        "failed": len([r for r in results if r["status"] == "error"]),
        "results": results
    }