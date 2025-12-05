// OPTIMIZED RESOURCE MANAGEMENT (RM) project.js

// ---------- Imports ----------
import { supabase } from "../../supabaseClient.js";
import bcrypt from "https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/+esm";

// ============================================
// CONSTANTS & CONFIG
// ============================================
const CONFIG = {
    DEBOUNCE_DELAY: 300,
    MESSAGE_TIMEOUT: 5000,
    API_TIMEOUT: 10000,
    API_BASE_URL: 'http://127.0.0.1:8000'
};

const STATUS_COLORS = {
    active: '#7ED321',
    pending: '#F5A623',
    completed: '#4A90E2'
};

const MESSAGE_ICONS = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
const debounce = (func, delay = CONFIG.DEBOUNCE_DELAY) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
};

const capitalize = str => str ? str.charAt(0).toUpperCase() + str.slice(1) : "";

const formatDate = dateString => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', { 
        year: 'numeric', month: 'short', day: 'numeric' 
    });
};

// ============================================
// USER DISPLAY
// ============================================
async function updateUserNameDisplayEnhanced() {
    const userNameElement = document.getElementById('userName');
    const userAvatarElement = document.querySelector('.user-avatar');
    
    if (!userNameElement) return console.warn('[USER DISPLAY] userName element not found');

    try {
        const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || '{}');
        let displayName = loggedUser.name || '';
        
        if (!displayName && loggedUser.email) {
            try {
                const { data: userData, error } = await supabase
                    .from('users')
                    .select('name')
                    .eq('email', loggedUser.email)
                    .single();
                
                if (!error && userData?.name) {
                    displayName = userData.name;
                    loggedUser.name = displayName;
                    localStorage.setItem('loggedUser', JSON.stringify(loggedUser));
                } else {
                    displayName = loggedUser.email.split('@')[0];
                }
            } catch {
                displayName = loggedUser.email.split('@')[0];
            }
        }
        
        displayName = displayName || 'Project Manager';
        userNameElement.textContent = displayName;
        
        if (userAvatarElement) {
            const initials = displayName.split(' ')
                .map(word => word.charAt(0).toUpperCase())
                .join('')
                .substring(0, 2);
            
            userAvatarElement.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=000&color=fff`;
            userAvatarElement.alt = initials;
        }
    } catch (error) {
        console.error('[USER DISPLAY] Error:', error);
        userNameElement.textContent = 'Project Manager';
    }
}

// ============================================
// MODAL MANAGER
// ============================================
class ModalManager {
    static openModals = new Map();
    static focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    static show(modalId, triggerElement = null) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        if (triggerElement) this.openModals.set(modalId, triggerElement);

        modal.classList.add('active');
        modal.removeAttribute('aria-hidden');
        modal.inert = false;
        document.body.style.overflow = 'hidden';

        const focusable = modal.querySelector(this.focusableSelector);
        focusable?.focus();

        modal.addEventListener('keydown', this._trapFocus);
    }

    static hide(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.removeEventListener('keydown', this._trapFocus);

        const trigger = this.openModals.get(modalId);
        trigger?.focus();
        this.openModals.delete(modalId);

        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        modal.inert = true;
        document.body.style.overflow = '';
    }

    static _trapFocus = (e) => {
        if (e.key !== 'Tab') return;

        const focusable = Array.from(
            e.currentTarget.querySelectorAll(ModalManager.focusableSelector)
        ).filter(el => !el.disabled);

        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    };

    static showLoading() { this.show('loadingOverlay'); }
    static hideLoading() { this.hide('loadingOverlay'); }
}

// ============================================
// MESSAGE MANAGER
// ============================================
class MessageManager {
    static show(message, type = 'info') {
        const container = document.getElementById('messageContainer');
        if (!container) return;

        const messageBox = document.createElement('div');
        messageBox.className = `message-box ${type}`;
        messageBox.innerHTML = `
            <i class="fas ${MESSAGE_ICONS[type]}"></i>
            <span>${message}</span>
            <button class="message-close"><i class="fas fa-times"></i></button>
        `;

        messageBox.querySelector('.message-close').addEventListener('click', () => messageBox.remove());
        container.appendChild(messageBox);
        setTimeout(() => messageBox.remove(), CONFIG.MESSAGE_TIMEOUT);
    }

    static success(msg) { this.show(msg, 'success'); }
    static error(msg) { this.show(msg, 'error'); }
    static warning(msg) { this.show(msg, 'warning'); }
    static info(msg) { this.show(msg, 'info'); }
}

// ============================================
// DATA SERVICE
// ============================================
class DataService {
    constructor() {
        this.projects = [];
        this.assignedEmployees = {};
        this.cache = { employees: null, timestamp: 0 };
    }

    async getAllEmployees(forceRefresh = false) {
        const CACHE_DURATION = 60000; // 1 minute
        const now = Date.now();
        
        if (!forceRefresh && this.cache.employees && (now - this.cache.timestamp < CACHE_DURATION)) {
            return this.cache.employees;
        }

        const { data, error } = await supabase
            .from('user_details')
            .select(`
                employee_id, job_title, department, status, experience_level, 
                skills, total_available_hours,
                users:user_id(id, name, email)
            `);
      
        if (error) throw error;
        
        this.cache.employees = data;
        this.cache.timestamp = now;
        return data;
    }

    async getAllProjects() {
        const { data: allProjects, error } = await supabase
            .from('projects')
            .select(`
                id, name, status, start_date, end_date, duration_days,
                project_requirements(quantity_needed)
            `)
            .not('status', 'in', '("completed","cancelled")');

        if (error) throw error;

        const projectsArray = allProjects.map(proj => ({
            projectId: proj.id,
            projectName: proj.name,
            projectStatus: proj.status,
            teamSize: (proj.project_requirements || []).reduce((sum, r) => sum + (r.quantity_needed || 0), 0),
            startDate: proj.start_date,
            deadline: proj.end_date,
            durationDays: proj.duration_days
        }));
        
        // Batch fetch assignments and requests
        const projectIds = projectsArray.map(p => p.projectId);
        
        const [assignmentsData, requestsData] = await Promise.all([
            supabase.from('project_assignments')
                .select('project_id, id')
                .in('project_id', projectIds)
                .eq('status', 'assigned'),
            supabase.from('resource_requests')
                .select('project_id, status')
                .in('project_id', projectIds)
                .eq('status', 'approved')
        ]);

        const assignmentMap = new Map();
        const requestMap = new Set();

        if (!assignmentsData.error) {
            assignmentsData.data.forEach(a => {
                assignmentMap.set(a.project_id, (assignmentMap.get(a.project_id) || 0) + 1);
            });
        }

        if (!requestsData.error) {
            requestsData.data.forEach(r => requestMap.add(r.project_id));
        }

        projectsArray.forEach(project => {
            project.assignedCount = assignmentMap.get(project.projectId) || 0;
            project.isApproved = requestMap.has(project.projectId);
        });

        return projectsArray;
    }

    async getProjectById(id) {
        const { data, error } = await supabase
            .from('projects')
            .select(`
                id, name, description, start_date, end_date, duration_days, status, created_by,
                users:created_by(id, name),
                project_requirements(id, experience_level, quantity_needed, required_skills, preferred_assignment_type)
            `)
            .eq('id', id)
            .single();
      
        if (error) throw error;
        return data;
    }

    async preloadAssignedEmployees(projectId) {
        const { data, error } = await supabase
            .from('project_assignments')
            .select('user_id')
            .eq('project_id', projectId)
            .eq('status', 'assigned');

        if (error) {
            console.warn("Failed to load assignments:", error);
            this.assignedEmployees[projectId] = new Set();
            return;
        }

        this.assignedEmployees[projectId] = new Set(data.map(d => String(d.user_id)));
        console.log(`[RM] Preloaded ${data.length} assignments for project ${projectId}`);
    }

    getAssignableCount(projectId) {
        const assigned = this.assignedEmployees[projectId]?.size || 0;
        const project = this.projects?.find(p => p.projectId === projectId);
        return project ? Math.max(project.teamSize - assigned, 0) : 0;
    }

    async getActiveAssignments(userId) {
        const { data, error } = await supabase
            .from("project_assignments")
            .select("*")
            .eq("user_id", userId)
            .eq("status", "assigned");
      
        if (error) throw error;
        return data.length;
    }
}

// ============================================
// UI MANAGER
// ============================================
class UIManager {
    constructor(dataService) {
        this.dataService = dataService;
    }

    renderProjects(projects) {
        const tbody = document.getElementById('projectsTableBody');
        if (!tbody) return;

        if (!projects.length) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No projects found</td></tr>';
            return;
        }

        const fragment = document.createDocumentFragment();
        projects.forEach(proj => fragment.appendChild(this.createProjectRow(proj)));
        tbody.innerHTML = '';
        tbody.appendChild(fragment);
    }

    createProjectRow(proj) {
        const tr = document.createElement('tr');
        tr.dataset.id = proj.projectId;
        
        const assignedCount = proj.assignedCount || 0;
        const totalNeeded = proj.teamSize || 0;
        const teamStyle = assignedCount >= totalNeeded && totalNeeded > 0 
            ? 'color: #2E7D32; font-weight: 600;'
            : assignedCount > 0 ? 'color: #F5A623; font-weight: 600;' : '';

        const isInactive = proj.projectStatus === 'completed' || proj.projectStatus === 'cancelled';
        const editBtnAttrs = isInactive 
            ? 'disabled style="opacity: 0.5; cursor: not-allowed;" title="Cannot assign team - Project is ' + proj.projectStatus + '"'
            : `onclick="app.editProject(${proj.projectId})"`;

        tr.innerHTML = `
            <td><strong>${proj.projectName}</strong></td>
            <td><span class="project-status ${proj.projectStatus}">${capitalize(proj.projectStatus)}</span></td>
            <td style="${teamStyle}">${assignedCount}/${totalNeeded} members</td>
            <td style="text-align: center;">${proj.durationDays ? proj.durationDays + ' days' : '-'}</td>
            <td>${formatDate(proj.startDate)}</td>
            <td>${formatDate(proj.deadline)}</td>
            <td>
                <div class="action-buttons">
                    <button class="icon-btn" title="View" onclick="app.viewProject(${proj.projectId})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <div class="action-btn-with-badge">
                        <button class="icon-btn" title="Assign Team" ${editBtnAttrs}>
                            <i class="fas fa-user-plus"></i>
                        </button>
                    </div>
                </div>
            </td>
        `;
        
        return tr;
    }

    renderSkillsList(container, skills) {
        if (!container) return;

        if (!Array.isArray(skills) || !skills.length) {
            container.innerHTML = '<p>No project requirements listed.</p>';
            return;
        }

        container.innerHTML = skills.map(skill => {
            const quantity = skill.quantity_needed || 0;
            const level = skill.experience_level || 'Any';
            const requiredSkills = (skill.required_skills || []).join(', ') || 'General';
            return `<li>${quantity} ${level} (${requiredSkills})</li>`;
        }).join('');
    }

    renderEmployeesList(container, employees) {
        if (!container) return;

        if (!employees.length) {
            container.innerHTML = '<p style="text-align: center; color: #6C757D; padding: 20px;">No employees found</p>';
            return;
        }

        const fragment = document.createDocumentFragment();
        employees.forEach((emp, idx) => fragment.appendChild(this.createEmployeeCard(emp, idx)));
        container.innerHTML = '';
        container.appendChild(fragment);
    }

    createEmployeeCard(emp, index) {
        const employeeId = emp.employee_id || emp.id || '';
        const userId = (emp.users?.id) || emp.user_id || '';
        const name = (emp.users?.name) || emp.name || 'Unknown';
        const role = emp.job_title || emp.role || 'No Role';
        const skills = Array.isArray(emp.skills) ? emp.skills : [];
        const statusText = capitalize((emp.status || 'Unknown').toString().trim());
        
        const assignmentType = emp.assignment_type || 'Full-Time';
        const assignedHours = emp.assigned_hours || 40;
        const allocationPercent = emp.allocation_percent || 100;

        const card = document.createElement('div');
        card.className = 'recommendation-card';
        if (employeeId) card.dataset.empId = String(employeeId);

        const statusKey = statusText.toLowerCase();
        const statusColors = {
            available: ['#E8F5E9', '#2E7D32'],
            busy: ['#FFEBEE', '#B71C1C'],
            unknown: ['#E0E0E0', '#424242']
        };
        const [bgColor, textColor] = statusColors[statusKey] || statusColors.unknown;

        card.innerHTML = `
            <input type="checkbox" class="employee-checkbox" 
                data-user-id="${userId}" 
                data-emp-id="${employeeId}"
                data-assignment-type="${assignmentType}"
                data-assigned-hours="${assignedHours}"
                data-allocation-percent="${allocationPercent}">
            <span class="employee-number">${index + 1}.</span>
            <img src="${emp.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`}" 
                alt="${name}" class="employee-avatar-circle">
            <div class="recommendation-details">
                <h4>${name}</h4>
                <p>${role}</p>
                <div class="assignment-info" style="display: flex; gap: 8px; margin-top: 4px; font-size: 12px;">
                    <span class="hours-badge" style="background: #E3F2FD; color: #1976D2; padding: 2px 8px; border-radius: 12px; font-weight: 500;">
                        ${assignedHours}h/week
                    </span>
                    <span class="type-badge" style="background: #F3E5F5; color: #7B1FA2; padding: 2px 8px; border-radius: 12px; font-weight: 500;">
                        ${assignmentType}
                    </span>
                    <span class="allocation-badge" style="background: #E8F5E9; color: #2E7D32; padding: 2px 8px; border-radius: 12px; font-weight: 500;">
                        ${allocationPercent}%
                    </span>
                </div>
                <div class="recommendation-skills">
                    ${(skills.length ? skills : ['General']).slice(0, 4).map(s => 
                        `<span class="skill-tag">${s}</span>`
                    ).join('')}
                </div>
            </div>
            <span class="match-score" style="background-color: ${bgColor}; color: ${textColor};">
                ${statusText}
            </span>
        `;

        return card;
    }
}

// ============================================
// PROJECT APP
// ============================================
class ProjectApp {
    constructor() {
        this.dataService = new DataService();
        this.uiManager = new UIManager(this.dataService);
        
        this.debouncedSearch = debounce(() => this.filterProjects());
        this.debouncedEmployeeFilter = debounce(() => this.filterEmployees());

        this.assignedEmployees = {};
        this.projects = [];
        this.allEmployees = [];
        this.recommendedEmployees = [];
        this.recommendedIds = [];
        this.currentProjectId = null;
        this.currentProjectTotalNeeded = 0;
    }

    async init() {
        this.setupEventListeners();
        await Promise.all([
            this.loadProjects(),
            updateUserNameDisplayEnhanced()
        ]);
    }

    setupEventListeners() {
        const events = {
            'logoutBtn': { event: 'click', handler: () => this.openLogoutModal() },
            'projectSearch': { event: 'input', handler: () => this.debouncedSearch() },
            'closeViewProjectModal': { event: 'click', handler: () => ModalManager.hide('viewProjectModal') },
            'closeViewProject': { event: 'click', handler: () => ModalManager.hide('viewProjectModal') },
            'closeEditModal': { event: 'click', handler: () => ModalManager.hide('editProjectModal') },
            'cancelEditModal': { event: 'click', handler: () => ModalManager.hide('editProjectModal') },
            'saveProjectTeam': { event: 'click', handler: () => this.saveSelectedEmployees() },
            'employeeSearchFilter': { event: 'input', handler: () => this.debouncedEmployeeFilter() },
            'availabilityFilter': { event: 'change', handler: () => this.filterEmployees() },
            'cancelLogout': { event: 'click', handler: () => ModalManager.hide('logoutModal') },
            'confirmLogout': { event: 'click', handler: () => this.handleLogout() }
        };

        Object.entries(events).forEach(([id, { event, handler }]) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener(event, handler);
        });

        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        });
    }

    openLogoutModal() {
        ModalManager.show('logoutModal');
    }

    async handleLogout() {
        ModalManager.hide('logoutModal');
        ModalManager.showLoading();

        setTimeout(() => {
            ModalManager.hideLoading();
            MessageManager.success('You have been logged out successfully.');
            localStorage.removeItem('loggedUser');
            window.location.href = '/login/HTML_Files/login.html';
        }, 1000);
    }

    async loadProjects() {
        try {
            const projects = await this.dataService.getAllProjects();
            this.dataService.projects = projects.map(proj => ({
                projectId: proj.projectId,
                teamSize: proj.teamSize
            }));
            this.projects = projects;
            this.uiManager.renderProjects(projects);
        } catch (error) {
            console.error('Error loading projects:', error);
            MessageManager.error('Failed to load projects');
        }
    }

    async filterProjects() {
        try {
            const searchInput = document.getElementById('projectSearch');
            if (!searchInput) return;
            
            const query = searchInput.value.toLowerCase().trim();
            const projects = await this.dataService.getAllProjects();
            
            if (!query) {
                this.uiManager.renderProjects(projects);
                return;
            }
            
            const filtered = projects.filter(proj =>
                proj.projectName.toLowerCase().includes(query) ||
                proj.projectStatus.toLowerCase().includes(query) ||
                proj.projectId.toString().includes(query)
            );
            
            this.uiManager.renderProjects(filtered);
        } catch (error) {
            console.error('Error filtering:', error);
            MessageManager.error('Error searching projects');
        }
    }

    async viewProject(id) {
        try {
            ModalManager.showLoading();
            const project = await this.dataService.getProjectById(id);
            ModalManager.hideLoading();
        
            if (!project) {
                MessageManager.error('Project not found');
                return;
            }
        
            const statusEl = document.getElementById('viewProjectStatus');
            statusEl.textContent = capitalize(project.status || 'pending');
            statusEl.style.color = STATUS_COLORS[project.status] || '#6C757D';
        
            const totalNeeded = project.project_requirements
                ? project.project_requirements.reduce((sum, req) => sum + (req.quantity_needed || 0), 0)
                : 0;
        
            const updates = {
                'viewProjectName': project.name || 'Untitled Project',
                'viewProjectId': project.id,
                'viewProjectManager': project.users?.name || 'Unassigned',
                'viewProjectTeamSize': `${totalNeeded} members`,
                'viewProjectStartDate': formatDate(project.start_date),
                'viewProjectDeadline': formatDate(project.end_date),
                'viewProjectDuration': project.duration_days ? `${project.duration_days} days` : 'Not specified'
            };

            Object.entries(updates).forEach(([id, value]) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            });
        
            this.uiManager.renderSkillsList(
                document.getElementById('viewProjectSkills'),
                project.project_requirements || []
            );
        
            ModalManager.show('viewProjectModal');
        } catch (error) {
            ModalManager.hideLoading();
            console.error('Error viewing project:', error);
            MessageManager.error('Failed to load project details');
        }
    }

    async editProject(projectId) {
        try {
            ModalManager.showLoading();
            
            const { data: projectCheck, error: checkError } = await supabase
                .from('projects')
                .select('status')
                .eq('id', projectId)
                .single();

            if (checkError) throw checkError;

            if (projectCheck.status === 'completed' || projectCheck.status === 'cancelled') {
                ModalManager.hideLoading();
                MessageManager.error(`Cannot edit this project - it is ${projectCheck.status}`);
                return;
            }

            this.assignedEmployees[projectId] = new Set();
            this.currentProjectId = projectId;
            
            const selectedCountEl = document.getElementById("selectedCount");
            if (selectedCountEl) selectedCountEl.textContent = 0;

            await this.preloadAssignedEmployees(projectId);

            const [project, employees] = await Promise.all([
                this.dataService.getProjectById(projectId),
                this.dataService.getAllEmployees()
            ]);

            let recommendedEmployees = [];
            let recommendationsFailed = false;
            
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);
                
                const res = await fetch(`${CONFIG.API_BASE_URL}/recommendations/${projectId}`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!res.ok) {
                    recommendationsFailed = true;
                } else {
                    const data = await res.json();
                    if (data.recommendations && Array.isArray(data.recommendations)) {
                        recommendedEmployees = data.recommendations.flatMap(r =>
                            r.recommended_employees.map(emp => ({
                                employee_id: emp.employee_id,
                                user_id: emp.user_id,
                                assignment_type: emp.assignment_type,
                                assigned_hours: emp.assigned_hours,
                                allocation_percent: emp.allocation_percent
                            }))
                        );
                    }
                }
            } catch (err) {
                console.error("Failed to fetch recommendations:", err);
                recommendationsFailed = true;
            }
            
            if (recommendationsFailed) {
                MessageManager.warning("Could not load AI recommendations. Showing all available employees.");
            }

            this.currentProjectId = project.id;
            this.allEmployees = employees;
            this.recommendedEmployees = recommendedEmployees;
            this.recommendedIds = recommendedEmployees.map(emp => emp.employee_id);

            const existing = this.projects.find(p => p.projectId === project.id);
            if (!existing) {
                const totalNeeded = project.project_requirements.reduce(
                    (sum, r) => sum + (r.quantity_needed || 0), 0
                );
                this.projects.push({ projectId: project.id, teamSize: totalNeeded });
            }

            this.showEditProjectModal(project);
            ModalManager.hideLoading();

        } catch (error) {
            ModalManager.hideLoading();
            console.error("Error editing project:", error);
            MessageManager.error("Failed to load project details");
        }
    }

    showEditProjectModal(project) {
        document.querySelectorAll(".employee-checkbox").forEach(cb => cb.checked = false);

        this.currentProjectTotalNeeded = project.project_requirements.reduce(
            (sum, r) => sum + (r.quantity_needed || 0), 0
        );

        document.getElementById("modalProjectName").textContent = project.name || "Untitled Project";
        document.getElementById("modalProjectId").textContent = project.id;
        document.getElementById("modalTeamSize").textContent = `${this.currentProjectTotalNeeded} members`;
        document.getElementById("totalNeededCount").textContent = this.currentProjectTotalNeeded;

        const assignedCount = this.assignedEmployees[project.id]?.size || 0;
        document.getElementById("selectedCount").textContent = assignedCount;

        const statusEl = document.getElementById("modalProjectStatus");
        if (statusEl) {
            statusEl.innerHTML = `<span class="project-status ${project.status}">
                ${capitalize(project.status)}</span>`;
        }

        document.getElementById("modalProjectDeadline").textContent = formatDate(project.end_date);

        this.uiManager.renderSkillsList(
            document.getElementById("modalRequiredSkills"),
            project.project_requirements || []
        );

        const searchFilter = document.getElementById("employeeSearchFilter");
        const availFilter = document.getElementById("availabilityFilter");
        if (searchFilter) searchFilter.value = "";
        if (availFilter) availFilter.value = "recommended";

        this.filterEmployees();
        ModalManager.show("editProjectModal");
    }

    async preloadAssignedEmployees(projectId) {
        const { data, error } = await supabase
            .from('project_assignments')
            .select('user_id')
            .eq('project_id', projectId)
            .eq('status', 'assigned');

        if (error) {
            console.warn("Failed to load assignments:", error);
            this.assignedEmployees[projectId] = new Set();
            return;
        }

        this.assignedEmployees[projectId] = new Set(data.map(d => String(d.user_id)));
        console.log(`[RM] Preloaded ${data.length} assigned employees for project ${projectId}`);
    }

    filterEmployees() {
        if (!this.allEmployees) return;

        const searchQuery = document.getElementById("employeeSearchFilter")?.value.toLowerCase().trim() || "";
        const availValue = document.getElementById("availabilityFilter")?.value || "recommended";

        let eligibleEmployees = this.allEmployees.filter(emp => {
            const role = (emp.job_title || "").toLowerCase();
            return role !== "resource manager" && role !== "project manager";
        });

        let filtered = availValue === "all"
            ? [...eligibleEmployees]
            : eligibleEmployees.filter(emp => this.recommendedIds.includes(emp.employee_id));

        if (searchQuery) {
            filtered = filtered.filter(emp =>
                (emp.users?.name || "").toLowerCase().includes(searchQuery) ||
                (emp.job_title || "").toLowerCase().includes(searchQuery) ||
                (emp.skills || []).some(skill => skill.toLowerCase().includes(searchQuery))
            );
        }

        const renderData = filtered.map(emp => {
            const recEmp = this.recommendedEmployees?.find(r => r.employee_id === emp.employee_id);
            const totalAvailableHours = emp.total_available_hours || 40;
            
            let assignedHours, assignmentType, allocationPercent;
            
            if (recEmp) {
                assignedHours = recEmp.assigned_hours;
                assignmentType = recEmp.assignment_type;
                allocationPercent = recEmp.allocation_percent;
            } else {
                assignedHours = Math.min(totalAvailableHours, 40);
                assignmentType = assignedHours >= 35 ? 'Full-Time' : 'Part-Time';
                allocationPercent = Math.round((assignedHours / 40) * 100);
            }
            
            return {
                employee_id: emp.employee_id,
                user_id: emp.users?.id,
                name: emp.users?.name || "Unnamed",
                role: emp.job_title || "No role specified",
                skills: emp.skills || ["General"],
                status: emp.status || "available",
                assignment_type: assignmentType,
                assigned_hours: assignedHours,
                allocation_percent: allocationPercent
            };
        });

        this.uiManager.renderEmployeesList(document.getElementById("employeesList"), renderData);

        const assignedSet = this.assignedEmployees[this.currentProjectId] || new Set();
        document.querySelectorAll(".employee-checkbox").forEach(cb => {
            const userId = cb.dataset.userId;
            const empId = cb.dataset.empId;
            const emp = this.allEmployees.find(e => e.employee_id == empId);

            if (assignedSet.has(userId)) {
                cb.checked = true;
                cb.disabled = false;
                cb.parentElement.classList.add("assigned");
                cb.title = "Already assigned";
            } else if (this.recommendedIds.includes(empId)) {
                cb.checked = false;
                cb.parentElement.classList.add("recommended");
            } else {
                cb.checked = false;
                cb.parentElement.classList.remove("assigned", "recommended");
            }

            if (emp?.status?.toLowerCase() === "busy") {
                cb.disabled = true;
                cb.parentElement.classList.add("busy");
                cb.title = "Employee is busy";
            }

            cb.addEventListener("change", () => this.updateSelectionCount());
        });

        this.updateSelectionCount();
    }

    updateSelectionCount() {
        const assignedSet = this.assignedEmployees[this.currentProjectId] || new Set();
        const checkboxes = document.querySelectorAll('.employee-checkbox');

        const newlySelected = Array.from(checkboxes)
            .filter(cb => cb.checked && !assignedSet.has(cb.dataset.userId))
            .length;

        const totalSelected = assignedSet.size + newlySelected;

        const selectedCountEl = document.getElementById('selectedCount');
        if (selectedCountEl) selectedCountEl.textContent = totalSelected;
    }

    async updateEmployeeAvailability(userId, assignedHours, isRemoving = false) {
        try {
            const { data: userDetail, error: fetchError } = await supabase
                .from("user_details")
                .select("total_available_hours")
                .eq("user_id", userId)
                .single();

            if (fetchError) throw fetchError;

            const newAvailableHours = isRemoving 
                ? userDetail.total_available_hours + assignedHours
                : userDetail.total_available_hours - assignedHours;

            const newStatus = newAvailableHours <= 0 ? 'Busy' : 'Available';

            const { error: updateError } = await supabase
                .from("user_details")
                .update({
                    total_available_hours: newAvailableHours,
                    status: newStatus
                })
                .eq("user_id", userId);

            if (updateError) throw updateError;

            console.log(`Updated user ${userId}: ${newAvailableHours}h remaining (${newStatus})`);
            return true;
        } catch (error) {
            console.error("Failed to update availability:", error);
            return false;
        }
    }

    async saveSelectedEmployees() {
        try {
            const checkboxes = document.querySelectorAll(".employee-checkbox");
            const assignedSet = this.assignedEmployees[this.currentProjectId] || new Set();

            const currentlyCheckedIds = Array.from(checkboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.dataset.empId);

            const previouslyAssignedIds = Array.from(assignedSet).map(userId => {
                const emp = this.allEmployees.find(e => e.users?.id == userId);
                return emp?.employee_id;
            }).filter(Boolean);

            const newlySelectedIds = currentlyCheckedIds.filter(id => !previouslyAssignedIds.includes(id));
            const toRemoveIds = previouslyAssignedIds.filter(id => !currentlyCheckedIds.includes(id));

            const newlySelectedUserIds = newlySelectedIds.map(empId => {
                const emp = this.allEmployees.find(e => e.employee_id === empId);
                return emp?.users?.id || null;
            }).filter(Boolean);

            const toRemoveUserIds = toRemoveIds.map(empId => {
                const emp = this.allEmployees.find(e => e.employee_id === empId);
                return emp?.users?.id || null;
            }).filter(Boolean);

            if (!newlySelectedUserIds.length && !toRemoveUserIds.length) {
                Swal.fire({
                    icon: 'warning',
                    title: 'No changes',
                    text: 'Please select or unselect at least one employee.'
                });
                return;
            }

            const totalNeeded = this.projects.find(p => p.projectId === this.currentProjectId)?.teamSize || 0;
            const currentlyAssignedCount = assignedSet.size;
            const slotsLeft = totalNeeded - (currentlyAssignedCount - toRemoveUserIds.length);

            if (newlySelectedUserIds.length > slotsLeft) {
                Swal.fire({
                    icon: 'error',
                    title: 'Too many selections',
                    text: `You can only assign ${slotsLeft} more employee(s) to this project.`
                });
                return;
            }

            ModalManager.showLoading();

            const failedAssignments = [];
            const successfulAssignments = [];

            // Process new assignments
            for (const userId of newlySelectedUserIds) {
                try {
                    const { data: userDetail, error: detailError } = await supabase
                        .from("user_details")
                        .select("total_available_hours, experience_level, users!inner(name)")
                        .eq("user_id", userId)
                        .single();

                    if (detailError) throw detailError;

                    const availableHours = userDetail.total_available_hours;
                    const userName = userDetail.users?.name || 'Unknown User';
                    
                    const checkbox = Array.from(checkboxes).find(cb => cb.dataset.userId == userId);
                    let requiredHours = parseInt(checkbox?.dataset.assignedHours) || 40;
                    
                    if (availableHours < requiredHours) {
                        failedAssignments.push({
                            userId,
                            userName,
                            reason: `Insufficient hours (${availableHours}h available, ${requiredHours}h required)`
                        });
                        continue;
                    }
                    
                    let assignmentType = requiredHours >= 35 ? 'Full-Time' : 'Part-Time';
                    let allocationPercent = Math.round((requiredHours / 40) * 100);

                    const { error: insertError } = await supabase
                        .from("project_assignments")
                        .insert([{
                            project_id: Number(this.currentProjectId),
                            user_id: Number(userId),
                            status: 'assigned',
                            assignment_type: assignmentType,
                            assigned_hours: requiredHours,
                            allocation_percent: allocationPercent
                        }]);
                        
                    if (insertError) {
                        if (insertError.message?.includes('max of')) {
                            const match = insertError.message.match(/max of (\d+) active project/);
                            const maxProjects = match ? match[1] : 'maximum';
                            failedAssignments.push({
                                userId,
                                userName,
                                reason: `Already assigned to ${maxProjects} active project(s) (experience level limit)`
                            });
                        } else {
                            failedAssignments.push({
                                userId,
                                userName,
                                reason: insertError.message || 'Database constraint error'
                            });
                        }
                        continue;
                    }

                    await this.updateEmployeeAvailability(userId, requiredHours, false);
                    assignedSet.add(String(userId));
                    successfulAssignments.push(userName);
                    
                } catch (err) {
                    failedAssignments.push({
                        userId,
                        userName: 'Unknown User',
                        reason: err.message || 'Unknown error'
                    });
                }
            }

            // Process removals
            for (const userId of toRemoveUserIds) {
                const { data: assignment, error: fetchAssignError } = await supabase
                    .from("project_assignments")
                    .select("assigned_hours")
                    .match({
                        project_id: Number(this.currentProjectId),
                        user_id: Number(userId)
                    })
                    .single();

                if (fetchAssignError) continue;

                const hoursToRestore = assignment?.assigned_hours || 0;

                const { error } = await supabase
                    .from("project_assignments")
                    .delete()
                    .match({
                        project_id: Number(this.currentProjectId),
                        user_id: Number(userId)
                    });

                if (!error) {
                    await this.updateEmployeeAvailability(userId, hoursToRestore, true);
                    assignedSet.delete(String(userId));
                }
            }

            // Update project status
            if (assignedSet.size > 0) {
                await supabase
                    .from("projects")
                    .update({ status: 'active' })
                    .eq("id", this.currentProjectId);
            }

            this.updateAssignedUI();

            ModalManager.hideLoading();
            ModalManager.hide("editProjectModal");

            await this.loadProjects();

            // Show results
            if (failedAssignments.length > 0 && successfulAssignments.length > 0) {
                const failedList = failedAssignments.map(f => `• ${f.userName}: ${f.reason}`).join('<br>');
                Swal.fire({
                    icon: 'warning',
                    title: 'Partial Assignment Success',
                    html: `
                        <p><strong>Successfully assigned:</strong> ${successfulAssignments.join(', ')}</p>
                        <br>
                        <p><strong>Failed to assign:</strong></p>
                        <div style="text-align: left; padding: 10px; background: #fff3cd; border-radius: 4px; margin-top: 10px;">
                            ${failedList}
                        </div>
                    `
                });
            } else if (failedAssignments.length > 0) {
                const failedList = failedAssignments.map(f => `• ${f.userName}: ${f.reason}`).join('<br>');
                Swal.fire({
                    icon: 'error',
                    title: 'Assignment Failed',
                    html: `
                        <p>No employees were assigned due to the following errors:</p>
                        <div style="text-align: left; padding: 10px; background: #f8d7da; border-radius: 4px; margin-top: 10px;">
                            ${failedList}
                        </div>
                    `
                });
            } else if (successfulAssignments.length > 0) {
                Swal.fire({
                    icon: 'success',
                    title: 'Team Updated',
                    text: `Successfully assigned: ${successfulAssignments.join(', ')}`
                });
            }

        } catch (err) {
            ModalManager.hideLoading();
            console.error("Error saving project team:", err);
            Swal.fire({
                icon: 'error',
                title: 'Save Failed',
                text: 'Failed to update project team.'
            });
        }
    }

    updateAssignedUI() {
        const checkboxes = document.querySelectorAll('.employee-checkbox');
        const assignedSet = this.assignedEmployees[this.currentProjectId] || new Set();

        checkboxes.forEach(cb => {
            const userId = String(cb.dataset.userId);
            const empId = cb.dataset.empId;

            if (assignedSet.has(userId)) {
                cb.checked = true;
                cb.disabled = false;
                cb.parentElement.classList.add('assigned');
                cb.parentElement.classList.remove('recommended');
            } else if (this.recommendedIds?.includes(empId)) {
                cb.checked = false;
                cb.parentElement.classList.remove('assigned');
                cb.parentElement.classList.add('recommended');
            } else {
                cb.checked = false;
                cb.parentElement.classList.remove('assigned', 'recommended');
            }
        });

        const selectedCountEl = document.getElementById('selectedCount');
        if (selectedCountEl) {
            const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
            selectedCountEl.textContent = checkedCount;
        }
    }
}

// ============================================
// INITIALIZATION
// ============================================
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ProjectApp();
    app.init();
    
    // Make app globally available for onclick handlers
    window.app = app;
});