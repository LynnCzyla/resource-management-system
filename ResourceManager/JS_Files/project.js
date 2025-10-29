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
    static show(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    static hide(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
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
// DATA SERVICE (In-Memory Storage)
// ============================================

class DataService {
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
          .from('projects')
          .select(`
            id,
            name,
            status,
            end_date,
            project_requirements(quantity_needed),
            resource_requests(status)
          `)
          .eq('resource_requests.status', 'approved');
      
        if (error) {
          console.error("Error loading projects:", error);
          throw error;
        }
      
        // Format data for your UI
        const formatted = (data || []).map(project => ({
          projectId: project.id,
          projectName: project.name,
          projectStatus: project.status,
          teamSize: (project.project_requirements || [])
            .reduce((sum, req) => sum + (req.quantity_needed || 0), 0),
          deadline: project.end_date
        }));
      
        return formatted;
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
      
      
      
  
    // Placeholder — can later compute remaining assignable slots
    getAssignableCount(projectId) {
      return 0;
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

        const assignableCount = this.dataService.getAssignableCount(proj.projectId);
        if (assignableCount > 0) {
            const badge = document.createElement('span');
            badge.className = 'notification-badge';
            badge.textContent = assignableCount;
            editContainer.appendChild(editBtn);
            editContainer.appendChild(badge);
        } else {
            editContainer.appendChild(editBtn);
        }

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
        const card = document.createElement('div');
        card.className = 'recommendation-card';
        card.dataset.empId = emp.id;
    
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'employee-checkbox';
        checkbox.dataset.empId = emp.id;
    
        const number = document.createElement('span');
        number.className = 'employee-number';
        number.textContent = `${index + 1}.`;
    
        const avatar = document.createElement('img');
        avatar.src = emp.avatar
            ? emp.avatar
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random&color=fff`;
        avatar.alt = emp.name || "Employee";
        avatar.className = 'employee-avatar-circle';
    
        const details = document.createElement('div');
        details.className = 'recommendation-details';
    
        const h4 = document.createElement('h4');
        h4.textContent = emp.name;
    
        const p = document.createElement('p');
        p.textContent = emp.role;
    
        const skillsDiv = document.createElement('div');
        skillsDiv.className = 'recommendation-skills';
        
        if (emp.skills && emp.skills.length > 0) {
            emp.skills.slice(0, 4).forEach(skill => {
                const skillSpan = document.createElement('span');
                skillSpan.className = 'skill-tag';
                skillSpan.textContent = skill;
                skillsDiv.appendChild(skillSpan);
            });
        } else {
            const skillSpan = document.createElement('span');
            skillSpan.className = 'skill-tag';
            skillSpan.textContent = 'No skills';
            skillsDiv.appendChild(skillSpan);
        }
        
    
        details.appendChild(h4);
        details.appendChild(p);
        details.appendChild(skillsDiv);
    
        const availabilityBadge = document.createElement('span');
        availabilityBadge.className = 'match-score';
        
        const availabilityMap = {
            'available': 'Available (0-4h)',
            'partial': 'Partial (4-7h)',
            'full': 'Full (8h)',
            'over': 'Overtime (10h)'
        };
        
        availabilityBadge.textContent = availabilityMap[emp.availability] || emp.availability;
        
        if (emp.availability === 'available') {
            availabilityBadge.style.backgroundColor = '#E8F5E9';
            availabilityBadge.style.color = '#2E7D32';
        } else if (emp.availability === 'partial') {
            availabilityBadge.style.backgroundColor = '#FFF3E0';
            availabilityBadge.style.color = '#E65100';
        } else if (emp.availability === 'full') {
            availabilityBadge.style.backgroundColor = '#E3F2FD';
            availabilityBadge.style.color = '#1565C0';
        } else if (emp.availability === 'over') {
            availabilityBadge.style.backgroundColor = '#FFEBEE';
            availabilityBadge.style.color = '#C62828';
        }
    
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
      
      

      async editProject(id) {
        try {
            ModalManager.showLoading();
    
            // Fetch project & employees
            const [project, employees] = await Promise.all([
                this.dataService.getProjectById(id),
                this.dataService.getAllEmployees()
            ]);
    
            let recommendedEmployees = [];
            try {
                const response = await fetch(`http://127.0.0.1:8000/recommendations/${id}`);
                const data = await response.json();
                // Flatten recommended employee IDs from all requirement rows as strings
                recommendedEmployees = data.recommendations.flatMap(r => r.recommended_employees.map(String));
                console.log("Recommended Employees from API:", recommendedEmployees);
            } catch (err) {
                console.warn("Failed to fetch recommendations:", err);
            }
    
            ModalManager.hideLoading();
    
            if (!project) {
                MessageManager.error('Project not found');
                return;
            }
    
            // Render modal with employees and recommendations
            this.showEditProjectModal(project, employees, recommendedEmployees);
        } catch (error) {
            ModalManager.hideLoading();
            console.error('Error editing project:', error);
            MessageManager.error('Failed to load project details');
        }
    }
    
    showEditProjectModal(project, employees, recommendedEmployees = []) {
        this.currentProjectId = project.id;
        this.allEmployees = employees;
        this.recommendedIds = recommendedEmployees.map(String); // ensure string for comparison
        this.showingAllEmployees = false;
    
        // ---- Basic project info ----
        document.getElementById('modalProjectName').textContent = project.name || 'Untitled Project';
        document.getElementById('modalProjectId').textContent = project.id;
    
        const totalNeeded = project.project_requirements
            ? project.project_requirements.reduce((sum, req) => sum + (req.quantity_needed || 0), 0)
            : 0;
        this.currentProjectTotalNeeded = totalNeeded;
        document.getElementById('modalTeamSize').textContent = `${totalNeeded} members`;
    
        // ---- Status & Deadline ----
        const statusElement = document.getElementById('modalProjectStatus');
        if (statusElement) {
            statusElement.innerHTML = '';
            const statusSpan = document.createElement('span');
            statusSpan.className = `project-status ${project.status}`;
            statusSpan.textContent = this.uiManager.capitalize(project.status);
            statusElement.appendChild(statusSpan);
        }
    
        let deadlineText = 'No deadline set';
        if (project.end_date) {
            const date = new Date(project.end_date);
            if (!isNaN(date)) deadlineText = date.toLocaleDateString();
        }
        document.getElementById('modalProjectDeadline').textContent = deadlineText;
    
        // ---- Skills list ----
        const skillsContainer = document.getElementById('modalRequiredSkills');
        this.uiManager.renderSkillsList(skillsContainer, project.project_requirements || []);
    
        // ---- Employee count ----
        document.getElementById('totalNeededCount').textContent = totalNeeded;
        document.getElementById('selectedCount').textContent = 0;
    
        // ---- Reset filters ----
        const searchFilter = document.getElementById('employeeSearchFilter');
        const availFilter = document.getElementById('availabilityFilter');
        if (searchFilter) searchFilter.value = '';
        if (availFilter) availFilter.value = 'recommended';
    
        // ---- Render employees ----
        this.filterEmployees();
    
        // Listen for toggle change
        if (availFilter) {
            availFilter.addEventListener('change', () => this.filterEmployees());
        }
    
        ModalManager.show('editProjectModal');
    }
    
    
    
    
    filterEmployees() {
        if (!this.allEmployees) return;
    
        const searchInput = document.getElementById('employeeSearchFilter');
        const availFilter = document.getElementById('availabilityFilter');
    
        const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const availValue = availFilter ? availFilter.value : 'recommended';
    
        // Filter out RM/PM
        let eligibleEmployees = this.allEmployees.filter(emp => {
            const role = (emp.job_title || '').toLowerCase();
            return role !== 'resource manager' && role !== 'project manager';
        });
    
        let filtered = [];
    
        if (availValue === 'recommended') {
            filtered = eligibleEmployees.filter(emp =>
                this.recommendedIds.includes(String(emp.employee_id))
            );
        } else if (availValue === 'all') {
            filtered = [...eligibleEmployees];
        }
    
        // Apply search filter
        if (searchQuery) {
            filtered = filtered.filter(emp =>
                (emp.users?.name || '').toLowerCase().includes(searchQuery) ||
                (emp.job_title || '').toLowerCase().includes(searchQuery) ||
                (emp.skills || []).some(skill => skill.toLowerCase().includes(searchQuery))
            );
        }
    
        // Transform for UI
        const renderData = filtered.map((emp, i) => ({
            id: emp.employee_id,
            name: emp.users?.name || 'Unnamed',
            role: emp.job_title || 'No role specified',
            skills: emp.skills || ['General'],
            availability: emp.status || 'available'
        }));
    
        const empList = document.getElementById('employeesList');
        this.uiManager.renderEmployeesList(empList, renderData);
    
        // Pre-check AI recommended employees
        document.querySelectorAll('.employee-checkbox').forEach(cb => {
            if (this.recommendedIds.includes(cb.dataset.empId)) {
                cb.checked = true;
                cb.parentElement.classList.add('recommended');
            }
    
            cb.addEventListener('change', () => this.updateSelectionCount());
        });
    
        document.getElementById('employeeCount').textContent = filtered.length;
        this.updateSelectionCount();
    }
    
    
    
    
    

    updateSelectionCount() {
        const checkboxes = document.querySelectorAll('.employee-checkbox');
        const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        const selectedCountEl = document.getElementById('selectedCount');
        if (selectedCountEl) {
            selectedCountEl.textContent = checkedCount;
        }
    }

    async saveSelectedEmployees() {
        try {
            const checkboxes = document.querySelectorAll('.employee-checkbox:checked');
            const selectedEmployees = Array.from(checkboxes).map(cb => cb.dataset.empId);
            
            if (selectedEmployees.length === 0) {
                MessageManager.warning('Please select at least one employee');
                return;
            }

            ModalManager.hide('editProjectModal');
            ModalManager.showLoading();
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            ModalManager.hideLoading();
            MessageManager.success(`${selectedEmployees.length} employee(s) assigned to project successfully!`);
            this.loadProjects();
        } catch (error) {
            ModalManager.hideLoading();
            console.error('Error saving project team:', error);
            MessageManager.error('Failed to save project team');
        }
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
        }, 1000);
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