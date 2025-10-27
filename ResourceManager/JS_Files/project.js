// ============================================
// UTILITY FUNCTIONS
// ============================================

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
    constructor() {
        this.projects = [];
        this.employees = [];
        this.assignableCounts = {};
        this.initializeMockData();
    }

    initializeMockData() {
        this.projects = [
            {
                id: 'PROJ001',
                name: 'Project Alpha',
                status: 'active',
                teamSize: 5,
                progress: 65,
                deadline: '2025-12-15',
                manager: 'Sarah Williams',
                skills: ['Python', 'React', 'AWS']
            },
            {
                id: 'PROJ002',
                name: 'Project Beta',
                status: 'active',
                teamSize: 3,
                progress: 45,
                deadline: '2025-11-30',
                manager: 'John Anderson',
                skills: ['Figma', 'Adobe XD', 'UI Design']
            },
            {
                id: 'PROJ003',
                name: 'Project Gamma',
                status: 'pending',
                teamSize: 4,
                progress: 20,
                deadline: '2026-01-20',
                manager: 'Lisa Chen',
                skills: ['Java', 'Spring Boot', 'SQL']
            },
            {
                id: 'PROJ004',
                name: 'Project Delta',
                status: 'active',
                teamSize: 6,
                progress: 80,
                deadline: '2025-11-10',
                manager: 'Mark Taylor',
                skills: ['Angular', 'Node.js', 'MongoDB']
            },
            {
                id: 'PROJ005',
                name: 'Project Epsilon',
                status: 'completed',
                teamSize: 4,
                progress: 100,
                deadline: '2025-10-01',
                manager: 'Sarah Williams',
                skills: ['Docker', 'Kubernetes', 'AWS']
            }
        ];

        this.employees = [
            {
                id: 'EMP001',
                name: 'John Doe',
                role: 'Senior Developer',
                department: 'Engineering',
                skills: ['Python', 'JavaScript', 'React', 'Node.js'],
                availability: 'full',
                workloadHours: 8,
                projects: ['Project Alpha'],
                experience: '5 years',
                avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=4A90E2&color=fff'
            },
            {
                id: 'EMP002',
                name: 'Jane Smith',
                role: 'UI/UX Designer',
                department: 'Design',
                skills: ['Figma', 'Adobe XD', 'Photoshop', 'UI Design'],
                availability: 'over',
                workloadHours: 10,
                projects: ['Project Beta', 'Project Gamma'],
                experience: '4 years',
                avatar: 'https://ui-avatars.com/api/?name=Jane+Smith&background=7ED321&color=fff'
            },
            {
                id: 'EMP003',
                name: 'Mike Johnson',
                role: 'Full Stack Developer',
                department: 'Engineering',
                skills: ['Java', 'Spring Boot', 'Angular', 'SQL'],
                availability: 'partial',
                workloadHours: 6,
                projects: ['Project Delta'],
                experience: '6 years',
                avatar: 'https://ui-avatars.com/api/?name=Mike+Johnson&background=F5A623&color=fff'
            },
            {
                id: 'EMP004',
                name: 'Sarah Williams',
                role: 'Project Manager',
                department: 'Management',
                skills: ['Agile', 'Scrum', 'Jira', 'Team Leadership'],
                availability: 'available',
                workloadHours: 3,
                projects: [],
                experience: '7 years',
                avatar: 'https://ui-avatars.com/api/?name=Sarah+Williams&background=D0021B&color=fff'
            },
            {
                id: 'EMP005',
                name: 'David Brown',
                role: 'DevOps Engineer',
                department: 'Engineering',
                skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD'],
                availability: 'over',
                workloadHours: 9,
                projects: ['Project Alpha', 'Project Epsilon'],
                experience: '5 years',
                avatar: 'https://ui-avatars.com/api/?name=David+Brown&background=4A90E2&color=fff'
            },
            {
                id: 'EMP006',
                name: 'Emily Davis',
                role: 'Frontend Developer',
                department: 'Engineering',
                skills: ['Vue.js', 'CSS', 'HTML', 'TypeScript'],
                availability: 'available',
                workloadHours: 2,
                projects: [],
                experience: '3 years',
                avatar: 'https://ui-avatars.com/api/?name=Emily+Davis&background=7ED321&color=fff'
            },
            {
                id: 'EMP007',
                name: 'Robert Martinez',
                role: 'Backend Developer',
                department: 'Engineering',
                skills: ['Node.js', 'MongoDB', 'Express', 'GraphQL'],
                availability: 'full',
                workloadHours: 8,
                projects: ['Project Beta'],
                experience: '4 years',
                avatar: 'https://ui-avatars.com/api/?name=Robert+Martinez&background=F5A623&color=fff'
            },
            {
                id: 'EMP008',
                name: 'Lisa Anderson',
                role: 'QA Engineer',
                department: 'Quality Assurance',
                skills: ['Selenium', 'Jest', 'Automation', 'Testing'],
                availability: 'partial',
                workloadHours: 5,
                projects: ['Project Alpha'],
                experience: '3 years',
                avatar: 'https://ui-avatars.com/api/?name=Lisa+Anderson&background=D0021B&color=fff'
            }
        ];

        this.assignableCounts = {
            'PROJ001': 8,
            'PROJ002': 8,
            'PROJ003': 8,
            'PROJ004': 8,
            'PROJ005': 8
        };
    }

    async getAllProjects() {
        return Promise.resolve([...this.projects]);
    }

    async getProjectById(id) {
        return Promise.resolve(this.projects.find(proj => proj.id === id));
    }

    async getAllEmployees() {
        return Promise.resolve([...this.employees]);
    }

    async getEmployeeById(id) {
        return Promise.resolve(this.employees.find(emp => emp.id === id));
    }

    getAssignableCount(projectId) {
        return this.assignableCounts[projectId] || 0;
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
        tr.dataset.id = proj.id;

        const tdName = document.createElement('td');
        const strongName = document.createElement('strong');
        strongName.textContent = proj.name;
        tdName.appendChild(strongName);

        const tdStatus = document.createElement('td');
        const statusSpan = document.createElement('span');
        statusSpan.className = `project-status ${proj.status}`;
        statusSpan.textContent = this.capitalize(proj.status);
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
        viewBtn.onclick = () => app.viewProject(proj.id);

        const editContainer = document.createElement('div');
        editContainer.className = 'action-btn-with-badge';

        const editBtn = document.createElement('button');
        editBtn.className = 'icon-btn';
        editBtn.title = 'Assign Team';
        editBtn.innerHTML = '<i class="fas fa-user-plus"></i>';
        editBtn.onclick = () => app.editProject(proj.id);

        const assignableCount = this.dataService.getAssignableCount(proj.id);
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

        const fragment = document.createDocumentFragment();
        
        skills.forEach(skill => {
            const span = document.createElement('span');
            span.className = 'skill-tag';
            span.textContent = skill;
            fragment.appendChild(span);
        });

        container.innerHTML = '';
        container.appendChild(fragment);
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
        avatar.src = emp.avatar;
        avatar.alt = emp.name;
        avatar.className = 'employee-avatar-circle';

        const details = document.createElement('div');
        details.className = 'recommendation-details';

        const h4 = document.createElement('h4');
        h4.textContent = emp.name;

        const p = document.createElement('p');
        p.textContent = emp.role;

        const skillsDiv = document.createElement('div');
        skillsDiv.className = 'recommendation-skills';
        
        emp.skills.slice(0, 4).forEach(skill => {
            const skillSpan = document.createElement('span');
            skillSpan.className = 'skill-tag';
            skillSpan.textContent = skill;
            skillsDiv.appendChild(skillSpan);
        });

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
                proj.name.toLowerCase().includes(query) ||
                proj.manager.toLowerCase().includes(query) ||
                proj.id.toLowerCase().includes(query) ||
                proj.status.toLowerCase().includes(query)
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

            document.getElementById('viewProjectName').textContent = project.name;
            document.getElementById('viewProjectId').textContent = project.id;
            
            const statusElement = document.getElementById('viewProjectStatus');
            statusElement.textContent = this.uiManager.capitalize(project.status);
            statusElement.style.color = this.uiManager.getStatusColor(project.status);
            
            document.getElementById('viewProjectManager').textContent = project.manager;
            document.getElementById('viewProjectTeamSize').textContent = `${project.teamSize} members`;
            document.getElementById('viewProjectDeadline').textContent = this.uiManager.formatDate(project.deadline);
            
            document.getElementById('viewProjectProgress').textContent = `${project.progress}%`;
            const progressBar = document.getElementById('viewProjectProgressBar');
            progressBar.style.width = `${project.progress}%`;

            const skillsContainer = document.getElementById('viewProjectSkills');
            this.uiManager.renderSkillsList(skillsContainer, project.skills);

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
            const project = await this.dataService.getProjectById(id);
            const employees = await this.dataService.getAllEmployees();
            
            ModalManager.hideLoading();
            
            if (!project) {
                MessageManager.error('Project not found');
                return;
            }

            this.showEditProjectModal(project, employees);
        } catch (error) {
            ModalManager.hideLoading();
            console.error('Error editing project:', error);
            MessageManager.error('Failed to load project details');
        }
    }

    showEditProjectModal(project, employees) {
        this.currentProjectId = project.id;
        this.allEmployees = employees;

        document.getElementById('modalProjectName').textContent = project.name;
        document.getElementById('modalProjectId').textContent = project.id;
        document.getElementById('modalTeamSize').textContent = `${project.teamSize} members`;
        
        const statusElement = document.getElementById('modalProjectStatus');
        const statusSpan = document.createElement('span');
        statusSpan.className = `project-status ${project.status}`;
        statusSpan.textContent = this.uiManager.capitalize(project.status);
        statusElement.innerHTML = '';
        statusElement.appendChild(statusSpan);
        
        document.getElementById('modalProjectDeadline').textContent = this.uiManager.formatDate(project.deadline);
        
        const skillsContainer = document.getElementById('modalRequiredSkills');
        this.uiManager.renderSkillsList(skillsContainer, project.skills);

        document.getElementById('employeeCount').textContent = employees.length;
        
        // Reset filters
        const searchFilter = document.getElementById('employeeSearchFilter');
        const availFilter = document.getElementById('availabilityFilter');
        if (searchFilter) searchFilter.value = '';
        if (availFilter) availFilter.value = 'all';
        
        // Render all employees
        this.filterEmployees();

        ModalManager.show('editProjectModal');
    }

    filterEmployees() {
        if (!this.allEmployees) return;

        const searchInput = document.getElementById('employeeSearchFilter');
        const availFilter = document.getElementById('availabilityFilter');
        
        const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const availValue = availFilter ? availFilter.value : 'all';

        let filtered = [...this.allEmployees];

        // Filter by search
        if (searchQuery) {
            filtered = filtered.filter(emp => 
                emp.name.toLowerCase().includes(searchQuery) ||
                emp.role.toLowerCase().includes(searchQuery) ||
                emp.skills.some(skill => skill.toLowerCase().includes(searchQuery))
            );
        }

        // Filter by availability
        if (availValue !== 'all') {
            filtered = filtered.filter(emp => emp.availability === availValue);
        }

        const empList = document.getElementById('employeesList');
        this.uiManager.renderEmployeesList(empList, filtered);
        
        document.getElementById('employeeCount').textContent = filtered.length;
        document.getElementById('totalCount').textContent = filtered.length;
        
        this.updateSelectionCount();

        // Re-add checkbox listeners
        document.querySelectorAll('.employee-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateSelectionCount());
        });
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