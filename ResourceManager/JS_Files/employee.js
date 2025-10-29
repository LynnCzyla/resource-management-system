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

    getAllUniqueSkills() {
        const skillsSet = new Set();
        this.employees.forEach(emp => {
            emp.skills.forEach(skill => skillsSet.add(skill));
        });
        return Array.from(skillsSet).sort();
    }
}

// ============================================
// UI MANAGER
// ============================================

class UIManager {
    constructor(dataService) {
        this.dataService = dataService;
    }

    renderEmployees(employees) {
        const grid = document.getElementById('employeeGrid');
        
        if (!grid) return;

        if (employees.length === 0) {
            grid.innerHTML = '<p style="text-align: center; color: #6C757D; padding: 40px; grid-column: 1 / -1;">No employees found</p>';
            return;
        }

        const fragment = document.createDocumentFragment();

        employees.forEach(emp => {
            const card = this.createEmployeeCard(emp);
            fragment.appendChild(card);
        });

        grid.innerHTML = '';
        grid.appendChild(fragment);
    }

    createEmployeeCard(emp) {
        const card = document.createElement('div');
        card.className = 'employee-card';
        card.dataset.empId = emp.id;

        // Employee Header
        const header = document.createElement('div');
        header.className = 'employee-header';

        const avatar = document.createElement('img');
        avatar.src = emp.avatar;
        avatar.alt = emp.name;
        avatar.className = 'employee-avatar';

        const info = document.createElement('div');
        info.className = 'employee-info';

        const name = document.createElement('h3');
        name.textContent = emp.name;

        const role = document.createElement('div');
        role.className = 'employee-role';
        role.textContent = emp.role;

        const statusBadge = document.createElement('span');
        statusBadge.className = `status-badge ${emp.availability}`;
        statusBadge.textContent = this.getAvailabilityText(emp.availability);

        info.appendChild(name);
        info.appendChild(role);
        info.appendChild(statusBadge);

        header.appendChild(avatar);
        header.appendChild(info);

        // Employee Skills
        const skillsSection = document.createElement('div');
        skillsSection.className = 'employee-skills';

        const skillsTitle = document.createElement('h4');
        skillsTitle.textContent = 'Skills';

        const skillsList = document.createElement('div');
        skillsList.className = 'skills-list';

        emp.skills.forEach(skill => {
            const skillTag = document.createElement('span');
            skillTag.className = 'skill-tag';
            skillTag.textContent = skill;
            skillsList.appendChild(skillTag);
        });

        skillsSection.appendChild(skillsTitle);
        skillsSection.appendChild(skillsList);

        // Employee Actions
        const actions = document.createElement('div');
        actions.className = 'employee-actions';

        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn-primary';
        viewBtn.innerHTML = '<i class="fas fa-eye"></i> View Profile';
        viewBtn.onclick = () => app.viewEmployee(emp.id);

        const assignBtn = document.createElement('button');
        assignBtn.className = 'btn-secondary';
        assignBtn.innerHTML = '<i class="fas fa-plus"></i> Assign';
        assignBtn.onclick = () => app.assignEmployee(emp.id);

        actions.appendChild(viewBtn);
        actions.appendChild(assignBtn);

        // Assemble card
        card.appendChild(header);
        card.appendChild(skillsSection);
        card.appendChild(actions);

        return card;
    }

    getAvailabilityText(availability) {
        const map = {
            'available': 'Available',
            'partial': 'Partially Available',
            'full': 'Busy',
            'over': 'Overloaded'
        };
        return map[availability] || availability;
    }

    populateSkillsDropdown(dropdown, skills) {
        if (!dropdown) return;

        dropdown.innerHTML = '<option value="">All Skills</option>';
        
        skills.forEach(skill => {
            const option = document.createElement('option');
            option.value = skill;
            option.textContent = skill;
            dropdown.appendChild(option);
        });
    }

    populateProjectsDropdown(dropdown, projects) {
        if (!dropdown) return;

        dropdown.innerHTML = '<option value="">-- Select a project --</option>';
        
        projects.filter(p => p.status === 'active' || p.status === 'pending').forEach(proj => {
            const option = document.createElement('option');
            option.value = proj.id;
            option.textContent = `${proj.name} (${proj.status})`;
            dropdown.appendChild(option);
        });
    }

    renderSkillsList(container, skills) {
        if (!container) return;

        const fragment = document.createDocumentFragment();
        
        skills.forEach(skill => {
            const span = document.createElement('span');
            span.className = 'skill-badge';
            span.textContent = skill;
            fragment.appendChild(span);
        });

        container.innerHTML = '';
        container.appendChild(fragment);
    }
}

// ============================================
// EMPLOYEE APP
// ============================================

class EmployeeApp {
    constructor() {
        this.dataService = new DataService();
        this.uiManager = new UIManager(this.dataService);
        
        this.debouncedSearch = debounce(() => this.filterEmployees(), 300);
        
        this.currentEmployeeId = null;
        this.allEmployees = [];
    }

    async init() {
        this.setupEventListeners();
        await this.loadEmployees();
        await this.loadSkillsFilter();
        await this.loadProjectsForAssignment();
    }

    setupEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.openLogoutModal());
        }

        // Search with debounce
        const empSearch = document.getElementById('employeeSearch');
        if (empSearch) {
            empSearch.addEventListener('input', () => this.debouncedSearch());
        }

        // Filters
        const skillFilter = document.getElementById('skillFilter');
        const availFilter = document.getElementById('availabilityFilter');
        
        if (skillFilter) {
            skillFilter.addEventListener('change', () => this.filterEmployees());
        }
        
        if (availFilter) {
            availFilter.addEventListener('change', () => this.filterEmployees());
        }

        // View Employee Modal
        const closeViewBtn = document.getElementById('closeViewModal');
        const closeProfileBtn = document.getElementById('closeProfileBtn');
        
        if (closeViewBtn) closeViewBtn.addEventListener('click', () => ModalManager.hide('viewEmployeeModal'));
        if (closeProfileBtn) closeProfileBtn.addEventListener('click', () => ModalManager.hide('viewEmployeeModal'));

        // Assign Employee Modal
        const closeAssignBtn = document.getElementById('closeAssignModal');
        const cancelAssignBtn = document.getElementById('cancelAssignBtn');
        const submitAssignBtn = document.getElementById('submitAssignBtn');
        
        if (closeAssignBtn) closeAssignBtn.addEventListener('click', () => ModalManager.hide('assignEmployeeModal'));
        if (cancelAssignBtn) cancelAssignBtn.addEventListener('click', () => ModalManager.hide('assignEmployeeModal'));
        if (submitAssignBtn) submitAssignBtn.addEventListener('click', () => this.submitAssignment());

        // Busy Employee Modal
        const cancelBusyBtn = document.getElementById('cancelBusyAssign');
        const proceedBusyBtn = document.getElementById('proceedBusyAssign');
        
        if (cancelBusyBtn) cancelBusyBtn.addEventListener('click', () => {
            ModalManager.hide('busyEmployeeModal');
            ModalManager.show('assignEmployeeModal');
        });
        if (proceedBusyBtn) proceedBusyBtn.addEventListener('click', () => {
            ModalManager.hide('busyEmployeeModal');
            this.submitAssignment(true);
        });

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

    async loadEmployees() {
        try {
            this.allEmployees = await this.dataService.getAllEmployees();
            this.uiManager.renderEmployees(this.allEmployees);
        } catch (error) {
            console.error('Error loading employees:', error);
            MessageManager.error('Failed to load employees');
        }
    }

    async loadSkillsFilter() {
        try {
            const skills = this.dataService.getAllUniqueSkills();
            const dropdown = document.getElementById('skillFilter');
            this.uiManager.populateSkillsDropdown(dropdown, skills);
        } catch (error) {
            console.error('Error loading skills:', error);
        }
    }

    async loadProjectsForAssignment() {
        try {
            const projects = await this.dataService.getAllProjects();
            const dropdown = document.getElementById('assignProjectSelect');
            this.uiManager.populateProjectsDropdown(dropdown, projects);
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    }

    async filterEmployees() {
        try {
            const searchInput = document.getElementById('employeeSearch');
            const skillFilter = document.getElementById('skillFilter');
            const availFilter = document.getElementById('availabilityFilter');
            
            const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
            const selectedSkill = skillFilter ? skillFilter.value : '';
            const selectedAvail = availFilter ? availFilter.value : '';
            
            let filtered = [...this.allEmployees];
            
            // Filter by search query
            if (query) {
                filtered = filtered.filter(emp => 
                    emp.name.toLowerCase().includes(query) ||
                    emp.role.toLowerCase().includes(query) ||
                    emp.department.toLowerCase().includes(query) ||
                    emp.skills.some(skill => skill.toLowerCase().includes(query))
                );
            }
            
            // Filter by skill
            if (selectedSkill) {
                filtered = filtered.filter(emp => 
                    emp.skills.includes(selectedSkill)
                );
            }
            
            // Filter by availability
            if (selectedAvail) {
                filtered = filtered.filter(emp => emp.availability === selectedAvail);
            }
            
            this.uiManager.renderEmployees(filtered);
        } catch (error) {
            console.error('Error filtering employees:', error);
            MessageManager.error('Error filtering employees');
        }
    }

    async viewEmployee(id) {
        try {
            ModalManager.showLoading();
            const employee = await this.dataService.getEmployeeById(id);
            ModalManager.hideLoading();
            
            if (!employee) {
                MessageManager.error('Employee not found');
                return;
            }

            // Populate modal
            document.getElementById('viewEmpName').textContent = employee.name;
            document.getElementById('viewEmpAvatar').src = employee.avatar;
            document.getElementById('viewEmpId').textContent = employee.id;
            document.getElementById('viewEmpRole').textContent = employee.role;
            document.getElementById('viewEmpDepartment').textContent = employee.department;
            document.getElementById('viewEmpExperience').textContent = employee.experience;
            document.getElementById('viewEmpWorkload').textContent = `${employee.workloadHours} hours/week`;
            document.getElementById('viewEmpProjects').textContent = employee.projects.length > 0 ? employee.projects.join(', ') : 'None';

            // Populate skills
            const skillsContainer = document.getElementById('viewEmpSkills');
            this.uiManager.renderSkillsList(skillsContainer, employee.skills);

            ModalManager.show('viewEmployeeModal');
        } catch (error) {
            ModalManager.hideLoading();
            console.error('Error viewing employee:', error);
            MessageManager.error('Failed to load employee details');
        }
    }

    async assignEmployee(id) {
        try {
            ModalManager.showLoading();
            const employee = await this.dataService.getEmployeeById(id);
            ModalManager.hideLoading();
            
            if (!employee) {
                MessageManager.error('Employee not found');
                return;
            }

            this.currentEmployeeId = id;

            // Populate modal
            document.getElementById('assignEmpAvatar').src = employee.avatar;
            document.getElementById('assignEmpName').textContent = employee.name;
            document.getElementById('assignEmpRole').textContent = employee.role;

            // Set default start date to today
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('assignStartDate').value = today;

            // Reset form
            document.getElementById('assignEmployeeForm').reset();
            document.getElementById('assignStartDate').value = today;

            ModalManager.show('assignEmployeeModal');
        } catch (error) {
            ModalManager.hideLoading();
            console.error('Error loading assignment modal:', error);
            MessageManager.error('Failed to load employee details');
        }
    }

    async submitAssignment(forceAssign = false) {
        try {
            const form = document.getElementById('assignEmployeeForm');
            const projectId = document.getElementById('assignProjectSelect').value;
            const hours = document.getElementById('assignHours').value;
            const startDate = document.getElementById('assignStartDate').value;
            const notes = document.getElementById('assignNotes').value;

            if (!projectId) {
                MessageManager.warning('Please select a project');
                return;
            }

            if (!hours || hours < 1 || hours > 40) {
                MessageManager.warning('Please enter valid hours (1-40)');
                return;
            }

            if (!startDate) {
                MessageManager.warning('Please select a start date');
                return;
            }

            const employee = await this.dataService.getEmployeeById(this.currentEmployeeId);
            
            // Check if employee is busy
            if (!forceAssign && (employee.availability === 'full' || employee.availability === 'over')) {
                const busyText = document.getElementById('busyEmployeeText');
                busyText.textContent = `${employee.name} is currently ${employee.availability === 'full' ? 'fully allocated' : 'overloaded'} with ${employee.workloadHours} hours of work. Assigning them to another project may impact their performance. Do you want to proceed anyway?`;
                
                ModalManager.hide('assignEmployeeModal');
                ModalManager.show('busyEmployeeModal');
                return;
            }

            ModalManager.hide('assignEmployeeModal');
            ModalManager.showLoading();
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            ModalManager.hideLoading();
            MessageManager.success(`${employee.name} has been assigned to the project successfully!`);
            
            // Reload employees
            await this.loadEmployees();
        } catch (error) {
            ModalManager.hideLoading();
            console.error('Error submitting assignment:', error);
            MessageManager.error('Failed to assign employee');
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
    app = new EmployeeApp();
    app.init();
});