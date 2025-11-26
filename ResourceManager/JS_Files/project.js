// RESOURCE MANAGEMENT (RM) project.js 

// ---------- Imports ----------
import { supabase } from "../../supabaseClient.js";
import bcrypt from "https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/+esm";



    async function updateUserNameDisplayEnhanced() {
    const userNameElement = document.getElementById('userName');
    const userAvatarElement = document.querySelector('.user-avatar');
    
    if (!userNameElement) {
        console.warn('[USER DISPLAY] userName element not found');
        return;
    }

    try {
        const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || '{}');
        let displayName = '';
        
        if (loggedUser.name) {
            displayName = loggedUser.name;
            userNameElement.textContent = displayName;
            console.log('[USER DISPLAY] User name updated to:', displayName);
        } else if (loggedUser.email) {
            try {
                const { data: userData, error } = await supabase
                    .from('users')
                    .select('name')
                    .eq('email', loggedUser.email)
                    .single();
                
                if (!error && userData && userData.name) {
                    displayName = userData.name;
                    userNameElement.textContent = displayName;
                    loggedUser.name = userData.name;
                    localStorage.setItem('loggedUser', JSON.stringify(loggedUser));
                    console.log('[USER DISPLAY] User name fetched from Supabase:', displayName);
                } else {
                    displayName = loggedUser.email.split('@')[0];
                    userNameElement.textContent = displayName;
                }
            } catch (dbError) {
                console.error('[USER DISPLAY] Error fetching from Supabase:', dbError);
                displayName = loggedUser.email.split('@')[0];
                userNameElement.textContent = displayName;
            }
        } else {
            displayName = 'Project Manager';
            userNameElement.textContent = displayName;
            console.warn('[USER DISPLAY] No user information found');
        }
        
        // Update avatar with user initials
        if (userAvatarElement && displayName) {
            const initials = displayName.split(' ')
                .map(word => word.charAt(0).toUpperCase())
                .join('')
                .substring(0, 2);
            
            userAvatarElement.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=000&color=fff`;
            userAvatarElement.alt = initials;
            console.log('[USER DISPLAY] Avatar updated with initials:', initials);
        }
    } catch (error) {
        console.error('[USER DISPLAY] Error updating user name:', error);
        userNameElement.textContent = 'Project Manager';
    }
}

function debounce(func, delay = 300) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// ============================================
// MODAL UTILITIES
// ============================================

class ModalManager {
    static openModals = new Map();

    static show(modalId, triggerElement = null) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        if (triggerElement) this.openModals.set(modalId, triggerElement);

        modal.classList.add('active');
        modal.removeAttribute('aria-hidden');
        modal.inert = false;

        document.body.style.overflow = 'hidden';

        const focusable = modal.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable) focusable.focus();

        modal.addEventListener('keydown', this._trapFocus);
    }

    static hide(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.removeEventListener('keydown', this._trapFocus);

        const trigger = this.openModals.get(modalId);
        if (trigger) trigger.focus();
        this.openModals.delete(modalId);

        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        modal.inert = true;

        document.body.style.overflow = '';
    }

    static _trapFocus(e) {
        if (e.key !== 'Tab') return;

        const modal = e.currentTarget;
        const focusable = Array.from(
            modal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )
        ).filter(el => !el.disabled);

        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        } else {
            if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }

    static showLoading() {
        this.show('loadingOverlay');
    }

    static hideLoading() {
        this.hide('loadingOverlay');
    }
}

// ============================================
// MESSAGE UTILITIES
// ============================================

class MessageManager {
    static show(message, type = 'info') {
        const container = document.getElementById('messageContainer');
        if (!container) return;

        const messageBox = document.createElement('div');
        messageBox.className = `message-box ${type}`;

        const iconMap = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const icon = document.createElement('i');
        icon.className = `fas ${iconMap[type]}`;

        const text = document.createElement('span');
        text.textContent = message;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'message-close';
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.addEventListener('click', () => messageBox.remove());

        messageBox.appendChild(icon);
        messageBox.appendChild(text);
        messageBox.appendChild(closeBtn);

        container.appendChild(messageBox);

        setTimeout(() => {
            messageBox.remove();
        }, 5000);
    }

    static success(message) {
        this.show(message, 'success');
    }

    static error(message) {
        this.show(message, 'error');
    }

    static warning(message) {
        this.show(message, 'warning');
    }

    static info(message) {
        this.show(message, 'info');
    }
}

// ============================================
// DATA SERVICE
// ============================================

class DataService {
    constructor() {
        this.projects = [];
        this.assignedEmployees = {};
    }

    async getAllEmployees() {
        const { data, error } = await supabase
          .from('user_details')
          .select(`
            employee_id,
            job_title,
            department,
            status,
            experience_level,
            skills,
            total_available_hours,
            users:user_id (
              id,
              name,
              email
            )
          `);
      
        if (error) throw error;
        return data;
    }

    async getAllProjects() {
        const { data: allProjects, error: projectError } = await supabase
        .from('projects')
        .select(`
            id,
            name,
            status,
            start_date,
            end_date,
            duration_days,
            project_requirements(quantity_needed)
        `)
        .not('status', 'in', '("completed","cancelled")');

        if (projectError) {
        console.error("Error loading projects:", projectError);
        throw projectError;
        }

        const projectsArray = allProjects.map(proj => ({
            projectId: proj.id,
            projectName: proj.name,
            projectStatus: proj.status,
            teamSize: (proj.project_requirements || []).reduce(
                (sum, r) => sum + (r.quantity_needed || 0),
                0
            ),
            startDate: proj.start_date,
            deadline: proj.end_date,
            durationDays: proj.duration_days
        }));
        
        for (const project of projectsArray) {
            const { data: assignments, error: assignError } = await supabase
                .from('project_assignments')
                .select('id')
                .eq('project_id', project.projectId)
                .eq('status', 'assigned');
            
            if (!assignError) {
                project.assignedCount = assignments.length;
            } else {
                project.assignedCount = 0;
            }

            const { data: requestData, error: requestError} = await supabase
                .from('resource_requests')
                .select('status')
                .eq('project_id', project.projectId)
                .eq('status', 'approved')
                .limit(1);

            if (requestError) {
                console.warn(`Error checking request status for project ${project.projectId}:`, requestError);
            }

            project.isApproved = requestData && requestData.length > 0;
        }

            return projectsArray;
    }

    async getProjectById(id) {
        const { data, error } = await supabase
          .from('projects')
          .select(`
            id,
            name,
            description,
            start_date,
            end_date,
            duration_days,
            status,
            created_by,
            users:created_by (
              id,
              name
            ),
            project_requirements (
              id,
              experience_level,
              quantity_needed,
              required_skills,
              preferred_assignment_type
            )
          `)
          .eq('id', id)
          .single();
      
        if (error) throw error;
        console.log("Fetched project:", data);
        return data;
    }

   async preloadAssignedEmployees(projectId) {
        const { data, error } = await supabase
            .from('project_assignments')
            .select('user_id')
            .eq('project_id', projectId)
            .eq('status', 'assigned');  

        if (error) {
            console.warn("Failed to load existing assignments:", error);
            this.assignedEmployees[projectId] = new Set();
            return;
        }

        this.assignedEmployees[projectId] = new Set(data.map(d => String(d.user_id)));
        console.log(`[RM] Preloaded ${data.length} assigned employees for project ${projectId}`);
    }

    getAssignableCount(projectId) {
        const assigned = this.assignedEmployees[projectId]?.size || 0;
        const project = this.projects?.find(p => p.projectId === projectId);
        if (!project) return 0;
        return Math.max(project.teamSize - assigned, 0);
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

    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    capitalize(str) {
        if (!str || typeof str !== "string") return "";
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    getStatusColor(status) {
        const colors = {
            active: '#7ED321',
            pending: '#F5A623',
            completed: '#4A90E2'
        };
        return colors[status] || '#6C757D';
    }

    renderProjects(projects) {
        const tbody = document.getElementById('projectsTableBody');
        
        if (!tbody) return;

        if (projects.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No projects found</td></tr>';
            return;
        }

        const fragment = document.createDocumentFragment();

        projects.forEach(proj => {
            const row = this.createProjectRow(proj);
            fragment.appendChild(row);
        });

        tbody.innerHTML = '';
        tbody.appendChild(fragment);
    }

    createProjectRow(proj) {
        const tr = document.createElement('tr');
        tr.dataset.id = proj.projectId;
      
        const tdName = document.createElement('td');
        const strongName = document.createElement('strong');
        strongName.textContent = proj.projectName; 
        tdName.appendChild(strongName);
      
        const tdStatus = document.createElement('td');
        const statusSpan = document.createElement('span');
        statusSpan.className = `project-status ${proj.projectStatus}`; 
        statusSpan.textContent = this.capitalize(proj.projectStatus);  
        tdStatus.appendChild(statusSpan);
      
        const tdTeam = document.createElement('td');
        const assignedCount = proj.assignedCount || 0;
        const totalNeeded = proj.teamSize || 0;
        const teamText = `${assignedCount}/${totalNeeded} members`;
        tdTeam.textContent = teamText;
        
        if (assignedCount >= totalNeeded && totalNeeded > 0) {
            tdTeam.style.color = '#2E7D32';
            tdTeam.style.fontWeight = '600';
        } else if (assignedCount > 0) {
            tdTeam.style.color = '#F5A623';
            tdTeam.style.fontWeight = '600';
        }
      
        const tdDuration = document.createElement('td');
        tdDuration.textContent = proj.durationDays ? `${proj.durationDays} days` : '-';
        tdDuration.style.textAlign = 'center';
      
        const tdStartDate = document.createElement('td');
        tdStartDate.textContent = this.formatDate(proj.startDate);
      
        const tdDeadline = document.createElement('td');
        tdDeadline.textContent = this.formatDate(proj.deadline);
      
        const tdActions = document.createElement('td');
        tdActions.appendChild(this.createActionButtons(proj));
      
        tr.appendChild(tdName);
        tr.appendChild(tdStatus);
        tr.appendChild(tdTeam);
        tr.appendChild(tdDuration);
        tr.appendChild(tdStartDate);
        tr.appendChild(tdDeadline);
        tr.appendChild(tdActions);
      
        return tr;
    }
    
    createActionButtons(proj) {
        const div = document.createElement('div');
        div.className = 'action-buttons';

        const viewBtn = document.createElement('button');
        viewBtn.className = 'icon-btn';
        viewBtn.title = 'View';
        viewBtn.innerHTML = '<i class="fas fa-eye"></i>';
        viewBtn.onclick = () => app.viewProject(proj.projectId);

        const editContainer = document.createElement('div');
        editContainer.className = 'action-btn-with-badge';

        const editBtn = document.createElement('button');
        editBtn.className = 'icon-btn';
        editBtn.title = 'Assign Team';
        editBtn.innerHTML = '<i class="fas fa-user-plus"></i>';
        
        // Check if project is completed or cancelled
        const isInactive = proj.projectStatus === 'completed' || proj.projectStatus === 'cancelled';
        
        if (isInactive) {
            editBtn.disabled = true;
            editBtn.style.opacity = '0.5';
            editBtn.style.cursor = 'not-allowed';
            editBtn.title = `Cannot assign team - Project is ${proj.projectStatus}`;
        } else {
            editBtn.onclick = () => app.editProject(proj.projectId);
        }

        editContainer.appendChild(editBtn);

        div.appendChild(viewBtn);
        div.appendChild(editContainer);

        return div;
    }

    renderSkillsList(container, skills) {
        if (!container) return;
    
        container.innerHTML = '';
    
        if (!Array.isArray(skills) || skills.length === 0) {
            container.innerHTML = '<p>No project requirements listed.</p>';
            return;
        }
    
        skills.forEach(skill => {
            const li = document.createElement('li');
    
            const quantity = skill.quantity_needed || 0;
            const level = skill.experience_level || 'Any';
            const requiredSkills = (skill.required_skills || []).join(', ') || 'General';
    
            li.textContent = `${quantity} ${level} (${requiredSkills})`;
            container.appendChild(li);
        });
    }

    renderEmployeesList(container, employees) {
        if (!container) return;

        if (employees.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6C757D; padding: 20px;">No employees found</p>';
            return;
        }

        const fragment = document.createDocumentFragment();

        employees.forEach((emp, index) => {
            const card = this.createEmployeeCard(emp, index);
            fragment.appendChild(card);
        });

        container.innerHTML = '';
        container.appendChild(fragment);
    }

    createEmployeeCard(emp, index) {
        const employeeId = emp.employee_id || emp.id || emp.empId || emp.employeeId || '';
        const userId = (emp.users && emp.users.id) || emp.user_id || emp.userId || '';
        const name = (emp.users && emp.users.name) || emp.name || emp.displayName || 'Unknown';
        const role = emp.job_title || emp.role || emp.position || 'No Role';
        const skills = Array.isArray(emp.skills) ? emp.skills : (emp.skill ? [emp.skill] : []);
        const rawStatus = (emp.status || emp.availability || '').toString().trim();
        const statusText = rawStatus ? (rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase()) : 'Unknown';
        
        const assignmentType = emp.assignment_type || 'Full-Time';
        const assignedHours = emp.assigned_hours || 40;
        const allocationPercent = emp.allocation_percent || 100;

        const card = document.createElement('div');
        card.className = 'recommendation-card';
        if (employeeId) card.dataset.empId = String(employeeId);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'employee-checkbox';
        checkbox.dataset.userId = String(userId || '');
        checkbox.dataset.empId = String(employeeId || '');
        checkbox.dataset.assignmentType = assignmentType;
        checkbox.dataset.assignedHours = assignedHours;
        checkbox.dataset.allocationPercent = allocationPercent;

        const number = document.createElement('span');
        number.className = 'employee-number';
        number.textContent = `${index + 1}.`;

        const avatar = document.createElement('img');
        avatar.src = emp.avatar
            ? emp.avatar
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;
        avatar.alt = name || "Employee";
        avatar.className = 'employee-avatar-circle';

        const details = document.createElement('div');
        details.className = 'recommendation-details';

        const h4 = document.createElement('h4');
        h4.textContent = name;

        const p = document.createElement('p');
        p.textContent = role;

        const assignmentInfo = document.createElement('div');
        assignmentInfo.className = 'assignment-info';
        assignmentInfo.style.cssText = 'display: flex; gap: 8px; margin-top: 4px; font-size: 12px;';
        
        const hoursSpan = document.createElement('span');
        hoursSpan.className = 'hours-badge';
        hoursSpan.textContent = `${assignedHours}h/week`;
        hoursSpan.style.cssText = 'background: #E3F2FD; color: #1976D2; padding: 2px 8px; border-radius: 12px; font-weight: 500;';
        
        const typeSpan = document.createElement('span');
        typeSpan.className = 'type-badge';
        typeSpan.textContent = assignmentType;
        typeSpan.style.cssText = 'background: #F3E5F5; color: #7B1FA2; padding: 2px 8px; border-radius: 12px; font-weight: 500;';
        
        const allocSpan = document.createElement('span');
        allocSpan.className = 'allocation-badge';
        allocSpan.textContent = `${allocationPercent}%`;
        allocSpan.style.cssText = 'background: #E8F5E9; color: #2E7D32; padding: 2px 8px; border-radius: 12px; font-weight: 500;';

        assignmentInfo.appendChild(hoursSpan);
        assignmentInfo.appendChild(typeSpan);
        assignmentInfo.appendChild(allocSpan);

        const skillsDiv = document.createElement('div');
        skillsDiv.className = 'recommendation-skills';
        (skills.length ? skills : ["General"]).slice(0, 4).forEach(skill => {
            const skillSpan = document.createElement('span');
            skillSpan.className = 'skill-tag';
            skillSpan.textContent = skill;
            skillsDiv.appendChild(skillSpan);
        });

        details.appendChild(h4);
        details.appendChild(p);
        details.appendChild(assignmentInfo);
        details.appendChild(skillsDiv);

        const availabilityBadge = document.createElement('span');
        availabilityBadge.className = 'match-score';
        availabilityBadge.textContent = statusText;

        const key = statusText.toLowerCase();
        const colorMap = {
            'available': ['#E8F5E9', '#2E7D32'],
            'busy': ['#FFEBEE', '#B71C1C'],
            'unknown': ['#E0E0E0', '#424242']
        };

        const colors = colorMap[key] || colorMap['unknown'];
        availabilityBadge.style.backgroundColor = colors[0];
        availabilityBadge.style.color = colors[1];

        card.appendChild(checkbox);
        card.appendChild(number);
        card.appendChild(avatar);
        card.appendChild(details);
        card.appendChild(availabilityBadge);

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
        
        this.debouncedSearch = debounce(() => this.filterProjects(), 300);
        this.debouncedEmployeeFilter = debounce(() => this.filterEmployees(), 300);

        this.assignedEmployees = {};
        this.projects = []; 
    }

    async init() {
        this.setupEventListeners();
        await this.loadProjects();
        await updateUserNameDisplayEnhanced();

    }

    setupEventListeners() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.openLogoutModal());
        }

        const projSearch = document.getElementById('projectSearch');
        if (projSearch) {
            projSearch.addEventListener('input', () => this.debouncedSearch());
        }

        const closeViewBtn = document.getElementById('closeViewProjectModal');
        const closeViewProject = document.getElementById('closeViewProject');
        if (closeViewBtn) closeViewBtn.addEventListener('click', () => ModalManager.hide('viewProjectModal'));
        if (closeViewProject) closeViewProject.addEventListener('click', () => ModalManager.hide('viewProjectModal'));

        const closeEditBtn = document.getElementById('closeEditModal');
        const cancelEditBtn = document.getElementById('cancelEditModal');
        const saveTeamBtn = document.getElementById('saveProjectTeam');
        
        if (closeEditBtn) closeEditBtn.addEventListener('click', () => ModalManager.hide('editProjectModal'));
        if (cancelEditBtn) cancelEditBtn.addEventListener('click', () => ModalManager.hide('editProjectModal'));
        if (saveTeamBtn) saveTeamBtn.addEventListener('click', () => this.saveSelectedEmployees());

        const employeeSearchFilter = document.getElementById('employeeSearchFilter');
        const availabilityFilter = document.getElementById('availabilityFilter');
        
        if (employeeSearchFilter) {
            employeeSearchFilter.addEventListener('input', () => this.debouncedEmployeeFilter());
        }
        
        if (availabilityFilter) {
            availabilityFilter.addEventListener('change', () => this.filterEmployees());
        }

        const cancelLogoutBtn = document.getElementById('cancelLogout');
        const confirmLogoutBtn = document.getElementById('confirmLogout');
        if (cancelLogoutBtn) cancelLogoutBtn.addEventListener('click', () => ModalManager.hide('logoutModal'));
        if (confirmLogoutBtn) confirmLogoutBtn.addEventListener('click', () => this.handleLogout());

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
            console.error('Error filtering projects:', error);
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
      
          document.getElementById('viewProjectName').textContent = project.name || 'Untitled Project';
          document.getElementById('viewProjectId').textContent = project.id;
      
          const statusElement = document.getElementById('viewProjectStatus');
          statusElement.textContent = this.uiManager.capitalize(project.status || 'pending');
          statusElement.style.color = this.uiManager.getStatusColor(project.status);
      
          const managerName = project.users?.name || 'Unassigned';
          document.getElementById('viewProjectManager').textContent = managerName;
      
          const totalNeeded = project.project_requirements
            ? project.project_requirements.reduce((sum, req) => sum + (req.quantity_needed || 0), 0)
            : 0;
          document.getElementById('viewProjectTeamSize').textContent = `${totalNeeded} members`;
      
          const startDateText = this.uiManager.formatDate(project.start_date);
          document.getElementById('viewProjectStartDate').textContent = startDateText;
      
          const deadlineText = this.uiManager.formatDate(project.end_date);
          document.getElementById('viewProjectDeadline').textContent = deadlineText;
      
          const durationText = project.duration_days ? `${project.duration_days} days` : 'Not specified';
          document.getElementById('viewProjectDuration').textContent = durationText;
      
          const skillsContainer = document.getElementById('viewProjectSkills');
          this.uiManager.renderSkillsList(skillsContainer, project.project_requirements || []);
      
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
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                
                const res = await fetch(`http://127.0.0.1:8000/recommendations/${projectId}`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!res.ok) {
                    console.error(`Recommendations API returned ${res.status}: ${res.statusText}`);
                    recommendationsFailed = true;
                } else {
                    const data = await res.json();
                    console.log("FastAPI response:", data);
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
                if (err.name === 'AbortError') {
                    console.error("Request timed out after 10 seconds");
                }
                recommendationsFailed = true;
            }
            
            if (recommendationsFailed) {
                MessageManager.warning("Could not load AI recommendations. Showing all available employees.");
            }
    
            this.currentProjectId = project.id;
            this.allEmployees = employees;
            this.recommendedEmployees = recommendedEmployees;
            this.recommendedIds = recommendedEmployees.map(emp => emp.employee_id);
    
            if (!this.projects) this.projects = [];
            const existing = this.projects.find(p => p.projectId === project.id);
            if (!existing) {
                const totalNeeded = project.project_requirements.reduce(
                    (sum, r) => sum + (r.quantity_needed || 0),
                    0
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
            (sum, r) => sum + (r.quantity_needed || 0),
            0
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
                ${this.uiManager.capitalize(project.status)}</span>`;
        }
    
        const deadlineText = this.uiManager.formatDate(project.end_date);
        document.getElementById("modalProjectDeadline").textContent = deadlineText;
    
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
            .eq('status', 'assigned');  // ONLY get 'assigned' status

        if (error) {
            console.warn("Failed to load existing assignments:", error);
            this.assignedEmployees[projectId] = new Set();
            return;
        }

        this.assignedEmployees[projectId] = new Set(data.map(d => String(d.user_id)));
        console.log(`[RM] Preloaded ${data.length} assigned employees for project ${projectId}`);
    }

    getAssignableCount(projectId) {
        const assigned = this.assignedEmployees[projectId]?.size || 0;
        const project = this.projects?.find(p => p.projectId === projectId);
        if (!project) return 0;
        return Math.max(project.teamSize - assigned, 0);
    }

    filterEmployees() {
        console.log("DEBUG: FastAPI recommendations:", this.recommendedIds);

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
                id: emp.employee_id,
                user_id: emp.users?.id,
                name: emp.users?.name || "Unnamed",
                role: emp.job_title || "No role specified",
                skills: emp.skills || ["General"],
                availability: emp.status || "available",
                assignment_type: assignmentType,
                assigned_hours: assignedHours,
                allocation_percent: allocationPercent
            };
        });

        const empList = document.getElementById("employeesList");
        this.uiManager.renderEmployeesList(empList, renderData);

        const assignedSet = this.assignedEmployees[this.currentProjectId] || new Set();
        document.querySelectorAll(".employee-checkbox").forEach(cb => {
            const userId = cb.dataset.userId;
            const empId = cb.dataset.empId;
        
            const emp = this.allEmployees.find(e => e.employee_id == empId);
        
            if ((this.assignedEmployees[this.currentProjectId] || new Set()).has(userId)) {
                cb.checked = true;
                cb.disabled = false;
                cb.parentElement.classList.add("assigned");
                cb.title = "Already assigned";
            } 
            else if (this.recommendedIds.includes(empId)) {
                cb.checked = false;
                cb.parentElement.classList.add("recommended");
            } 
            else {
                cb.checked = false;
                cb.parentElement.classList.remove("assigned");
                cb.parentElement.classList.remove("recommended");
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
        if (selectedCountEl) {
            selectedCountEl.textContent = totalSelected;
        }
    }

    async updateEmployeeAvailability(userId, assignedHours, isRemoving = false) {
        try {
            const { data: userDetail, error: fetchError } = await supabase
                .from("user_details")
                .select("total_available_hours")
                .eq("user_id", userId)
                .single();

            if (fetchError) throw fetchError;

            let newAvailableHours;
            if (isRemoving) {
                newAvailableHours = userDetail.total_available_hours + assignedHours;
            } else {
                newAvailableHours = userDetail.total_available_hours - assignedHours;
            }

            const newStatus = newAvailableHours <= 0 ? 'Busy' : 'Available';

            const { error: updateError } = await supabase
                .from("user_details")
                .update({
                    total_available_hours: newAvailableHours,
                    status: newStatus
                })
                .eq("user_id", userId);

            if (updateError) throw updateError;

            console.log(`Updated user ${userId}: ${newAvailableHours}h remaining (Status: ${newStatus})`);
            return true;
        } catch (error) {
            console.error("Failed to update employee availability:", error);
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
                    
                    // Check if employee has enough available hours
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
                        console.error("Insert error:", insertError);
                        
                        // Check for project limit constraint
                        if (insertError.message && insertError.message.includes('max of')) {
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
                    console.log(`Assigned user ${userId} with ${requiredHours}h (${allocationPercent}%) as ${assignmentType}`);
                    
                } catch (err) {
                    console.error("Error assigning user:", userId, err);
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

                if (fetchAssignError) {
                    console.error("Failed to fetch assignment hours for user_id", userId);
                    continue;
                }

                const hoursToRestore = assignment?.assigned_hours || 0;

                const { error } = await supabase
                    .from("project_assignments")
                    .delete()
                    .match({
                        project_id: Number(this.currentProjectId),
                        user_id: Number(userId)
                    });

                if (error) {
                    console.error("Failed to remove user_id", userId, error);
                } else {
                    await this.updateEmployeeAvailability(userId, hoursToRestore, true);
                    console.log(`Removed user_id ${userId} and restored ${hoursToRestore}h`);
                    assignedSet.delete(String(userId));
                }
            }

            // Update project status
            const finalAssignedCount = assignedSet.size;
            if (finalAssignedCount > 0) {
                const { error: projectUpdateError } = await supabase
                    .from("projects")
                    .update({ status: 'active' })
                    .eq("id", this.currentProjectId);

                if (projectUpdateError) {
                    console.error("Failed to update project status:", projectUpdateError);
                } else {
                    console.log(`Project ${this.currentProjectId} status updated to 'active'`);
                }
            }

            this.updateAssignedUI();

            ModalManager.hideLoading();
            ModalManager.hide("editProjectModal");

            await this.loadProjects();

            // Show detailed results
            if (failedAssignments.length > 0 && successfulAssignments.length > 0) {
                const failedList = failedAssignments
                    .map(f => `• ${f.userName}: ${f.reason}`)
                    .join('<br>');
                
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
                    `,
                    confirmButtonText: 'OK'
                });
            } else if (failedAssignments.length > 0) {
                const failedList = failedAssignments
                    .map(f => `• ${f.userName}: ${f.reason}`)
                    .join('<br>');
                
                Swal.fire({
                    icon: 'error',
                    title: 'Assignment Failed',
                    html: `
                        <p>No employees were assigned due to the following errors:</p>
                        <div style="text-align: left; padding: 10px; background: #f8d7da; border-radius: 4px; margin-top: 10px;">
                            ${failedList}
                        </div>
                    `,
                    confirmButtonText: 'OK'
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
            ModalManager.hide("editProjectModal");
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
            } else if (this.recommendedIds && this.recommendedIds.includes(empId)) {
                cb.checked = false;
                cb.parentElement.classList.remove('assigned');
                cb.parentElement.classList.add('recommended');
            } else {
                cb.checked = false;
                cb.parentElement.classList.remove('assigned');
                cb.parentElement.classList.remove('recommended');
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
});