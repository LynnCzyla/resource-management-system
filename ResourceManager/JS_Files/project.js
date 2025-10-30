// ---------- Imports ----------
import { supabase } from "../../supabaseClient.js";
import bcrypt from "https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/+esm";

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
    static openModals = new Map(); // modalId → trigger element

    // Show a modal
    static show(modalId, triggerElement = null) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        // Save the element that opened the modal
        if (triggerElement) this.openModals.set(modalId, triggerElement);

        // Make modal visible
        modal.classList.add('active');
        modal.removeAttribute('aria-hidden');
        modal.inert = false;

        // Prevent background scrolling
        document.body.style.overflow = 'hidden';

        // Focus first focusable element inside modal
        const focusable = modal.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable) focusable.focus();

        // Trap focus inside modal
        modal.addEventListener('keydown', this._trapFocus);
    }

    // Hide a modal
    static hide(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        // Remove focus trap
        modal.removeEventListener('keydown', this._trapFocus);

        // Move focus back to trigger
        const trigger = this.openModals.get(modalId);
        if (trigger) trigger.focus();
        this.openModals.delete(modalId);

        // Hide modal
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        modal.inert = true;

        // Restore scrolling
        document.body.style.overflow = '';
    }

    // Trap focus inside modal
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
            // Shift + Tab
            if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        } else {
            // Tab
            if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }

    // Loading overlay helpers
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
// DATA SERVICE (In-Memory Storage)
// ============================================

class DataService {
    constructor() {
        this.projects = [];          // store project team sizes
        this.assignedEmployees = {}; // track assigned employees per project
    }
    // Fetch all employees
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
            users:user_id (
              id,
              name,
              email
            )
          `);
      
        if (error) throw error;
        return data;
      }
    // Fetch all approved resource requests (linked to projects)
  async getAllProjects() {
    const { data, error } = await supabase
      .from('resource_requests')
      .select(`
        project:projects(
          id,
          name,
          status,
          end_date,
          project_requirements(quantity_needed)
        )
      `)
      .in('status', ['approved', 'fulfilled']); // include both approved and fulfilled

    if (error) {
      console.error("Error loading projects:", error);
      throw error;
    }

    const projectMap = new Map();

    (data || []).forEach(req => {
        const proj = req.project;
        if (!projectMap.has(proj.id)) {
            projectMap.set(proj.id, {
                projectId: proj.id,
                projectName: proj.name,
                projectStatus: proj.status, // either approved or fulfilled
                teamSize: (proj.project_requirements || []).reduce(
                    (sum, r) => sum + (r.quantity_needed || 0),
                    0
                ),
                deadline: proj.end_date
            });
        }
    });

    return Array.from(projectMap.values());
}

    // Assign employee to project
    async assignEmployeeToProject(projectId, userId) {
      const { error } = await supabase
        .from('project_assignments')
        .insert([{ project_id: projectId, user_id: userId }]);
      if (error) throw error;
    }
  
    // Fetch one project by id
    async getProjectById(id) {
        const { data, error } = await supabase
          .from('projects')
          .select(`
            id,
            name,
            description,
            start_date,
            end_date,
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
              required_skills
            )
          `)
          .eq('id', id)
          .single();
      
        if (error) throw error;
      
        console.log("Fetched project:", data);
        return data;
      } 
    // -----------------------------
// Preload existing assignments
// -----------------------------
    async preloadAssignedEmployees(projectId) {
        const { data, error } = await supabase
            .from('project_assignments')
            .select('employee_id') // <-- use employee_id
            .eq('project_id', projectId);

        if (error) {
            console.warn("Failed to load existing assignments:", error);
            this.assignedEmployees[projectId] = new Set();
            return;
        }

        // Store assigned employee IDs as strings
        this.assignedEmployees[projectId] = new Set(data.map(d => String(d.employee_id)));
    }
    // Placeholder — can later compute remaining assignable slots
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
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    capitalize(str) {
        if (!str || typeof str !== "string") return ""; // prevent crash
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
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No projects found</td></tr>';
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
        tdTeam.textContent = `${proj.teamSize} members`;
      
        const tdDeadline = document.createElement('td');
        tdDeadline.textContent = this.formatDate(proj.deadline);
      
        const tdActions = document.createElement('td');
        tdActions.appendChild(this.createActionButtons(proj));
      
        tr.appendChild(tdName);
        tr.appendChild(tdStatus);
        tr.appendChild(tdTeam);
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
        editBtn.onclick = () => app.editProject(proj.projectId);
    
        editContainer.appendChild(editBtn); // no badge

    
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
        // Helpful debug — keeps your console info (you asked not to remove debug).
        console.log('DEBUG createEmployeeCard input:', emp);
    
        // --- normalize fields (handle both flattened and nested shapes) ---
        const employeeId = emp.employee_id || emp.id || emp.empId || emp.employeeId || '';
        const userId = (emp.users && emp.users.id) || emp.user_id || emp.userId || emp.userId || '';
        const name = (emp.users && emp.users.name) || emp.name || emp.displayName || 'Unknown';
        const role = emp.job_title || emp.role || emp.position || 'No Role';
        const skills = Array.isArray(emp.skills) ? emp.skills : (emp.skill ? [emp.skill] : []);
        const rawStatus = (emp.status || emp.availability || '').toString().trim();
        const statusText = rawStatus ? (rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase()) : 'Unknown';
    
        // --- build card elements ---
        const card = document.createElement('div');
        card.className = 'recommendation-card';
        if (employeeId) card.dataset.empId = String(employeeId);
    
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'employee-checkbox';
        checkbox.dataset.userId = String(userId || '');     // ensure string
        checkbox.dataset.empId = String(employeeId || '');
    
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
        details.appendChild(skillsDiv);
    
        // --- status badge (Available / Busy / Unknown) ---
        const availabilityBadge = document.createElement('span');
        availabilityBadge.className = 'match-score';
        availabilityBadge.textContent = statusText;
    
        // lowercase key for mapping
        const key = statusText.toLowerCase();
        const colorMap = {
            'available': ['#E8F5E9', '#2E7D32'], // green bg, dark green text
            'busy': ['#FFEBEE', '#B71C1C'],      // red bg, dark red text
            'unknown': ['#E0E0E0', '#424242']    // gray
        };
    
        const colors = colorMap[key] || colorMap['unknown'];
        availabilityBadge.style.backgroundColor = colors[0];
        availabilityBadge.style.color = colors[1];
    
        // --- assemble ---
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
    }

    setupEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.openLogoutModal());
        }

        // Search with debounce
        const projSearch = document.getElementById('projectSearch');
        if (projSearch) {
            projSearch.addEventListener('input', () => this.debouncedSearch());
        }

        // View Project Modal
        const closeViewBtn = document.getElementById('closeViewProjectModal');
        const closeViewProject = document.getElementById('closeViewProject');
        if (closeViewBtn) closeViewBtn.addEventListener('click', () => ModalManager.hide('viewProjectModal'));
        if (closeViewProject) closeViewProject.addEventListener('click', () => ModalManager.hide('viewProjectModal'));

        // Edit Project Modal
        const closeEditBtn = document.getElementById('closeEditModal');
        const cancelEditBtn = document.getElementById('cancelEditModal');
        const saveTeamBtn = document.getElementById('saveProjectTeam');
        
        if (closeEditBtn) closeEditBtn.addEventListener('click', () => ModalManager.hide('editProjectModal'));
        if (cancelEditBtn) cancelEditBtn.addEventListener('click', () => ModalManager.hide('editProjectModal'));
        if (saveTeamBtn) saveTeamBtn.addEventListener('click', () => this.saveSelectedEmployees());

        // Employee filters
        const employeeSearchFilter = document.getElementById('employeeSearchFilter');
        const availabilityFilter = document.getElementById('availabilityFilter');
        
        if (employeeSearchFilter) {
            employeeSearchFilter.addEventListener('input', () => this.debouncedEmployeeFilter());
        }
        
        if (availabilityFilter) {
            availabilityFilter.addEventListener('change', () => this.filterEmployees());
        }

        // Logout Modal
        const cancelLogoutBtn = document.getElementById('cancelLogout');
        const confirmLogoutBtn = document.getElementById('confirmLogout');
        if (cancelLogoutBtn) cancelLogoutBtn.addEventListener('click', () => ModalManager.hide('logoutModal'));
        if (confirmLogoutBtn) confirmLogoutBtn.addEventListener('click', () => this.handleLogout());

        // Close modals on overlay click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        });
    }

    async loadProjects() {
        try {
            const projects = await this.dataService.getAllProjects();
    
            // Store projects in both DataService (for assignable count) and ProjectApp (for UI)
            this.dataService.projects = projects.map(proj => ({
                projectId: proj.projectId,
                teamSize: proj.teamSize
            }));
    
            this.projects = projects; // full project objects for UI
            this.uiManager.renderProjects(projects);
        } catch (error) {
            console.error('Error loading projects:', error);
            MessageManager.error('Failed to load projects');
        }
    }

    async getAssignedCount(projectId) {
        const { data, error } = await supabase
          .from('project_assignments')
          .select('id')
          .eq('project_id', projectId)
          .eq('status', 'assigned');
      
        if (error) throw error;
        return data.length; // number of assigned employees
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
      
          // ---- Basic Info ----
          document.getElementById('viewProjectName').textContent = project.name || 'Untitled Project';
          document.getElementById('viewProjectId').textContent = project.id;
      
          // ---- Status ----
          const statusElement = document.getElementById('viewProjectStatus');
          statusElement.textContent = this.uiManager.capitalize(project.status || 'pending');
          statusElement.style.color = this.uiManager.getStatusColor(project.status);
      
          // ---- Manager ----
          const managerName =
          project.users?.name ||
          'Unassigned';
        
          document.getElementById('viewProjectManager').textContent = managerName;
      
          // ---- Team Size ----
          const totalNeeded = project.project_requirements
            ? project.project_requirements.reduce((sum, req) => sum + (req.quantity_needed || 0), 0)
            : 0;
          document.getElementById('viewProjectTeamSize').textContent = `${totalNeeded} members`;
      
          // ---- Deadline ----
          let deadlineText = 'No deadline set';
          if (project.end_date) {
            const date = new Date(project.end_date);
            if (!isNaN(date)) deadlineText = date.toLocaleDateString();
          }
          document.getElementById('viewProjectDeadline').textContent = deadlineText;
      
          // ---- Skills ----
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
    
            // 🧹 Reset previous selections and counts
            this.assignedEmployees[projectId] = new Set();
            this.currentProjectId = projectId;
            const selectedCountEl = document.getElementById("selectedCount");
            if (selectedCountEl) selectedCountEl.textContent = 0;
    
            // 1. Preload already assigned employees (freshly)
            await this.preloadAssignedEmployees(projectId);
    
            // 2. Fetch project details and all employees concurrently
            const [project, employees] = await Promise.all([
                this.dataService.getProjectById(projectId),
                this.dataService.getAllEmployees()
            ]);
    
            // 3. Fetch recommended employees from FastAPI
            let recommendedEmployees = [];
            try {
                const res = await fetch(`http://127.0.0.1:8000/recommendations/${projectId}`);
                const data = await res.json();
                recommendedEmployees = data.recommendations.flatMap(r =>
                    r.recommended_employees.map(emp => ({
                        employee_id: emp.employee_id,
                        user_id: emp.user_id
                    }))
                );
            } catch (err) {
                console.warn("Failed to fetch recommendations:", err);
            }
    
            ModalManager.hideLoading();
    
            if (!project) {
                MessageManager.error("Project not found");
                return;
            }
    
            // 4. Store references for filtering & modal rendering
            this.currentProjectId = project.id;
            this.allEmployees = employees;
            this.recommendedIds = recommendedEmployees.map(emp => emp.employee_id);
    
            // 5. Store projects for badge calculation
            if (!this.projects) this.projects = [];
            const existing = this.projects.find(p => p.projectId === project.id);
            if (!existing) {
                const totalNeeded = project.project_requirements.reduce(
                    (sum, r) => sum + (r.quantity_needed || 0),
                    0
                );
                this.projects.push({ projectId: project.id, teamSize: totalNeeded });
            }
    
            // 6. Render modal content
            this.showEditProjectModal(project);
    
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
    
        const deadlineText = project.end_date
            ? new Date(project.end_date).toLocaleDateString()
            : "No deadline set";
        document.getElementById("modalProjectDeadline").textContent = deadlineText;
    
        this.uiManager.renderSkillsList(
            document.getElementById("modalRequiredSkills"),
            project.project_requirements || []
        );
    
        // Reset filters
        const searchFilter = document.getElementById("employeeSearchFilter");
        const availFilter = document.getElementById("availabilityFilter");
        if (searchFilter) searchFilter.value = "";
        if (availFilter) availFilter.value = "recommended";
    
        // Render employees list (will now reapply recommended & assigned highlights cleanly)
        this.filterEmployees();
    
        if (availFilter) {
            availFilter.addEventListener("change", () => this.filterEmployees());
        }
    
        ModalManager.show("editProjectModal");
    }
    

// -----------------------------
// Preload existing assignments
// -----------------------------
async preloadAssignedEmployees(projectId) {
    const { data, error } = await supabase
        .from('project_assignments')
        .select('user_id')
        .eq('project_id', projectId);

    if (error) {
        console.warn("Failed to load existing assignments:", error);
        this.assignedEmployees[projectId] = new Set();
        return;
    }

    this.assignedEmployees[projectId] = new Set(data.map(d => String(d.user_id)));
}

// -----------------------------
// Compute remaining assignable slots
// -----------------------------
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

    // Exclude managers
    let eligibleEmployees = this.allEmployees.filter(emp => {
        const role = (emp.job_title || "").toLowerCase();
        return role !== "resource manager" && role !== "project manager";
    });

    // Apply recommended / all filter
    let filtered = availValue === "all"
        ? [...eligibleEmployees]
        : eligibleEmployees.filter(emp => this.recommendedIds.includes(emp.employee_id));

    // Apply search filter
    if (searchQuery) {
        filtered = filtered.filter(emp =>
            (emp.users?.name || "").toLowerCase().includes(searchQuery) ||
            (emp.job_title || "").toLowerCase().includes(searchQuery) ||
            (emp.skills || []).some(skill => skill.toLowerCase().includes(searchQuery))
        );
    }

    // Prepare data for UI rendering
    const renderData = filtered.map(emp => ({
        id: emp.employee_id,
        user_id: emp.users?.id,  // <-- add this
        name: emp.users?.name || "Unnamed",
        role: emp.job_title || "No role specified",
        skills: emp.skills || ["General"],
        availability: emp.status || "available"
    }));

    const empList = document.getElementById("employeesList");
    this.uiManager.renderEmployeesList(empList, renderData);

    // Highlight recommended and disable already assigned
    // Highlight assigned / recommended
    const assignedSet = this.assignedEmployees[this.currentProjectId] || new Set();
    document.querySelectorAll(".employee-checkbox").forEach(cb => {
        const userId = cb.dataset.userId;
        const empId = cb.dataset.empId;
    
        // Find the employee object
        const emp = this.allEmployees.find(e => e.employee_id == empId);
    
        // Already assigned
        if ((this.assignedEmployees[this.currentProjectId] || new Set()).has(userId)) {
            cb.checked = true;
            cb.disabled = false; // assigned employees can still be unchecked if you want
            cb.parentElement.classList.add("assigned");
            cb.title = "Already assigned";
        } 
        // Recommended but not assigned
        else if (this.recommendedIds.includes(empId)) {
            cb.checked = false;
            cb.parentElement.classList.add("recommended");
        } 
        // Normal state
        else {
            cb.checked = false;
            cb.parentElement.classList.remove("assigned");
            cb.parentElement.classList.remove("recommended");
        }
    
        // Disable if busy
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



    async saveSelectedEmployees() {
        try {
            const checkboxes = document.querySelectorAll(".employee-checkbox");
            const assignedSet = this.assignedEmployees[this.currentProjectId] || new Set();
    
            // -------------------------
            // Get currently checked employee IDs
            // -------------------------
            const currentlyCheckedIds = Array.from(checkboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.dataset.empId);
    
            console.log("DEBUG currentlyCheckedIds:", currentlyCheckedIds);
    
            // -------------------------
            // Map previously assigned user IDs → employee IDs
            // -------------------------
            const previouslyAssignedIds = Array.from(assignedSet).map(userId => {
                const emp = this.allEmployees.find(e => e.users?.id == userId);
                return emp?.employee_id;
            }).filter(Boolean);
    
            console.log("DEBUG previouslyAssignedIds:", previouslyAssignedIds);
    
            // -------------------------
            // Determine newly selected (to add) and unselected (to remove)
            // -------------------------
            const newlySelectedIds = currentlyCheckedIds.filter(id => !previouslyAssignedIds.includes(id));
            const toRemoveIds = previouslyAssignedIds.filter(id => !currentlyCheckedIds.includes(id));
    
            console.log("DEBUG newlySelectedIds:", newlySelectedIds);
            console.log("DEBUG toRemoveIds:", toRemoveIds);
    
            // -------------------------
            // Map employee_id → user_id for DB operations
            // -------------------------
            const newlySelectedUserIds = newlySelectedIds.map(empId => {
                const emp = this.allEmployees.find(e => e.employee_id === empId);
                return emp?.users?.id || null;
            }).filter(Boolean);
    
            const toRemoveUserIds = toRemoveIds.map(empId => {
                const emp = this.allEmployees.find(e => e.employee_id === empId);
                return emp?.users?.id || null;
            }).filter(Boolean);
    
            console.log("DEBUG newlySelectedUserIds:", newlySelectedUserIds);
            console.log("DEBUG toRemoveUserIds:", toRemoveUserIds);
    
            if (!newlySelectedUserIds.length && !toRemoveUserIds.length) {
                Swal.fire({
                    icon: 'warning',
                    title: 'No changes',
                    text: 'Please select or unselect at least one employee.'
                });
                return;
            }
    
            // -------------------------
            // Check team size for adding only
            // -------------------------
            const totalNeeded = this.projects.find(p => p.projectId === this.currentProjectId)?.teamSize || 0;
            const currentlyAssignedCount = assignedSet.size;
            const slotsLeft = totalNeeded - (currentlyAssignedCount - toRemoveUserIds.length);
    
            console.log("DEBUG totalNeeded:", totalNeeded);
            console.log("DEBUG currentlyAssignedCount:", currentlyAssignedCount);
            console.log("DEBUG slotsLeft:", slotsLeft);
    
            if (newlySelectedUserIds.length > slotsLeft) {
                Swal.fire({
                    icon: 'error',
                    title: 'Too many selections',
                    text: `You can only assign ${slotsLeft} more employee(s) to this project.`
                });
                return;
            }
    
            ModalManager.showLoading();
    
            // -------------------------
            // FRONTEND EXPERIENCE-LEVEL CHECK
            // -------------------------
            for (const userId of newlySelectedUserIds) {
                try {
                    // Get user’s experience level
                    const { data: userDetail, error: detailError } = await supabase
                        .from("user_details")
                        .select("experience_level")
                        .eq("user_id", userId)
                        .single();
    
                    if (detailError) throw detailError;
                    const expLevel = userDetail.experience_level;
    
                    // Count active assignments
                    const { data: activeAssignments, error: activeError } = await supabase
                        .from("project_assignments")
                        .select("id")
                        .eq("user_id", userId)
                        .eq("status", "assigned");
    
                    if (activeError) throw activeError;
                    const activeCount = activeAssignments.length;
    
                    // Determine max allowed
                    let maxAllowed = 1;
                    if (expLevel === "intermediate") maxAllowed = 2;
                    else if (expLevel === "advanced") maxAllowed = 3;
    
                    console.log(`DEBUG user ${userId} expLevel=${expLevel}, activeCount=${activeCount}, maxAllowed=${maxAllowed}`);
    
                    if (activeCount >= maxAllowed) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Assignment limit reached',
                            text: `User (experience: ${expLevel}) already has ${activeCount}/${maxAllowed} active project(s).`
                        });
                        continue; // Skip assigning this one
                    }
    
                    // Proceed to assign only if below limit
                    const { error: insertError } = await supabase
                        .from("project_assignments")
                        .insert([{
                            project_id: Number(this.currentProjectId),
                            user_id: Number(userId),
                            status: 'assigned'
                        }]);
                    if (insertError) throw insertError;
    
                    assignedSet.add(String(userId));
                    console.log("DEBUG Assigned user:", userId);
                } catch (err) {
                    console.error("DEBUG Error assigning user:", userId, err);
                    Swal.fire({
                        icon: 'error',
                        title: 'Assignment Failed',
                        text: `Failed to assign user ID ${userId}. Check console for details.`
                    });
                }
            }
    
            // -------------------------
            // Remove unassigned employees
            // -------------------------
            for (const userId of toRemoveUserIds) {
                const { error } = await supabase
                    .from("project_assignments")
                    .delete()
                    .match({
                        project_id: Number(this.currentProjectId),
                        user_id: Number(userId)
                    });
    
                if (error) console.error("Failed to remove user_id", userId, error);
                else {
                    console.log("Removed user_id", userId);
                    assignedSet.delete(String(userId));
                }
            }
    
            console.log("DEBUG Updated assignedSet:", Array.from(assignedSet));
    
            // -------------------------
            // Update UI
            // -------------------------
            this.updateAssignedUI();
    
            ModalManager.hideLoading();
            ModalManager.hide("editProjectModal");
    
            Swal.fire({
                icon: 'success',
                title: 'Team Updated',
                text: `Project team updated successfully!`
            });
    
        } catch (err) {
            ModalManager.hideLoading();
            ModalManager.hide("editProjectModal");
            console.error("Error saving project team:", err);
            Swal.fire({
                icon: 'error',
                title: 'Save Failed',
                text: 'Failed to update project team. Check console for details.'
            });
        }
    }
    
    updateAssignedUI() {
        const checkboxes = document.querySelectorAll('.employee-checkbox');
        const assignedSet = this.assignedEmployees[this.currentProjectId] || new Set();
    
        checkboxes.forEach(cb => {
            const userId = String(cb.dataset.userId); // ensure string
            const empId = cb.dataset.empId;
    
            if (assignedSet.has(userId)) {
                cb.checked = true;
                cb.disabled = false;
                cb.parentElement.classList.add('assigned');
                cb.parentElement.classList.remove('recommended');
            } else if (this.recommendedIds.includes(empId)) {
                cb.checked = false; // do NOT auto-check recommended
                cb.parentElement.classList.remove('assigned');
                cb.parentElement.classList.add('recommended');
            } else {
                cb.checked = false;
                cb.parentElement.classList.remove('assigned');
                cb.parentElement.classList.remove('recommended');
            }
        });
    
        // Update selected count
        const selectedCountEl = document.getElementById('selectedCount');
        if (selectedCountEl) {
            const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
            selectedCountEl.textContent = checkedCount;
        }
    }
    

    openLogoutModal() {
        ModalManager.show('logoutModal');
    }

    async handleLogout() {
        try {
            // Hide the modal and show loading overlay
            ModalManager.hide('logoutModal');
            ModalManager.showLoading();
    
            // Sign out the user via Supabase
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
    
            // Clear any local storage/session storage if used
            localStorage.clear();
            sessionStorage.clear();
    
            // Hide loading overlay
            ModalManager.hideLoading();
    
            // Optional: show a success message
            MessageManager.success('You have been logged out successfully.');
    
            // Redirect to login page
            window.location.href = '/login/HTML_Files/login.html'; // <-- change path if needed
        } catch (err) {
            ModalManager.hideLoading();
            console.error('Logout failed:', err);
            MessageManager.error('Logout failed. Please try again.');
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