// RESOURCE MANAGEMENT (RM) employee.js - Updated with Profile Pictures
import { supabase } from "../../supabaseClient.js";

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
// MODAL MANAGER
// ============================================

class ModalManager {
    static show(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`Modal with id "${modalId}" not found`);
            return;
        }
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    static hide(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`Modal with id "${modalId}" not found`);
            return;
        }
        modal.classList.remove('active');
        document.body.style.overflow = '';
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

    static AUTO_DISMISS_DELAY = 5000;

    static show(message, type = 'info') {
        const container = document.getElementById('messageContainer');
        if (!container) {
            console.warn('Message container not found');
            return;
        }

        const messageBox = this.createMessageBox(message, type);
        container.appendChild(messageBox);

        setTimeout(() => {
            messageBox.classList.add('fade-out');
            setTimeout(() => messageBox.remove(), 300);
        }, this.AUTO_DISMISS_DELAY);
    }

    static createMessageBox(message, type) {
        const messageBox = document.createElement('div');
        messageBox.className = `message-box ${type}`;

        const icon = document.createElement('i');
        icon.className = `fas ${this.ICON_MAP[type]}`;

        const text = document.createElement('span');
        text.textContent = message;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'message-close';
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.setAttribute('aria-label', 'Close message');
        closeBtn.addEventListener('click', () => {
            messageBox.classList.add('fade-out');
            setTimeout(() => messageBox.remove(), 300);
        });

        messageBox.appendChild(icon);
        messageBox.appendChild(text);
        messageBox.appendChild(closeBtn);

        return messageBox;
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
// DATA SERVICE - WITH PROFILE PICTURES
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
        this.projects = [];
        this.employees = [];
    }

    async getAllProjects() {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select(`
                    id,
                    name,
                    status,
                    end_date,
                    created_by,
                    users:created_by (id, name),
                    project_requirements (quantity_needed),
                    resource_requests (status)
                `)
                .eq('resource_requests.status', 'approved');
    
            if (error) throw error;
    
            const approvedProjects = data.filter(proj =>
                (proj.resource_requests || []).some(req => req.status === 'approved')
            );
    
            return approvedProjects.map(proj => this.transformProject(proj));
        } catch (error) {
            console.error('Error fetching projects:', error);
            throw new Error('Failed to load projects. Please try again.');
        }
    }

    async getProjectById(id) {
        try {
            const rawId = this.extractRawId(id, 'PROJ');

            const { data, error } = await supabase
                .from('projects')
                .select(`
                    id,
                    name,
                    status,
                    end_date,
                    users:created_by (name)
                `)
                .eq('id', rawId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching project:', error);
            throw new Error('Failed to load project details. Please try again.');
        }
    }

    async getAllEmployees() {
        try {
            console.log('[DATA SERVICE] Fetching all employees with profile pictures...');
            
            // Get user details with profile pictures
            const { data: userDetails, error: detailsError } = await supabase
                .from('user_details')
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
                `);

            if (detailsError) throw detailsError;

            console.log('[DATA SERVICE] User details fetched:', userDetails?.length || 0);

            // Filter out resource managers
            const filteredEmployees = userDetails.filter(emp => {
                const role = emp.users?.role || '';
                return role !== 'resource_manager';
            });

            // Get all project assignments to calculate assigned hours
            const { data: assignments, error: assignError } = await supabase
                .from('project_assignments')
                .select('user_id, assigned_hours')
                .eq('status', 'assigned');

            if (assignError) throw assignError;

            // Calculate total assigned hours per user
            const userAssignedHours = {};
            assignments?.forEach(assignment => {
                if (!userAssignedHours[assignment.user_id]) {
                    userAssignedHours[assignment.user_id] = 0;
                }
                userAssignedHours[assignment.user_id] += parseInt(assignment.assigned_hours || 0);
            });

            const employees = filteredEmployees.map(emp => this.transformEmployee(emp, userAssignedHours[emp.user_id] || 0));
            
            console.log('[DATA SERVICE] Employees transformed:', employees.length);
            return employees;
        } catch (error) {
            console.error('Error fetching employees:', error);
            throw new Error('Failed to load employees. Please try again.');
        }
    }

    async getEmployeeById(id) {
        try {
            const { data, error } = await supabase
                .from('user_details')
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
                .single();

            if (error) throw error;

            const userRole = data.users?.role || 'employee';
            let projectNames = [];
            let totalAssignedHours = 0;

            // For Project Managers: Get projects they created
            if (userRole === 'project_manager') {
                const { data: createdProjects, error: projectError } = await supabase
                    .from('projects')
                    .select('name')
                    .eq('created_by', data.user_id)
                    .in('status', ['pending', 'ongoing']);

                if (projectError) {
                    console.warn('Error fetching created projects:', projectError);
                }

                projectNames = createdProjects?.map(p => p.name) || [];
            }

            // Get assigned hours and projects from project_assignments
            const { data: assignments, error: assignError } = await supabase
                .from('project_assignments')
                .select('assigned_hours, project:projects (name)')
                .eq('user_id', data.user_id)
                .eq('status', 'assigned');

            if (assignError) {
                console.warn('Error fetching assignments:', assignError);
            }

            totalAssignedHours = assignments?.reduce((sum, a) => sum + parseInt(a.assigned_hours || 0), 0) || 0;
            
            // Add assigned projects to project names
            const assignedProjectNames = assignments?.map(a => a.project?.name).filter(Boolean) || [];
            projectNames = [...new Set([...projectNames, ...assignedProjectNames])];

            return {
                ...this.transformEmployee(data, totalAssignedHours),
                projects: projectNames
            };
        } catch (error) {
            console.error('Error fetching employee:', error);
            throw new Error('Failed to load employee details. Please try again.');
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
            return { success: true };
        } catch (error) {
            console.error('Error assigning employee:', error);
            throw new Error('Failed to assign employee. Please try again.');
        }
    }

    transformProject(proj) {
        const teamSize = (proj.project_requirements || []).reduce(
            (sum, r) => sum + (r.quantity_needed || 0),
            0
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
        const totalAvailableHours = emp.total_available_hours || 40;
        
        // Check if profile picture exists
        const profilePic = emp.profile_pic;
        const hasValidProfilePic = profilePic && 
                                  profilePic.trim() !== '' && 
                                  profilePic !== 'null' && 
                                  profilePic !== 'undefined';
        
        // Use profile picture from database or fallback to UI Avatars
        const avatar = hasValidProfilePic
            ? profilePic
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random&color=fff`;
        
        console.log(`[DATA SERVICE] Employee: ${userName}, Has Profile Pic: ${hasValidProfilePic}, Avatar: ${avatar}`);
        
        // Always use 40 hours as the base for calculation
        const baseHours = 40;
        let availableHours = 0;
        let availability = 'full';
        
        if (totalAvailableHours === 0) {
            availableHours = 0;
            availability = 'full';
        } else {
            availableHours = Math.max(0, baseHours - assignedHours);
    
            if (assignedHours >= 40) {
                availability = 'full';
            } else if (assignedHours >= 21) {
                availability = 'partial';
            } else {
                availability = 'available';
            }
        }
        
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
            avatar: avatar // ✅ Real profile picture or fallback
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
        if (!grid) {
            console.warn('Employee grid container not found');
            return;
        }

        if (employees.length === 0) {
            grid.innerHTML = `
                <div style="text-align: center; color: #6C757D; padding: 40px; grid-column: 1 / -1;">
                    <i class="fas fa-users" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p>No employees found</p>
                </div>
            `;
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

        card.appendChild(this.createEmployeeHeader(emp));
        card.appendChild(this.createAvailabilitySection(emp));
        card.appendChild(this.createEmployeeSkills(emp));
        card.appendChild(this.createEmployeeActions(emp));

        return card;
    }

    createEmployeeHeader(emp) {
        const header = document.createElement('div');
        header.className = 'employee-header';

        const avatar = document.createElement('img');
        avatar.src = emp.avatar;
        avatar.alt = `${emp.name}'s avatar`;
        avatar.className = 'employee-avatar';
        avatar.style.objectFit = 'cover'; // Ensure proper image display
        
        // Add error handler for broken images
        avatar.onerror = function() {
            this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random&color=fff`;
        };

        const info = document.createElement('div');
        info.className = 'employee-info';

        const name = document.createElement('h3');
        name.textContent = emp.name;

        const role = document.createElement('div');
        role.className = 'employee-role';
        role.textContent = emp.role;

        const statusBadge = document.createElement('span');
        statusBadge.className = `status-badge ${emp.availability}`;
        statusBadge.textContent = DataService.AVAILABILITY_MAP[emp.availability] || emp.availability;

        info.appendChild(name);
        info.appendChild(role);
        info.appendChild(statusBadge);

        header.appendChild(avatar);
        header.appendChild(info);

        return header;
    }

    createAvailabilitySection(emp) {
        const section = document.createElement('div');
        section.className = 'availability-section';
        section.style.cssText = `
            padding: 12px 16px;
            background: #F8F9FA;
            border-radius: 8px;
            margin-bottom: 8px;
        `;

        const title = document.createElement('div');
        title.style.cssText = `
            font-size: 11px;
            font-weight: 600;
            color: #6C757D;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        `;
        title.textContent = 'Availability';

        const hoursDisplay = document.createElement('div');
        hoursDisplay.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
        `;

        const availableHours = document.createElement('div');
        availableHours.style.cssText = `
            font-size: 24px;
            font-weight: 700;
            color: ${this.getAvailabilityColor(emp.availability)};
        `;
        availableHours.textContent = `${emp.availableHours}h`;

        const totalHours = document.createElement('div');
        totalHours.style.cssText = `
            font-size: 12px;
            color: #6C757D;
        `;
        totalHours.textContent = `of 40h available`;

        const progressBar = document.createElement('div');
        progressBar.style.cssText = `
            width: 100%;
            height: 6px;
            background: #E9ECEF;
            border-radius: 3px;
            margin-top: 8px;
            overflow: hidden;
        `;

        const progressFill = document.createElement('div');
        const percentage = (emp.assignedHours / 40) * 100;
        progressFill.style.cssText = `
            height: 100%;
            width: ${Math.min(percentage, 100)}%;
            background: ${this.getAvailabilityColor(emp.availability)};
            border-radius: 3px;
            transition: width 0.3s ease;
        `;

        progressBar.appendChild(progressFill);

        hoursDisplay.appendChild(availableHours);
        hoursDisplay.appendChild(totalHours);

        section.appendChild(title);
        section.appendChild(hoursDisplay);
        section.appendChild(progressBar);

        return section;
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

    createEmployeeSkills(emp) {
        const skillsSection = document.createElement('div');
        skillsSection.className = 'employee-skills';

        const skillsTitle = document.createElement('h4');
        skillsTitle.textContent = 'Skills';

        const skillsList = document.createElement('div');
        skillsList.className = 'skills-list';

        if (emp.skills.length === 0) {
            skillsList.innerHTML = '<span style="color: #999; font-size: 14px;">No skills listed</span>';
        } else {
            emp.skills.forEach(skill => {
                const skillTag = document.createElement('span');
                skillTag.className = 'skill-tag';
                skillTag.textContent = skill;
                skillsList.appendChild(skillTag);
            });
        }

        skillsSection.appendChild(skillsTitle);
        skillsSection.appendChild(skillsList);

        return skillsSection;
    }

    createEmployeeActions(emp) {
        const actions = document.createElement('div');
        actions.className = 'employee-actions';

        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn-primary';
        viewBtn.innerHTML = '<i class="fas fa-eye"></i> View Profile';
        viewBtn.onclick = () => window.app.viewEmployee(emp.id);

        const assignBtn = document.createElement('button');
        assignBtn.className = 'btn-secondary';
        assignBtn.innerHTML = '<i class="fas fa-plus"></i> Assign';
        assignBtn.onclick = () => window.app.assignEmployee(emp.id);

        actions.appendChild(viewBtn);
        actions.appendChild(assignBtn);

        return actions;
    }

    populateSkillsDropdown(dropdown, skills) {
        if (!dropdown) {
            console.warn('Skills dropdown not found');
            return;
        }

        dropdown.innerHTML = '<option value="">All Skills</option>';

        skills.forEach(skill => {
            const option = document.createElement('option');
            option.value = skill;
            option.textContent = skill;
            dropdown.appendChild(option);
        });
    }

    populateProjectsDropdown(dropdown, projects) {
        if (!dropdown) {
            console.warn('Projects dropdown not found');
            return;
        }

        dropdown.innerHTML = '<option value="">-- Select a project --</option>';

        const activeProjects = projects.filter(p => 
            p.status === 'ongoing' || p.status === 'pending'
        );

        activeProjects.forEach(proj => {
            const option = document.createElement('option');
            option.value = proj.rawId;
            option.textContent = `${proj.name} (${proj.status})`;
            dropdown.appendChild(option);
        });
    }

    renderSkillsList(container, skills) {
        if (!container) {
            console.warn('Skills list container not found');
            return;
        }

        if (skills.length === 0) {
            container.innerHTML = '<span style="color: #999;">No skills listed</span>';
            return;
        }

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
            avatar.onerror = function() {
                this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.name)}&background=random&color=fff`;
            };
        }

        const skillsContainer = document.getElementById('viewEmpSkills');
        this.renderSkillsList(skillsContainer, employee.skills);
    }

    populateAssignmentModal(employee) {
        const avatar = document.getElementById('assignEmpAvatar');
        const name = document.getElementById('assignEmpName');
        const role = document.getElementById('assignEmpRole');

        if (avatar) {
            avatar.src = employee.avatar;
            avatar.style.objectFit = 'cover';
            avatar.onerror = function() {
                this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.name)}&background=random&color=fff`;
            };
        }
        if (name) name.textContent = employee.name;
        if (role) role.textContent = employee.role;

        const today = new Date().toISOString().split('T')[0];
        const startDateInput = document.getElementById('assignStartDate');
        if (startDateInput) startDateInput.value = today;

        const form = document.getElementById('assignEmployeeForm');
        if (form) {
            form.reset();
            if (startDateInput) startDateInput.value = today;
        }
    }
}

// ============================================
// EMPLOYEE APP
// ============================================

class EmployeeApp {
    static MIN_HOURS = 1;
    static MAX_HOURS = 40;

    constructor() {
        this.dataService = new DataService();
        this.uiManager = new UIManager(this.dataService);
        this.debouncedSearch = debounce(() => this.filterEmployees(), 300);
        this.currentEmployeeId = null;
        this.allEmployees = [];
    }

    async init() {
        try {
            this.setupEventListeners();
            await this.loadEmployees();
            await this.loadSkillsFilter();
            await updateUserNameDisplayEnhanced();
            await this.loadProjectsForAssignment();
        } catch (error) {
            console.error('Initialization error:', error);
            MessageManager.error('Failed to initialize application');
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
            logoutBtn.addEventListener('click', () => this.openLogoutModal());
        }

        const cancelLogoutBtn = document.getElementById('cancelLogout');
        const confirmLogoutBtn = document.getElementById('confirmLogout');
        if (cancelLogoutBtn) {
            cancelLogoutBtn.addEventListener('click', () => ModalManager.hide('logoutModal'));
        }
        if (confirmLogoutBtn) {
            confirmLogoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }

    setupSearchAndFilters() {
        const empSearch = document.getElementById('employeeSearch');
        if (empSearch) {
            empSearch.addEventListener('input', () => this.debouncedSearch());
        }

        const skillFilter = document.getElementById('skillFilter');
        const availFilter = document.getElementById('availabilityFilter');

        if (skillFilter) {
            skillFilter.addEventListener('change', () => this.filterEmployees());
        }

        if (availFilter) {
            availFilter.addEventListener('change', () => this.filterEmployees());
        }
    }

    setupModalListeners() {
        ['closeViewModal', 'closeProfileBtn'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => ModalManager.hide('viewEmployeeModal'));
            }
        });

        ['closeAssignModal', 'cancelAssignBtn'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => ModalManager.hide('assignEmployeeModal'));
            }
        });

        const submitAssignBtn = document.getElementById('submitAssignBtn');
        if (submitAssignBtn) {
            submitAssignBtn.addEventListener('click', () => this.submitAssignment());
        }

        const cancelBusyBtn = document.getElementById('cancelBusyAssign');
        const proceedBusyBtn = document.getElementById('proceedBusyAssign');

        if (cancelBusyBtn) {
            cancelBusyBtn.addEventListener('click', () => {
                ModalManager.hide('busyEmployeeModal');
                ModalManager.show('assignEmployeeModal');
            });
        }

        if (proceedBusyBtn) {
            proceedBusyBtn.addEventListener('click', () => {
                ModalManager.hide('busyEmployeeModal');
                this.submitAssignment(true);
            });
        }

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
            console.error('Error loading skills filter:', error);
        }
    }

    async loadProjectsForAssignment() {
        try {
            const projects = await this.dataService.getAllProjects();
            const dropdown = document.getElementById('assignProjectSelect');
            this.uiManager.populateProjectsDropdown(dropdown, projects);
        } catch (error) {
            console.error('Error loading projects:', error);
            MessageManager.warning('Failed to load project list');
        }
    }

    filterEmployees() {
        try {
            const searchInput = document.getElementById('employeeSearch');
            const skillFilter = document.getElementById('skillFilter');
            const availFilter = document.getElementById('availabilityFilter');

            const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
            const selectedSkill = skillFilter ? skillFilter.value : '';
            const selectedAvail = availFilter ? availFilter.value : '';

            let filtered = [...this.allEmployees];

            if (query) {
                filtered = filtered.filter(emp =>
                    emp.name.toLowerCase().includes(query) ||
                    emp.role.toLowerCase().includes(query) ||
                    emp.department.toLowerCase().includes(query) ||
                    emp.skills.some(skill => skill.toLowerCase().includes(query))
                );
            }

            if (selectedSkill) {
                filtered = filtered.filter(emp =>
                    emp.skills.includes(selectedSkill)
                );
            }

            if (selectedAvail) {
                filtered = filtered.filter(emp => emp.availability === selectedAvail);
            }

            this.uiManager.renderEmployees(filtered);
        } catch (error) {
            console.error('Error filtering employees:', error);
            MessageManager.error('Error applying filters');
        }
    }

    async viewEmployee(id) {
        try {
            ModalManager.showLoading();
            const employee = await this.dataService.getEmployeeById(id);
            ModalManager.hideLoading();

            this.uiManager.populateEmployeeModal(employee);
            ModalManager.show('viewEmployeeModal');
        } catch (error) {
            ModalManager.hideLoading();
            MessageManager.error(error.message || 'Failed to load employee details');
            console.error(error);
        }
    }

    async assignEmployee(id) {
        try {
            ModalManager.showLoading();
            const employee = await this.dataService.getEmployeeById(id);
            ModalManager.hideLoading();

            this.currentEmployeeId = id;
            this.uiManager.populateAssignmentModal(employee);
            ModalManager.show('assignEmployeeModal');
        } catch (error) {
            ModalManager.hideLoading();
            MessageManager.error(error.message || 'Failed to load employee details');
            console.error(error);
        }
    }

    async submitAssignment(forceAssign = false) {
        try {
            const projectId = document.getElementById('assignProjectSelect')?.value;
            const hours = document.getElementById('assignHours')?.value;
            const startDate = document.getElementById('assignStartDate')?.value;

            // Validation
            if (!projectId) {
                MessageManager.warning('Please select a project');
                return;
            }

            const hoursNum = parseInt(hours);
            if (!hours || hoursNum < EmployeeApp.MIN_HOURS || hoursNum > EmployeeApp.MAX_HOURS) {
                MessageManager.warning(`Please enter valid hours (${EmployeeApp.MIN_HOURS}-${EmployeeApp.MAX_HOURS})`);
                return;
            }

            if (!startDate) {
                MessageManager.warning('Please select a start date');
                return;
            }

            const employee = await this.dataService.getEmployeeById(this.currentEmployeeId);

            // Check if employee is overloaded (unless forcing assignment)
            if (!forceAssign && (employee.availability === 'full' || employee.availability === 'over')) {
                this.showBusyWarning(employee);
                return;
            }

            // Proceed with assignment
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

            ModalManager.hideLoading();
            MessageManager.success(`${employee.name} has been assigned to the project successfully!`);

            // Reload employees to reflect changes
            await this.loadEmployees();
            this.currentEmployeeId = null;
        } catch (error) {
            throw error;
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
            localStorage.removeItem('loggedUser');
            window.location.href = '/login/HTML_Files/login.html';
        }, 1000);
    }
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Fix navigation highlight
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const employeeNavLink = document.querySelector('a[href*="employee.html"]');
    if (employeeNavLink) {
        employeeNavLink.classList.add('active');
    }

    window.app = new EmployeeApp();
    window.app.init();
});