from fastapi import APIRouter
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
import pandas as pd
import json
import logging
from typing import List, Dict, Set, Tuple
from functools import lru_cache

# ============================================
# LOGGING SETUP
# ============================================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("recommendation_logger")

router = APIRouter()

# ============================================
# SUPABASE CONNECTION
# ============================================
url = "https://edzqjailcajqxwxjxidg.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkenFqYWlsY2FqcXh3eGp4aWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNTE2NTQsImV4cCI6MjA3NjYyNzY1NH0.BKKCyEjW-l_CpOMKnpuAPO9ZCuBSL0Hr2lgAZjIeqb0"
supabase: Client = create_client(url, key)

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