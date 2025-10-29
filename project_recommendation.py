from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
import pandas as pd
import json
import logging

# --- Logging setup ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("recommendation_logger")

app = FastAPI()

# --- CORS setup ---
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    count = 0
    for req in required_skills:
        for emp_skill in emp_skills:
            if req in emp_skill:  # partial match
                count += 1
    return count

@app.get("/recommendations/{project_id}")
def get_recommendations(project_id: int):
    # --- Fetch project requirements ---
    project_req = supabase.table("project_requirements").select("*")\
        .eq("project_id", project_id).execute().data
    if not project_req:
        logger.info("No project requirements found for project_id=%s", project_id)
        return {"recommendations": []}

    projects = pd.DataFrame(project_req)
    projects['required_skills'] = projects['required_skills'].apply(lambda skills: [normalize_skill(s) for s in skills])

    # --- Fetch employees ---
    users = supabase.table("user_details").select("*").execute().data
    if not users:
        logger.info("No employees found in the database.")
        return {"recommendations": []}

    employees = pd.DataFrame(users)

    # Ensure necessary columns
    for col in ["job_title", "status", "experience_level", "skills", "employee_id"]:
        if col not in employees.columns:
            employees[col] = "" if col != "skills" else []

    # Parse and normalize skills
    employees['skills'] = employees['skills'].apply(parse_skills)
    employees['skills'] = employees['skills'].apply(lambda skills: [normalize_skill(s) for s in skills])

    # Normalize roles and filter managers & availability
    employees['role'] = employees['job_title'].apply(normalize_role)
    eligible_employees = employees[
        (employees['role'] == "employee") &
        (employees['status'].str.lower() == "available")
    ].copy()

    logger.info("Eligible employees after filtering managers and availability:\n%s",
                eligible_employees[['employee_id','job_title','experience_level','skills']])

    # --- Recommendation function ---
    def recommend_employees(project_row):
        # Filter candidates by experience level
        candidates = eligible_employees[
            eligible_employees['experience_level'].str.lower() ==
            project_row['experience_level'].lower()
        ].copy()

        # Compute skill match count
        candidates['match_count'] = candidates['skills'].apply(
            lambda s: count_matches(s, project_row['required_skills'])
        )

        # Compute weighted score: match_count × experience weight
        candidates['score'] = candidates['match_count'] * EXP_WEIGHT.get(project_row['experience_level'].lower(), 1)

        # Sort candidates by score descending
        candidates = candidates.sort_values(by='score', ascending=False)

        # Only consider candidates with at least 1 skill match
        eligible_for_recommendation = candidates[candidates['match_count'] > 0]

        # Pick top N based on quantity_needed
        recommended = eligible_for_recommendation.head(project_row['quantity_needed'])

        recommended_ids = recommended['employee_id'].tolist()

        # Debug log
        logger.info(
            "Project requirement: %s - %s\nCandidates with scores:\n%s\nRecommended IDs: %s",
            project_row['experience_level'],
            project_row['required_skills'],
            candidates[['employee_id','experience_level','skills','match_count','score']],
            recommended_ids
        )

        return recommended_ids

    # Apply recommendation per project requirement row
    projects['recommended_employees'] = projects.apply(recommend_employees, axis=1)

    # Return response
    return {
        "recommendations": projects[
            ['experience_level', 'required_skills', 'recommended_employees']
        ].to_dict(orient='records')
    }
