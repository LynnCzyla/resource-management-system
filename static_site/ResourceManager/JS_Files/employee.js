// RESOURCE MANAGEMENT (RM) employee.js - OPTIMIZED
import { supabase } from "/supabaseClient.js";

// ============================================
// CONFIGURATION & CONSTANTS
// ============================================
const CONFIG = {
    DEBOUNCE_DELAY: 300,
    STANDARD_HOURS: 40,
    MIN_ASSIGN_HOURS: 1,
    MAX_ASSIGN_HOURS: 40,
    AVATAR_BASE_URL: 'https://ui-avatars.com/api/',
    MESSAGE_TIMEOUT: 5000
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
const Utils = {
    debounce(func, delay = CONFIG.DEBOUNCE_DELAY) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    },

    parseUser() {
        try {
            return JSON.parse(localStorage.getItem('loggedUser') || '{}');
        } catch {
            return {};
        }
    },

    formatDate(date = new Date()) {
        return date.toISOString().split('T')[0];
    },

    isValidProfilePic(pic) {
        return pic && pic.trim() && pic !== 'null' && pic !== 'undefined';
    },

    generateAvatar(name, background = 'random', color = 'fff') {
        return `${CONFIG.AVATAR_BASE_URL}?name=${encodeURIComponent(name)}&background=${background}&color=${color}`;
    },

    getInitials(name) {
        return name.split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .join('')
            .substring(0, 2);
    }
};

// ============================================
// USER DISPLAY MANAGER
// ============================================
const UserDisplay = {
    async update() {
        const userNameElement = document.getElementById('userName');
        const userAvatarElement = document.querySelector('.user-avatar');
        
        if (!userNameElement) {
            console.warn('[USER] User name element not found');
            return;
        }

        try {
            const loggedUser = Utils.parseUser();
            let displayName = 'Project Manager';

            if (loggedUser.name) {
                displayName = loggedUser.name;
                userNameElement.textContent = displayName;
            } else if (loggedUser.email) {
                displayName = await this.fetchUserName(loggedUser.email) || 
                             loggedUser.email.split('@')[0];
                userNameElement.textContent = displayName;
            }

            userNameElement.textContent = displayName;
            
            if (userAvatarElement) {
                this.updateAvatar(userAvatarElement, displayName);
            }

        } catch (error) {
            console.error('[USER] Error:', error);
            userNameElement.textContent = 'Project Manager';
        }
    },

    async fetchUserName(email) {
        try {
            const { data: userData, error } = await supabase
                .from('users')
                .select('name')
                .eq('email', email)
                .single();

            if (!error && userData?.name) {
                const loggedUser = Utils.parseUser();
                loggedUser.name = userData.name;
                localStorage.setItem('loggedUser', JSON.stringify(loggedUser));
                return userData.name;
            }
        } catch (error) {
            console.error('[USER] Fetch error:', error);
        }
        return null;
    },

    updateAvatar(element, name) {
        element.src = Utils.generateAvatar(name, '000', 'fff');
        element.alt = Utils.getInitials(name);
        element.onerror = () => {
            element.src = Utils.generateAvatar(name, '000', 'fff');
        };
    }
};

// ============================================
// MODAL MANAGER
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
// MESSAGE MANAGER
// ============================================
class MessageManager {
    static ICON_MAP = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    static show(message, type = 'info') {
        const container = this.getOrCreateContainer();
        const messageBox = this.createMessageBox(message, type);
        container.appendChild(messageBox);

        setTimeout(() => messageBox.remove(), CONFIG.MESSAGE_TIMEOUT);
    }

    static getOrCreateContainer() {
        let container = document.getElementById('messageContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'messageContainer';
            document.body.appendChild(container);
        }
        return container;
    }

    static createMessageBox(message, type) {
        const messageBox = document.createElement('div');
        messageBox.className = `message-box ${type}`;

        messageBox.innerHTML = `
            <i class="fas ${this.ICON_MAP[type]}"></i>
            <span>${message}</span>
            <button class="message-close" aria-label="Close message">
                <i class="fas fa-times"></i>
            </button>
        `;

        messageBox.querySelector('.message-close').addEventListener('click', () => messageBox.remove());
        return messageBox;
    }

    static success(message) { this.show(message, 'success'); }
    static error(message) { this.show(message, 'error'); }
    static warning(message) { this.show(message, 'warning'); }
    static info(message) { this.show(message, 'info'); }
}

// ============================================
// DATA SERVICE - OPTIMIZED
// ============================================
class DataService {
    static EXPERIENCE_LEVEL_MAP = {
        'beginner': 'Beginner',
        'intermediate': 'Intermediate',
        'advanced': 'Advanced'
    };

    static AVAILABILITY_MAP = {
        'available': 'Available',
        'partial': 'Partially Available',
        'full': 'Busy',
        'over': 'Overloaded'
    };

    constructor() {
        this.cache = new Map();
    }

    async getAllProjects() {
        const cacheKey = 'allProjects';
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const { data, error } = await supabase
                .from('projects')
                .select(`
                    id,
                    name,
                    status,
                    end_date,
                    users:created_by (name),
                    project_requirements (quantity_needed),
                    resource_requests (status)
                `)
                .eq('resource_requests.status', 'approved');

            if (error) throw error;

            const approvedProjects = (data || []).filter(proj =>
                (proj.resource_requests || []).some(req => req.status === 'approved')
            );

            const transformed = approvedProjects.map(proj => this.transformProject(proj));
            this.cache.set(cacheKey, transformed);
            return transformed;

        } catch (error) {
            console.error('[DATA] Error fetching projects:', error);
            throw new Error('Failed to load projects. Please try again.');
        }
    }

    async getProjectById(id) {
        const cacheKey = `project_${id}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const rawId = this.extractRawId(id, 'PROJ');
            const { data, error } = await supabase
                .from('projects')
                .select('id, name, status, end_date, users:created_by (name)')
                .eq('id', rawId)
                .single();

            if (error) throw error;

            this.cache.set(cacheKey, data);
            return data;
        } catch (error) {
            console.error('[DATA] Error fetching project:', error);
            throw new Error('Failed to load project details.');
        }
    }

    async getAllEmployees() {
        const cacheKey = 'allEmployees';
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            console.log('[DATA] Fetching employees...');
            
            const [userDetailsResult, assignmentsResult] = await Promise.all([
                supabase.from('user_details')
                    .select(`
                        employee_id,
                        job_title,
                        department,
                        status,
                        experience_level,
                        skills,
                        user_id,
                        total_available_hours,
                        profile_pic,
                        users:user_id (id, name, email, role)
                    `),
                supabase.from('project_assignments')
                    .select('user_id, assigned_hours')
                    .eq('status', 'assigned')
            ]);

            if (userDetailsResult.error) throw userDetailsResult.error;

            const userDetails = userDetailsResult.data || [];
            const assignments = assignmentsResult.data || [];

            console.log('[DATA] User details fetched:', userDetails.length);

            // Calculate assigned hours
            const userAssignedHours = {};
            assignments.forEach(assignment => {
                userAssignedHours[assignment.user_id] = 
                    (userAssignedHours[assignment.user_id] || 0) + 
                    parseInt(assignment.assigned_hours || 0);
            });

            // Filter out resource managers
            const employees = userDetails
                .filter(emp => emp.users?.role !== 'resource_manager')
                .map(emp => this.transformEmployee(emp, userAssignedHours[emp.user_id] || 0));

            console.log('[DATA] Employees transformed:', employees.length);
            this.cache.set(cacheKey, employees);
            return employees;

        } catch (error) {
            console.error('[DATA] Error fetching employees:', error);
            throw new Error('Failed to load employees. Please try again.');
        }
    }

    async getEmployeeById(id) {
        const cacheKey = `employee_${id}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const [employeeResult, assignmentsResult] = await Promise.all([
                supabase.from('user_details')
                    .select(`
                        employee_id,
                        job_title,
                        department,
                        status,
                        experience_level,
                        skills,
                        user_id,
                        total_available_hours,
                        profile_pic,
                        users:user_id (id, name, email, role)
                    `)
                    .eq('employee_id', id)
                    .single(),
                supabase.from('project_assignments')
                    .select('assigned_hours, project:projects (name)')
                    .eq('user_id', id)
                    .eq('status', 'assigned')
            ]);

            if (employeeResult.error) throw employeeResult.error;

            const employee = employeeResult.data;
            const assignments = assignmentsResult.data || [];

            // Get projects for project managers
            let projectNames = [];
            if (employee.users?.role === 'project_manager') {
                const { data: createdProjects } = await supabase
                    .from('projects')
                    .select('name')
                    .eq('created_by', employee.user_id)
                    .in('status', ['pending', 'ongoing']);
                projectNames = createdProjects?.map(p => p.name) || [];
            }

            // Calculate assigned hours
            const totalAssignedHours = assignments.reduce((sum, a) => 
                sum + parseInt(a.assigned_hours || 0), 0);
            
            // Add assigned projects
            const assignedProjectNames = assignments.map(a => a.project?.name).filter(Boolean);
            projectNames = [...new Set([...projectNames, ...assignedProjectNames])];

            const transformed = {
                ...this.transformEmployee(employee, totalAssignedHours),
                projects: projectNames
            };

            this.cache.set(cacheKey, transformed);
            return transformed;

        } catch (error) {
            console.error('[DATA] Error fetching employee:', error);
            throw new Error('Failed to load employee details.');
        }
    }

    async assignEmployeeToProject(employeeUserId, projectId, role) {
        try {
            const { error } = await supabase
                .from('project_assignments')
                .insert([{
                    project_id: parseInt(projectId),
                    user_id: employeeUserId,
                    role_in_project: role,
                    status: 'assigned'
                }]);

            if (error) throw error;
            
            // Clear cache to reflect changes
            this.cache.clear();
            return { success: true };
        } catch (error) {
            console.error('[DATA] Error assigning employee:', error);
            throw new Error('Failed to assign employee. Please try again.');
        }
    }

    transformProject(proj) {
        const teamSize = (proj.project_requirements || []).reduce(
            (sum, r) => sum + (r.quantity_needed || 0), 0
        );

        return {
            id: `PROJ${String(proj.id).padStart(3, '0')}`,
            rawId: proj.id,
            name: proj.name,
            status: proj.status,
            teamSize,
            progress: 0,
            deadline: proj.end_date,
            manager: proj.users?.name || 'N/A',
            skills: []
        };
    }

    transformEmployee(emp, assignedHours = 0) {
        const userName = emp.users?.name || 'Unnamed';
        const totalAvailableHours = emp.total_available_hours || CONFIG.STANDARD_HOURS;
        
        // Get avatar URL
        const profilePic = emp.profile_pic;
        const hasValidProfilePic = Utils.isValidProfilePic(profilePic);
        const avatar = hasValidProfilePic
            ? profilePic
            : Utils.generateAvatar(userName);
        
        // Calculate availability
        const baseHours = CONFIG.STANDARD_HOURS;
        let availability = 'full';
        
        if (assignedHours >= 40) {
            availability = 'full';
        } else if (assignedHours >= 21) {
            availability = 'partial';
        } else {
            availability = 'available';
        }
        
        const availableHours = Math.max(0, baseHours - assignedHours);
        
        return {
            id: emp.employee_id,
            userId: emp.user_id,
            name: userName,
            role: emp.job_title || 'No role specified',
            department: emp.department || 'N/A',
            skills: emp.skills || [],
            availability: availability,
            workloadHours: assignedHours,
            assignedHours: assignedHours,
            totalAvailableHours: baseHours,
            availableHours: availableHours,
            projects: [],
            experience: this.formatExperienceLevel(emp.experience_level),
            avatar: avatar
        };
    }

    extractRawId(id, prefix) {
        return typeof id === 'string' && id.startsWith(prefix)
            ? parseInt(id.replace(prefix, ''))
            : id;
    }

    formatExperienceLevel(level) {
        if (!level) return 'N/A';
        const levelLower = level.toLowerCase();
        return DataService.EXPERIENCE_LEVEL_MAP[levelLower] || level;
    }

    getUniqueSkills(employees) {
        const skillsSet = new Set();
        employees.forEach(emp => {
            (emp.skills || []).forEach(skill => skillsSet.add(skill));
        });
        return Array.from(skillsSet).sort();
    }
}

// ============================================
// UI MANAGER - OPTIMIZED
// ============================================
class UIManager {
    constructor(dataService) {
        this.dataService = dataService;
        this.templates = new Map();
        this.initTemplates();
    }

    initTemplates() {
        // Employee card template
        this.templates.set('employeeCard', this.createEmployeeCardTemplate());
    }

    createEmployeeCardTemplate() {
        const template = document.createElement('template');
        template.innerHTML = `
            <div class="employee-card" data-emp-id="">
                <div class="employee-header">
                    <img class="employee-avatar" src="" alt="">
                    <div class="employee-info">
                        <h3></h3>
                        <div class="employee-role"></div>
                        <span class="status-badge"></span>
                    </div>
                </div>
                <div class="availability-section"></div>
                <div class="employee-skills">
                    <h4>Skills</h4>
                    <div class="skills-list"></div>
                </div>
                <div class="employee-actions">
                    <button class="btn-primary"><i class="fas fa-eye"></i> View Profile</button>
                    <button class="btn-secondary"><i class="fas fa-plus"></i> Assign</button>
                </div>
            </div>
        `;
        return template;
    }

    renderEmployees(employees) {
        const grid = document.getElementById('employeeGrid');
        if (!grid) return;

        if (employees.length === 0) {
            grid.innerHTML = this.getNoEmployeesHTML();
            return;
        }

        const fragment = document.createDocumentFragment();
        employees.forEach(emp => fragment.appendChild(this.createEmployeeCard(emp)));
        
        grid.innerHTML = '';
        grid.appendChild(fragment);
    }

    createEmployeeCard(emp) {
        const template = this.templates.get('employeeCard');
        const card = template.content.cloneNode(true).querySelector('.employee-card');
        
        card.dataset.empId = emp.id;
        
        // Set avatar
        const avatar = card.querySelector('.employee-avatar');
        avatar.src = emp.avatar;
        avatar.alt = `${emp.name}'s avatar`;
        avatar.style.objectFit = 'cover';
        avatar.onerror = () => {
            avatar.src = Utils.generateAvatar(emp.name);
        };
    
        // Set text content
        card.querySelector('h3').textContent = emp.name;
        card.querySelector('.employee-role').textContent = emp.role;
        
        // Set status badge
        const statusBadge = card.querySelector('.status-badge');
        statusBadge.textContent = DataService.AVAILABILITY_MAP[emp.availability] || emp.availability;
        statusBadge.className = `status-badge ${emp.availability}`;
    
        // Update availability section
        this.updateAvailabilitySection(card, emp);
        
        // Update skills
        this.updateSkillsSection(card, emp);
        
        // Set button event listeners - FIXED VERSION
        const buttons = card.querySelectorAll('button');
        buttons[0].addEventListener('click', () => {
            if (window.app && window.app.viewEmployee) {
                window.app.viewEmployee(emp.id);
            } else {
                console.error('App not initialized properly');
                MessageManager.error('Application not ready. Please refresh the page.');
            }
        });
        
        buttons[1].addEventListener('click', () => {
            if (window.app && window.app.assignEmployee) {
                window.app.assignEmployee(emp.id);
            } else {
                console.error('App not initialized properly');
                MessageManager.error('Application not ready. Please refresh the page.');
            }
        });
    
        return card;
    }

    updateAvailabilitySection(card, emp) {
        const section = card.querySelector('.availability-section');
        const color = this.getAvailabilityColor(emp.availability);
        const percentage = (emp.assignedHours / CONFIG.STANDARD_HOURS) * 100;

        section.innerHTML = `
            <div style="padding: 12px 16px; background: #F8F9FA; border-radius: 8px; margin-bottom: 8px;">
                <div style="font-size: 11px; font-weight: 600; color: #6C757D; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                    Availability
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
                    <div style="font-size: 24px; font-weight: 700; color: ${color};">${emp.availableHours}h</div>
                    <div style="font-size: 12px; color: #6C757D;">of 40h available</div>
                </div>
                <div style="width: 100%; height: 6px; background: #E9ECEF; border-radius: 3px; margin-top: 8px; overflow: hidden;">
                    <div style="height: 100%; width: ${Math.min(percentage, 100)}%; background: ${color}; border-radius: 3px; transition: width 0.3s ease;"></div>
                </div>
            </div>
        `;
    }

    updateSkillsSection(card, emp) {
        const skillsList = card.querySelector('.skills-list');
        if (emp.skills.length === 0) {
            skillsList.innerHTML = '<span style="color: #999; font-size: 14px;">No skills listed</span>';
        } else {
            skillsList.innerHTML = emp.skills.map(skill => 
                `<span class="skill-tag">${skill}</span>`
            ).join('');
        }
    }

    getAvailabilityColor(availability) {
        const colors = {
            'available': '#2E7D32',
            'partial': '#E65100',
            'full': '#1565C0',
            'over': '#C62828'
        };
        return colors[availability] || '#6C757D';
    }

    getNoEmployeesHTML() {
        return `
            <div style="text-align: center; color: #6C757D; padding: 40px; grid-column: 1 / -1;">
                <i class="fas fa-users" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                <p>No employees found</p>
            </div>
        `;
    }

    populateSkillsDropdown(dropdown, skills) {
        if (!dropdown) return;
        
        dropdown.innerHTML = '<option value="">All Skills</option>' + 
            skills.map(skill => `<option value="${skill}">${skill}</option>`).join('');
    }

    populateProjectsDropdown(dropdown, projects) {
        if (!dropdown) return;

        const activeProjects = projects.filter(p => 
            p.status === 'ongoing' || p.status === 'pending'
        );

        dropdown.innerHTML = '<option value="">-- Select a project --</option>' + 
            activeProjects.map(proj => 
                `<option value="${proj.rawId}">${proj.name} (${proj.status})</option>`
            ).join('');
    }

    populateEmployeeModal(employee) {
        const fields = {
            viewEmpName: employee.name,
            viewEmpId: employee.id,
            viewEmpRole: employee.role,
            viewEmpDepartment: employee.department,
            viewEmpExperience: employee.experience,
            viewEmpWorkload: `${employee.assignedHours}h / 40h (${employee.availableHours}h available)`,
            viewEmpProjects: employee.projects.length > 0 ? employee.projects.join(', ') : 'None'
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });

        const avatar = document.getElementById('viewEmpAvatar');
        if (avatar) {
            avatar.src = employee.avatar;
            avatar.style.objectFit = 'cover';
            avatar.onerror = () => {
                avatar.src = Utils.generateAvatar(employee.name);
            };
        }

        this.updateSkillsInModal(employee.skills);
    }

    updateSkillsInModal(skills) {
        const container = document.getElementById('viewEmpSkills');
        if (!container) return;

        if (skills.length === 0) {
            container.innerHTML = '<span style="color: #999;">No skills listed</span>';
        } else {
            container.innerHTML = skills.map(skill => 
                `<span class="skill-badge">${skill}</span>`
            ).join('');
        }
    }

    populateAssignmentModal(employee) {
        const avatar = document.getElementById('assignEmpAvatar');
        const name = document.getElementById('assignEmpName');
        const role = document.getElementById('assignEmpRole');

        if (avatar) {
            avatar.src = employee.avatar;
            avatar.style.objectFit = 'cover';
            avatar.onerror = () => {
                avatar.src = Utils.generateAvatar(employee.name);
            };
        }
        if (name) name.textContent = employee.name;
        if (role) role.textContent = employee.role;

        const form = document.getElementById('assignEmployeeForm');
        if (form) {
            form.reset();
            const startDateInput = document.getElementById('assignStartDate');
            if (startDateInput) startDateInput.value = Utils.formatDate();
        }
    }
}

// ============================================
// EMPLOYEE APP - OPTIMIZED
// ============================================
class EmployeeApp {
    constructor() {
        this.dataService = new DataService();
        this.uiManager = new UIManager(this.dataService);
        this.currentEmployeeId = null;
        this.allEmployees = [];
        this.filters = {
            search: '',
            skill: '',
            availability: ''
        };
    }

    async init() {
        try {
            await Promise.all([
                this.loadEmployees(),
                this.loadInitialData()
            ]);
            
            this.setupEventListeners();
            this.setupNavigation();
        } catch (error) {
            console.error('[APP] Initialization error:', error);
            MessageManager.error('Failed to initialize application');
        }
    }

    async loadInitialData() {
        await Promise.all([
            UserDisplay.update(),
            this.loadSkillsFilter(),
            this.loadProjectsForAssignment()
        ]);
    }

    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const employeeNavLink = document.querySelector('a[href*="employee.html"]');
        if (employeeNavLink) {
            employeeNavLink.classList.add('active');
        }
    }

    setupEventListeners() {
        this.setupLogoutListeners();
        this.setupSearchAndFilters();
        this.setupModalListeners();
    }

    setupLogoutListeners() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => ModalManager.show('logoutModal'));
        }

        document.getElementById('cancelLogout')?.addEventListener('click', 
            () => ModalManager.hide('logoutModal'));
        document.getElementById('confirmLogout')?.addEventListener('click', 
            () => this.handleLogout());
    }

    setupSearchAndFilters() {
        const empSearch = document.getElementById('employeeSearch');
        const skillFilter = document.getElementById('skillFilter');
        const availFilter = document.getElementById('availabilityFilter');

        const debouncedFilter = Utils.debounce(() => this.filterEmployees());
        
        if (empSearch) empSearch.addEventListener('input', debouncedFilter);
        if (skillFilter) skillFilter.addEventListener('change', debouncedFilter);
        if (availFilter) availFilter.addEventListener('change', debouncedFilter);
    }

    setupModalListeners() {
        // View modal
        document.getElementById('closeViewModal')?.addEventListener('click', 
            () => ModalManager.hide('viewEmployeeModal'));
        document.getElementById('closeProfileBtn')?.addEventListener('click', 
            () => ModalManager.hide('viewEmployeeModal'));

        // Assign modal
        document.getElementById('closeAssignModal')?.addEventListener('click', 
            () => ModalManager.hide('assignEmployeeModal'));
        document.getElementById('cancelAssignBtn')?.addEventListener('click', 
            () => ModalManager.hide('assignEmployeeModal'));
        document.getElementById('submitAssignBtn')?.addEventListener('click', 
            () => this.submitAssignment());

        // Busy employee modal
        document.getElementById('cancelBusyAssign')?.addEventListener('click', () => {
            ModalManager.hide('busyEmployeeModal');
            ModalManager.show('assignEmployeeModal');
        });
        document.getElementById('proceedBusyAssign')?.addEventListener('click', () => {
            ModalManager.hide('busyEmployeeModal');
            this.submitAssignment(true);
        });

        // Modal overlay clicks
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
            ModalManager.showLoading();
            this.allEmployees = await this.dataService.getAllEmployees();
            this.uiManager.renderEmployees(this.allEmployees);
        } catch (error) {
            MessageManager.error(error.message || 'Failed to load employees');
            console.error(error);
        } finally {
            ModalManager.hideLoading();
        }
    }

    async loadSkillsFilter() {
        try {
            const skills = this.dataService.getUniqueSkills(this.allEmployees);
            const dropdown = document.getElementById('skillFilter');
            this.uiManager.populateSkillsDropdown(dropdown, skills);
        } catch (error) {
            console.error('[APP] Error loading skills filter:', error);
        }
    }

    async loadProjectsForAssignment() {
        try {
            const projects = await this.dataService.getAllProjects();
            const dropdown = document.getElementById('assignProjectSelect');
            this.uiManager.populateProjectsDropdown(dropdown, projects);
        } catch (error) {
            console.error('[APP] Error loading projects:', error);
            MessageManager.warning('Failed to load project list');
        }
    }

    filterEmployees() {
        try {
            const searchInput = document.getElementById('employeeSearch');
            const skillFilter = document.getElementById('skillFilter');
            const availFilter = document.getElementById('availabilityFilter');

            this.filters.search = searchInput?.value.toLowerCase().trim() || '';
            this.filters.skill = skillFilter?.value || '';
            this.filters.availability = availFilter?.value || '';

            const filtered = this.allEmployees.filter(emp => {
                const matchesSearch = !this.filters.search || 
                    emp.name.toLowerCase().includes(this.filters.search) ||
                    emp.role.toLowerCase().includes(this.filters.search) ||
                    emp.department.toLowerCase().includes(this.filters.search) ||
                    emp.skills.some(skill => skill.toLowerCase().includes(this.filters.search));

                const matchesSkill = !this.filters.skill || 
                    emp.skills.includes(this.filters.skill);

                const matchesAvail = !this.filters.availability || 
                    emp.availability === this.filters.availability;

                return matchesSearch && matchesSkill && matchesAvail;
            });

            this.uiManager.renderEmployees(filtered);
        } catch (error) {
            console.error('[APP] Error filtering employees:', error);
            MessageManager.error('Error applying filters');
        }
    }

    async viewEmployee(id) {
        try {
            ModalManager.showLoading();
            const employee = await this.dataService.getEmployeeById(id);
            this.uiManager.populateEmployeeModal(employee);
            ModalManager.show('viewEmployeeModal');
        } catch (error) {
            MessageManager.error(error.message || 'Failed to load employee details');
            console.error(error);
        } finally {
            ModalManager.hideLoading();
        }
    }

    async assignEmployee(id) {
        try {
            ModalManager.showLoading();
            const employee = await this.dataService.getEmployeeById(id);
            this.currentEmployeeId = id;
            this.uiManager.populateAssignmentModal(employee);
            ModalManager.show('assignEmployeeModal');
        } catch (error) {
            MessageManager.error(error.message || 'Failed to load employee details');
            console.error(error);
        } finally {
            ModalManager.hideLoading();
        }
    }

    async submitAssignment(forceAssign = false) {
        try {
            const projectId = document.getElementById('assignProjectSelect')?.value;
            const hours = document.getElementById('assignHours')?.value;
            const startDate = document.getElementById('assignStartDate')?.value;

            if (!projectId) {
                MessageManager.warning('Please select a project');
                return;
            }

            const hoursNum = parseInt(hours);
            if (!hours || hoursNum < CONFIG.MIN_ASSIGN_HOURS || hoursNum > CONFIG.MAX_ASSIGN_HOURS) {
                MessageManager.warning(`Please enter valid hours (${CONFIG.MIN_ASSIGN_HOURS}-${CONFIG.MAX_ASSIGN_HOURS})`);
                return;
            }

            if (!startDate) {
                MessageManager.warning('Please select a start date');
                return;
            }

            const employee = await this.dataService.getEmployeeById(this.currentEmployeeId);

            if (!forceAssign && (employee.availability === 'full' || employee.availability === 'over')) {
                this.showBusyWarning(employee);
                return;
            }

            await this.performAssignment(employee, projectId);
        } catch (error) {
            ModalManager.hideLoading();
            MessageManager.error(error.message || 'Failed to assign employee');
            console.error(error);
        }
    }

    showBusyWarning(employee) {
        const busyText = document.getElementById('busyEmployeeText');
        const availText = employee.availability === 'full' ? 'fully allocated' : 'overloaded';
        
        if (busyText) {
            busyText.textContent = `${employee.name} is currently ${availText} with ${employee.workloadHours} hours of work. Assigning them to another project may impact their performance. Do you want to proceed anyway?`;
        }

        ModalManager.hide('assignEmployeeModal');
        ModalManager.show('busyEmployeeModal');
    }

    async performAssignment(employee, projectId) {
        ModalManager.hide('assignEmployeeModal');
        ModalManager.showLoading();

        try {
            await this.dataService.assignEmployeeToProject(
                employee.userId,
                projectId,
                employee.role
            );

            MessageManager.success(`${employee.name} has been assigned to the project successfully!`);
            
            // Reload employees
            await this.loadEmployees();
            this.currentEmployeeId = null;
        } catch (error) {
            throw error;
        } finally {
            ModalManager.hideLoading();
        }
    }

    handleLogout() {
        ModalManager.hide('logoutModal');
        ModalManager.showLoading();

        setTimeout(() => {
            localStorage.removeItem('loggedUser');
            window.location.href = '/login/HTML_Files/login.html';
        }, 1000);
    }
}

// ============================================
// INITIALIZATION
// ============================================
let app;

document.addEventListener('DOMContentLoaded', () => {
    console.log('[INIT] Initializing Employee App...');
    app = new EmployeeApp();
    app.init();
});