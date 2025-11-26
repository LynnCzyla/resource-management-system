from fastapi import APIRouter
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
import pandas as pd
import json
import logging

# --- Logging setup ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("recommendation_logger")

router = APIRouter()

# --- Supabase connection ---
url = "https://edzqjailcajqxwxjxidg.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkenFqYWlsY2FqcXh3eGp4aWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNTE2NTQsImV4cCI6MjA3NjYyNzY1NH0.BKKCyEjW-l_CpOMKnpuAPO9ZCuBSL0Hr2lgAZjIeqb0"
supabase: Client = create_client(url, key)

# --- Skill mapping for normalization ---
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

# Experience weight for scoring
EXP_WEIGHT = {"beginner": 1, "intermediate": 2, "advanced": 3}

# Role normalization
MANAGER_ROLES = {"pm", "project manager", "proj. mgr.", "rm", "resource manager", "resource lead"}

def normalize_skill(skill: str) -> str:
    skill = skill.lower().strip()
    for normalized, variants in SKILL_MAP.items():
        if any(variant in skill for variant in variants):
            return normalized
    return skill

def parse_skills(s):
    if isinstance(s, str):
        try:
            return json.loads(s)
        except:
            return []
    elif isinstance(s, list):
        return s
    return []

def normalize_role(title: str) -> str:
    title = title.lower().strip()
    for role in MANAGER_ROLES:
        if role in title:
            return "manager"
    return "employee"

def count_matches(emp_skills, required_skills):
    emp_skills_set = set([normalize_skill(s) for s in emp_skills])
    required_skills_set = set([normalize_skill(s) for s in required_skills])
    matches = emp_skills_set.intersection(required_skills_set)
    logger.debug("Employee skills: %s, Required skills: %s, Matches: %s", emp_skills_set, required_skills_set, matches)
    return len(matches)


def calculate_assigned_hours_and_allocation(assignment_type: str, total_available_hours: int = 40):
    assigned_hours, allocation_percent = 0, 0
    if assignment_type and assignment_type.lower() == "part-time":
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

    logger.debug(
        "Assignment type: '%s', Total available hours: %d -> Assigned Hours: %d, Allocation Percent: %.2f%%",
        assignment_type, total_available_hours, assigned_hours, allocation_percent
    )
    return assigned_hours, allocation_percent

def determine_assignment_type(assigned_hours: int) -> str:
    return "Full-Time" if assigned_hours >= 35 else "Part-Time"

@router.post("/recommendations/{project_id}")
def get_recommendations(project_id: int):
    logger.info("Fetching project requirements for project_id=%s", project_id)
    project_req = supabase.table("project_requirements").select("*")\
        .eq("project_id", project_id).execute().data
    if not project_req:
        logger.info("No project requirements found for project_id=%s", project_id)
        return {"recommendations": []}

    projects = pd.DataFrame(project_req)
    projects['required_skills'] = projects['required_skills'].apply(lambda skills: [normalize_skill(s) for s in skills])

    users = supabase.table("user_details").select("*").execute().data
    if not users:
        logger.info("No employees found in the database.")
        return {"recommendations": []}

    employees = pd.DataFrame(users)
    for col in ["job_title", "status", "experience_level", "skills", "employee_id", "total_available_hours"]:
        if col not in employees.columns:
            if col == "skills":
                employees[col] = []
            elif col == "total_available_hours":
                employees[col] = 40
            else:
                employees[col] = ""

    employees['skills'] = employees['skills'].apply(parse_skills)
    employees['skills'] = employees['skills'].apply(lambda skills: [normalize_skill(s) for s in skills])
    employees['role'] = employees['job_title'].apply(normalize_role)
    eligible_employees = employees[
        (employees['role'] == "employee") & (employees['status'].str.lower() == "available")
    ].copy()

    logger.info("Eligible employees after filtering managers and availability:\n%s",
                eligible_employees[['employee_id','job_title','experience_level','skills']])

    def recommend_employees(project_row):
        logger.info("Evaluating project requirement: %s", project_row.to_dict())
        
        candidates = eligible_employees[
            eligible_employees['experience_level'].str.lower() == project_row['experience_level'].lower()
        ].copy()
        logger.debug("Candidates filtered by experience level (%s): %d found", project_row['experience_level'], len(candidates))

        candidates['match_count'] = candidates['skills'].apply(lambda s: count_matches(s, project_row['required_skills']))
        candidates['score'] = candidates['match_count'] * EXP_WEIGHT.get(project_row['experience_level'].lower(), 1)
        candidates = candidates.sort_values(by='score', ascending=False)

        logger.debug("Candidates with match_count and score:\n%s", candidates[['employee_id','skills','match_count','score']])

        eligible_for_recommendation = candidates[candidates['match_count'] > 0]
        recommended = eligible_for_recommendation.head(project_row['quantity_needed'])

        recommended_list = []
        for _, emp in recommended.iterrows():
            total_hours = emp.get('total_available_hours', 40)
            assigned_hours, allocation_percent = calculate_assigned_hours_and_allocation(
                project_row.get('preferred_assignment_type', 'Full-Time'),
                total_hours
            )
            final_assignment_type = determine_assignment_type(assigned_hours)

            logger.info(
                "Employee %s assigned: %d hours (%s) with %.2f%% allocation",
                emp['employee_id'], assigned_hours, final_assignment_type, allocation_percent
            )

            recommended_list.append({
                'employee_id': emp['employee_id'],
                'user_id': emp['id'],
                'assignment_type': final_assignment_type,
                'assigned_hours': assigned_hours,
                'allocation_percent': allocation_percent,
                'total_available_hours': total_hours
            })

        logger.info("Recommended employees for requirement %s: %s", project_row['required_skills'], recommended_list)
        return recommended_list

    projects['recommended_employees'] = projects.apply(recommend_employees, axis=1)

    return {
        "recommendations": projects[
            ['experience_level', 'required_skills', 'preferred_assignment_type', 'recommended_employees']
        ].to_dict(orient='records')
    }
