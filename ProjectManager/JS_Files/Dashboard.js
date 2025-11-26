

// PROJECT MANAGER (PM) Dashboard.js 
import { supabase } from "../../supabaseClient.js";

// ============================================
// USER NAME DISPLAY UTILITY
// ============================================

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
// UTILITY FUNCTIONS
// ============================================

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatStatus(status) {
    const statusMap = {
        'active': 'Active',
        'ongoing': 'Ongoing',
        'planning': 'Planning',
        'completed': 'Completed',
        'on-hold': 'On Hold',
        'pending': 'Pending',
        'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
}

// ============================================
// PM DATA SERVICE - SUPABASE INTEGRATION
// ============================================

class PMDataService {
    constructor() {
        this.currentPMId = null;
        this.currentPMEmail = null;
    }

    async initialize() {
        const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || '{}');
        
        if (loggedUser.email) {
            this.currentPMEmail = loggedUser.email;
            
            const { data: userData, error } = await supabase
                .from('users')
                .select('id, name, email')
                .eq('email', this.currentPMEmail)
                .eq('role', 'project_manager')
                .single();

            if (error) {
                console.error('[PM DATA SERVICE] Error fetching PM user:', error);
                throw error;
            }

            this.currentPMId = userData.id;
            console.log('[PM DATA SERVICE] Initialized for PM:', userData);
        } else {
            throw new Error('No logged in user found');
        }
    }

    async getDashboardStats() {
        try {
            console.log('[PM DATA SERVICE] Fetching dashboard stats for PM:', this.currentPMId);

            const { data: projects, error: projError } = await supabase
                .from('projects')
                .select('id, status')
                .eq('created_by', this.currentPMId)
                .in('status', ['pending', 'ongoing', 'active']);

            if (projError) throw projError;

            const activeProjects = projects?.length || 0;
            const projectIds = projects?.map(p => p.id) || [];

            const { data: assignments, error: assignError } = await supabase
                .from('project_assignments')
                .select('user_id, assigned_hours')
                .in('project_id', projectIds)
                .eq('status', 'assigned');

            if (assignError) throw assignError;

            const uniqueTeamMembers = [...new Set(assignments?.map(a => a.user_id) || [])];
            const teamMembers = uniqueTeamMembers.length;

            const today = new Date();
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay() + 1);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 4);

            const { data: worklogs, error: worklogError } = await supabase
                .from('worklogs')
                .select('hours')
                .in('project_id', projectIds)
                .gte('log_date', startOfWeek.toISOString().split('T')[0])
                .lte('log_date', endOfWeek.toISOString().split('T')[0]);

            if (worklogError) throw worklogError;

            const totalHours = worklogs?.reduce((sum, log) => sum + parseFloat(log.hours || 0), 0) || 0;

            const totalAssignedHours = assignments?.reduce((sum, a) => sum + parseInt(a.assigned_hours || 0), 0) || 0;
            const maxPossibleHours = teamMembers * 40;
            const teamUtilization = maxPossibleHours > 0 ? Math.round((totalAssignedHours / maxPossibleHours) * 100) : 0;

            console.log('[PM DATA SERVICE] Stats:', { activeProjects, teamMembers, totalHours, teamUtilization });

            return {
                activeProjects,
                teamMembers,
                totalHours: Math.round(totalHours),
                teamUtilization
            };
        } catch (error) {
            console.error('[PM DATA SERVICE] Error fetching stats:', error);
            return {
                activeProjects: 0,
                teamMembers: 0,
                totalHours: 0,
                teamUtilization: 0
            };
        }
    }

    async getProjects() {
        try {
            console.log('[PM DATA SERVICE] Fetching projects for PM:', this.currentPMId);

            const { data: projects, error } = await supabase
                .from('projects')
                .select(`
                    id,
                    name,
                    description,
                    status,
                    priority,
                    start_date,
                    end_date,
                    duration_days
                `)
                .eq('created_by', this.currentPMId)
                .in('status', ['pending', 'ongoing', 'active'])
                .order('created_at', { ascending: false });

            if (error) throw error;

            console.log('[PM DATA SERVICE] Projects fetched:', projects?.length || 0);
            return projects || [];
        } catch (error) {
            console.error('[PM DATA SERVICE] Error fetching projects:', error);
            return [];
        }
    }

    async getWeeklyAllocation(weekStart) {
    try {
        console.log('[PM DATA SERVICE] Fetching weekly allocation for week:', weekStart);

        const startDate = new Date(weekStart);
        const dates = [];
        for (let i = 0; i < 5; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            dates.push(date.toISOString().split('T')[0]);
        }

        const teamMembers = await this.getTeamMembers();

        const { data: projects, error: projError } = await supabase
            .from('projects')
            .select('id')
            .eq('created_by', this.currentPMId)
            .in('status', ['pending', 'ongoing', 'active']);

        if (projError) throw projError;

        const projectIds = projects?.map(p => p.id) || [];

        const { data: worklogs, error: worklogError } = await supabase
            .from('worklogs')
            .select('user_id, log_date, hours')
            .in('project_id', projectIds)
            .in('log_date', dates);

        if (worklogError) throw worklogError;

        const allocation = teamMembers.map(member => {
            const memberLogs = worklogs?.filter(log => log.user_id === member.id) || [];
            
            const dailyHours = {
                mon: 0, tue: 0, wed: 0, thu: 0, fri: 0
            };

            memberLogs.forEach(log => {
                const logDate = new Date(log.log_date);
                const dayIndex = (logDate.getDay() + 6) % 7;
                const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri'];
                if (dayIndex < 5) {
                    dailyHours[dayKeys[dayIndex]] += parseFloat(log.hours || 0);
                }
            });

            return {
                employee: member.name,
                role: member.role,
                avatar: member.avatar, 
                ...dailyHours
            };
        });

        console.log('[PM DATA SERVICE] Weekly allocation fetched:', allocation.length);
        return allocation;
    } catch (error) {
        console.error('[PM DATA SERVICE] Error fetching weekly allocation:', error);
        return [];
    }
}

    async getTeamMembers() {
    try {
        console.log('[PM DATA SERVICE] Fetching team members for PM:', this.currentPMId);

        const { data: projects, error: projError } = await supabase
            .from('projects')
            .select('id')
            .eq('created_by', this.currentPMId)
            .in('status', ['pending', 'ongoing', 'active']);

        if (projError) throw projError;
        
        const projectIds = projects?.map(p => p.id) || [];

        const { data: assignments, error: assignError } = await supabase
            .from('project_assignments')
            .select(`
                user_id,
                role_in_project,
                users (
                    id,
                    name,
                    email,
                    user_details (
                        job_title,
                        status,
                        profile_pic
                    )
                )
            `)
            .in('project_id', projectIds)
            .eq('status', 'assigned');

        if (assignError) throw assignError;

        const uniqueMembers = {};
        assignments?.forEach(assignment => {
            const user = assignment.users;
            if (user && !uniqueMembers[user.id]) {
                const userDetails = user.user_details?.[0];
                
                 const profilePic = userDetails?.profile_pic;
    const avatar = (profilePic && profilePic.trim() !== '') 
        ? profilePic 
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=4A90E2&color=fff`;
    
                uniqueMembers[user.id] = {
                    id: user.id,
                    name: user.name,
                    role: userDetails?.job_title || assignment.role_in_project || 'Team Member',
                    email: user.email,
                    status: userDetails?.status || 'Available',
                    avatar: avatar 
                };
            }
        });

        const teamMembers = Object.values(uniqueMembers);
        console.log('[PM DATA SERVICE] Team members fetched:', teamMembers.length);
        return teamMembers;
    } catch (error) {
        console.error('[PM DATA SERVICE] Error fetching team members:', error);
        return [];
    }
}

    async getWeeklyAllocation(weekStart) {
        try {
            console.log('[PM DATA SERVICE] Fetching weekly allocation for week:', weekStart);

            const startDate = new Date(weekStart);
            const dates = [];
            for (let i = 0; i < 5; i++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + i);
                dates.push(date.toISOString().split('T')[0]);
            }

            const teamMembers = await this.getTeamMembers();

            const { data: projects, error: projError } = await supabase
                .from('projects')
                .select('id')
                .eq('created_by', this.currentPMId)
                .in('status', ['pending', 'ongoing', 'active']);

            if (projError) throw projError;

            const projectIds = projects?.map(p => p.id) || [];

            const { data: worklogs, error: worklogError } = await supabase
                .from('worklogs')
                .select('user_id, log_date, hours')
                .in('project_id', projectIds)
                .in('log_date', dates);

            if (worklogError) throw worklogError;

            const allocation = teamMembers.map(member => {
                const memberLogs = worklogs?.filter(log => log.user_id === member.id) || [];
                
                const dailyHours = {
                    mon: 0, tue: 0, wed: 0, thu: 0, fri: 0
                };

                memberLogs.forEach(log => {
                    const logDate = new Date(log.log_date);
                    const dayIndex = (logDate.getDay() + 6) % 7;
                    const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri'];
                    if (dayIndex < 5) {
                        dailyHours[dayKeys[dayIndex]] += parseFloat(log.hours || 0);
                    }
                });

                return {
                    employee: member.name,
                    role: member.role,
                    avatar: member.avatar,
                    ...dailyHours
                };
            });

            console.log('[PM DATA SERVICE] Weekly allocation fetched:', allocation.length);
            return allocation;
        } catch (error) {
            console.error('[PM DATA SERVICE] Error fetching weekly allocation:', error);
            return [];
        }
    }

    async getAvailableTeamMembers() {
    try {
        console.log('[PM DATA SERVICE] Fetching available team members');

        const teamMembers = await this.getTeamMembers(); 

        const { data: projects, error: projError } = await supabase
            .from('projects')
            .select('id')
            .eq('created_by', this.currentPMId)
            .in('status', ['pending', 'ongoing', 'active']);

        if (projError) throw projError;

        const projectIds = projects?.map(p => p.id) || [];

        const { data: assignments, error: assignError } = await supabase
            .from('project_assignments')
            .select('user_id, assigned_hours')
            .in('project_id', projectIds)
            .eq('status', 'assigned');

        if (assignError) throw assignError;

        const userAssignedHours = {};
        assignments?.forEach(assignment => {
            if (!userAssignedHours[assignment.user_id]) {
                userAssignedHours[assignment.user_id] = 0;
            }
            userAssignedHours[assignment.user_id] += parseInt(assignment.assigned_hours || 0);
        });

        const availableMembers = teamMembers
            .map(member => {
                const assignedHours = userAssignedHours[member.id] || 0;
                const availableHours = 40 - assignedHours;
                const utilization = Math.round((assignedHours / 40) * 100);

                return {
                    ...member,
                    assignedHours,
                    availableHours,
                    utilization,
                    utilizationLevel: assignedHours >= 40 ? 'high' : assignedHours >= 20 ? 'medium' : 'low'
                };
            })
            .filter(member => member.availableHours > 0)
            .sort((a, b) => b.availableHours - a.availableHours);

        console.log('[PM DATA SERVICE] Available team members:', availableMembers.length);
        return availableMembers;
    } catch (error) {
        console.error('[PM DATA SERVICE] Error fetching available team members:', error);
        return [];
    }
}

    async saveHourAllocation(data) {
        try {
            console.log('[PM DATA SERVICE] Saving hour allocation:', data);

            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('name', data.employee)
                .single();

            if (userError) throw userError;

            const weekSelect = document.getElementById('weekSelect');
            const weekStart = new Date(weekSelect.value);
            const dayMap = { 'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4 };
            const dayOffset = dayMap[data.day.split(',')[0]] || 0;
            const logDate = new Date(weekStart);
            logDate.setDate(weekStart.getDate() + dayOffset);

            const worklogData = {
                user_id: userData.id,
                project_id: parseInt(data.project),
                log_date: logDate.toISOString().split('T')[0],
                hours: parseFloat(data.hours),
                work_description: data.task || 'Work assigned',
                work_type: 'assigned',
                status: 'in progress'
            };

            console.log('[PM DATA SERVICE] Worklog data to insert:', worklogData);

            const { error: worklogError } = await supabase
                .from('worklogs')
                .insert(worklogData);

            if (worklogError) throw worklogError;

            console.log('[PM DATA SERVICE] Hour allocation saved successfully');
            return { success: true };
        } catch (error) {
            console.error('[PM DATA SERVICE] Error saving allocation:', error);
            throw error;
        }
    }
}

// ============================================
// DASHBOARD APP
// ============================================

class DashboardApp {
    constructor() {
        this.dataService = new PMDataService();
        this.currentWeek = this.getCurrentWeekStart();
        this.selectedCell = null;
    }

    getCurrentWeekStart() {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today.setDate(diff));
        return monday.toISOString().split('T')[0];
    }

    async init() {
        try {
            ModalManager.showLoading();
            
            await this.dataService.initialize();
            await updateUserNameDisplayEnhanced();
            
            this.setupEventListeners();
            await this.loadDashboard();
            
            ModalManager.hideLoading();
        } catch (error) {
            ModalManager.hideLoading();
            console.error('[DASHBOARD APP] Initialization error:', error);
            MessageManager.error('Failed to initialize dashboard. Please login again.');
            setTimeout(() => {
                window.location.href = "/login/HTML_Files/login.html";
            }, 2000);
        }
    }


    changeWeek(direction) {
        const weekSelect = document.getElementById('weekSelect');
        if (!weekSelect) return;

        const currentIndex = weekSelect.selectedIndex;
        const newIndex = currentIndex + direction;

        // Check bounds
        if (newIndex >= 0 && newIndex < weekSelect.options.length) {
            weekSelect.selectedIndex = newIndex;
            this.currentWeek = weekSelect.value;
            this.loadWeeklyAllocation();
        }
    }   

    setupEventListeners() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.openLogoutModal());
        }

        const cancelLogout = document.getElementById('cancelLogout');
        const confirmLogout = document.getElementById('confirmLogout');
        
        if (cancelLogout) {
            cancelLogout.addEventListener('click', () => ModalManager.hide('logoutModal'));
        }
        if (confirmLogout) {
            confirmLogout.addEventListener('click', () => this.handleLogout());
        }

        const prevWeek = document.getElementById('prevWeek');
        const nextWeek = document.getElementById('nextWeek');
        const weekSelect = document.getElementById('weekSelect');

        if (prevWeek) {
            prevWeek.addEventListener('click', () => this.changeWeek(-1));
        }
        if (nextWeek) {
            nextWeek.addEventListener('click', () => this.changeWeek(1));
        }
        if (weekSelect) {
            weekSelect.addEventListener('change', (e) => {
                this.currentWeek = e.target.value;
                this.loadWeeklyAllocation();
            });
        }

        document.addEventListener('click', (e) => {
            const cell = e.target.closest('.hours-cell');
            if (cell) {
                this.openAllocateModal(cell);
            }
        });

        const closeAllocateModal = document.getElementById('closeAllocateModal');
        const cancelAllocate = document.getElementById('cancelAllocate');
        const allocateForm = document.getElementById('allocateHoursForm');

        if (closeAllocateModal) {
            closeAllocateModal.addEventListener('click', () => ModalManager.hide('allocateHoursModal'));
        }
        if (cancelAllocate) {
            cancelAllocate.addEventListener('click', () => ModalManager.hide('allocateHoursModal'));
        }
        if (allocateForm) {
            allocateForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveAllocation();
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

    async loadDashboard() {
    try {
        // Generate week options FIRST
        this.generateWeekOptions();
        
        const stats = await this.dataService.getDashboardStats();
        this.updateStats(stats);

        const projects = await this.dataService.getProjects();
        await this.loadProjectsDropdown(projects);

        await this.loadWeeklyAllocation();
        await this.loadAvailableTeamMembers();

    } catch (error) {
        console.error('[DASHBOARD APP] Error loading dashboard:', error);
        MessageManager.error('Failed to load dashboard data');
    }
}

    updateStats(stats) {
        const elements = {
            activeProjects: document.getElementById('activeProjects'),
            teamMembers: document.getElementById('teamMembers'),
            totalHours: document.getElementById('totalHours'),
            teamUtilization: document.getElementById('teamUtilization')
        };

        if (elements.activeProjects) elements.activeProjects.textContent = stats.activeProjects;
        if (elements.teamMembers) elements.teamMembers.textContent = stats.teamMembers;
        if (elements.totalHours) elements.totalHours.textContent = stats.totalHours + 'h';
        if (elements.teamUtilization) elements.teamUtilization.textContent = stats.teamUtilization + '%';
    }

    async loadProjectsDropdown(projects) {
        const projectSelect = document.getElementById('projectSelect');
        if (!projectSelect) return;

        this.allProjects = projects;

        projectSelect.innerHTML = '<option value="">Select Project</option>';
        
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            projectSelect.appendChild(option);
        });
    }

    async getEmployeeAssignedProjects(employeeName) {
        try {
            console.log('[DASHBOARD APP] Fetching assigned projects for employee:', employeeName);

            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('name', employeeName)
                .single();

            if (userError) throw userError;

            const { data: assignments, error: assignError } = await supabase
                .from('project_assignments')
                .select(`
                    project_id,
                    projects (
                        id,
                        name,
                        created_by
                    )
                `)
                .eq('user_id', userData.id)
                .eq('status', 'assigned');

            if (assignError) throw assignError;

            const employeeProjects = assignments
                ?.filter(a => a.projects && a.projects.created_by === this.dataService.currentPMId)
                .map(a => ({
                    id: a.projects.id,
                    name: a.projects.name
                })) || [];

            const uniqueProjects = Array.from(
                new Map(employeeProjects.map(p => [p.id, p])).values()
            );

            console.log('[DASHBOARD APP] Employee assigned projects:', uniqueProjects);
            return uniqueProjects;
        } catch (error) {
            console.error('[DASHBOARD APP] Error fetching employee assigned projects:', error);
            return [];
        }
    }

    async loadEmployeeProjectsDropdown(employeeName) {
        const projectSelect = document.getElementById('projectSelect');
        if (!projectSelect) return;

        try {
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('name', employeeName)
                .single();

            if (userError) throw userError;

            const userId = userData.id;

            const projects = await this.getEmployeeAssignedProjects(employeeName);

            projectSelect.innerHTML = '<option value="">Select Project</option>';
            
            if (projects.length === 0) {
                const option = document.createElement('option');
                option.value = "";
                option.textContent = "No projects assigned by Resource Manager yet";
                option.disabled = true;
                projectSelect.appendChild(option);
                return;
            }

            const selectedDay = document.getElementById('selectedDay').textContent;
            const weekSelect = document.getElementById('weekSelect');
            const weekStart = new Date(weekSelect.value);
            const dayMap = { 'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4 };
            const dayOffset = dayMap[selectedDay] || 0;
            const selectedDate = new Date(weekStart);
            selectedDate.setDate(weekStart.getDate() + dayOffset);
            const selectedDateStr = selectedDate.toISOString().split('T')[0];

            for (const project of projects) {
                const { data: existingLog, error: logError } = await supabase
                    .from('worklogs')
                    .select('id, hours')
                    .eq('user_id', userId)
                    .eq('project_id', project.id)
                    .eq('log_date', selectedDateStr)
                    .maybeSingle();

                if (logError && logError.code !== 'PGRST116') {
                    console.error('Error checking existing worklog:', logError);
                }

                const option = document.createElement('option');
                option.value = project.id;
                
                if (existingLog) {
                    option.textContent = `${project.name} (Already allocated: ${existingLog.hours}h)`;
                    option.disabled = true;
                    option.style.color = '#999';
                } else {
                    option.textContent = project.name;
                }
                
                projectSelect.appendChild(option);
            }
        } catch (error) {
            console.error('[DASHBOARD APP] Error loading employee projects dropdown:', error);
            projectSelect.innerHTML = '<option value="">Error loading projects</option>';
        }
    }

    async loadWeeklyAllocation() {
        try {
            const allocation = await this.dataService.getWeeklyAllocation(this.currentWeek);
            this.renderWeeklyAllocation(allocation);
        } catch (error) {
            console.error('[DASHBOARD APP] Error loading weekly allocation:', error);
            MessageManager.error('Failed to load weekly allocation');
        }
    }

   updateTableHeaders() {
        const weekSelect = document.getElementById('weekSelect');
        if (!weekSelect) return;

        const startDate = new Date(weekSelect.value);
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        
        const thead = document.querySelector('.allocation-table thead tr');
        if (!thead) return;

        // Update the date labels for each day
        for (let i = 0; i < 5; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            
            const month = currentDate.toLocaleDateString('en-US', { month: 'short' });
            const day = currentDate.getDate();
            
            const thIndex = i + 1; 
            const th = thead.children[thIndex];
            if (th) {
                th.innerHTML = `${dayNames[i]}<br><span class="date-label">${month} ${day}</span>`;
            }
        }
    }

    renderWeeklyAllocation(allocation) {
        const tbody = document.getElementById('allocationTableBody');
        if (!tbody) return;

        // Update the table headers with correct dates
        this.updateTableHeaders();

        if (allocation.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #6c757d;">
                        <i class="fas fa-users" style="font-size: 48px; opacity: 0.3; margin-bottom: 16px;"></i>
                        <p>No team members assigned yet</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = '';

        allocation.forEach(member => {
            const row = document.createElement('tr');
            
            const days = ['mon', 'tue', 'wed', 'thu', 'fri'];
            const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
            const totalHours = days.reduce((sum, day) => sum + (member[day] || 0), 0);
            
            row.innerHTML = `
                <td class="employee-cell">
                    <div class="employee-info">
                        <img src="${member.avatar}" alt="${member.employee}" class="employee-avatar-small">
                        <div>
                            <div class="employee-name">${member.employee}</div>
                            <div class="employee-role">${member.role}</div>
                        </div>
                    </div>
                </td>
                ${days.map((day, index) => {
                    const hours = member[day] || 0;
                    const cellClass = hours === 8 ? 'full' : hours > 0 ? 'partial' : 'empty';
                    return `
                        <td class="hours-cell ${cellClass}" data-employee="${member.employee}" data-day="${dayLabels[index]}">
                            <div class="hours-value">${hours}h</div>
                        </td>
                    `;
                }).join('')}
                <td class="total-cell">${totalHours}h</td>
            `;
            
            tbody.appendChild(row);
        });
    }

    async loadAvailableTeamMembers() {
        try {
            const availableMembers = await this.dataService.getAvailableTeamMembers();
            this.renderAvailableTeamMembers(availableMembers);
        } catch (error) {
            console.error('[DASHBOARD APP] Error loading available team members:', error);
        }
    }

    renderAvailableTeamMembers(members) {
        const container = document.querySelector('.available-grid');
        if (!container) return;

        if (members.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #6c757d;">
                    <i class="fas fa-users" style="font-size: 48px; opacity: 0.3; margin-bottom: 16px;"></i>
                    <p>All team members are fully allocated</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        
        members.forEach(member => {
            const card = document.createElement('div');
            card.className = 'available-card';
            
            card.innerHTML = `
                <img src="${member.avatar}" alt="${member.name}" class="available-avatar">
                <div class="available-info">
                    <h4>${member.name}</h4>
                    <p class="available-role">${member.role}</p>
                    <div class="utilization-badge ${member.utilizationLevel}">
                        <i class="fas fa-circle"></i> ${member.utilization}% Utilization
                    </div>
                    <p class="available-hours">${member.availableHours}h available</p>
                </div>
            `;
            
            container.appendChild(card);
        });
    }

    getCurrentWeekStart() {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today.setDate(diff));
        return monday.toISOString().split('T')[0];
    }


    generateWeekOptions() {
        const weekSelect = document.getElementById('weekSelect');
        if (!weekSelect) return;

        const today = new Date();
        const currentDay = today.getDay();
        const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
        const currentMonday = new Date(today.setDate(diff));
        
        weekSelect.innerHTML = '';
        
        // Generate only 10 past weeks 
        for (let i = -10; i <= 0; i++) {
            const weekStart = new Date(currentMonday);
            weekStart.setDate(currentMonday.getDate() + (i * 7));
            
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 4);
            
            const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
            const startDay = weekStart.getDate();
            const startYear = weekStart.getFullYear();
            
            const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
            const endDay = weekEnd.getDate();
            const endYear = weekEnd.getFullYear();
            
            const option = document.createElement('option');
            option.value = weekStart.toISOString().split('T')[0];
            
            if (startMonth === endMonth && startYear === endYear) {
                option.textContent = `Week of ${startMonth} ${startDay} - ${endDay}, ${startYear}`;
            } else if (startYear === endYear) {
                option.textContent = `Week of ${startMonth} ${startDay} - ${endMonth} ${endDay}, ${startYear}`;
            } else {
                option.textContent = `Week of ${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`;
            }
            
            if (i === 0) {
                option.selected = true;
            }
            
            weekSelect.appendChild(option);
        }
        
        this.currentWeek = weekSelect.value;
    }


    changeWeek(direction) {
        const weekSelect = document.getElementById('weekSelect');
        if (!weekSelect) return;

        const currentIndex = weekSelect.selectedIndex;
        const newIndex = currentIndex + direction;

        // Check bounds
        if (newIndex >= 0 && newIndex < weekSelect.options.length) {
            weekSelect.selectedIndex = newIndex;
            this.currentWeek = weekSelect.value;
            this.loadWeeklyAllocation();
        }
    }
    async openAllocateModal(cell) {
        const employee = cell.dataset.employee;
        const day = cell.dataset.day;
        const currentHours = cell.querySelector('.hours-value').textContent;

        this.selectedCell = cell;

        try {
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('name', employee)
                .single();

            if (userError) throw userError;

            const { data: assignment, error: assignError } = await supabase
                .from('project_assignments')
                .select('assignment_type')
                .eq('user_id', userData.id)
                .eq('status', 'assigned')
                .limit(1)
                .single();

            const assignmentType = assignment?.assignment_type || 'Full-Time';
            
            const employeeDisplay = document.getElementById('selectedEmployee');
            if (employeeDisplay) {
                employeeDisplay.innerHTML = `${employee} <span style="color: #666; font-size: 0.9em;">(${assignmentType})</span>`;
            }
        } catch (error) {
            console.error('Error fetching assignment type:', error);
            document.getElementById('selectedEmployee').textContent = employee;
        }

        document.getElementById('selectedDay').textContent = day;
        document.getElementById('hoursInput').value = parseInt(currentHours) || 0;

        await this.loadEmployeeProjectsDropdown(employee);

        ModalManager.show('allocateHoursModal');
    }

    async saveAllocation() {
        const project = document.getElementById('projectSelect').value;
        const hours = document.getElementById('hoursInput').value;
        const task = document.getElementById('taskInput').value;

        if (!project) {
            MessageManager.error('Please select a project');
            return;
        }

        if (hours < 0 || hours > 8) {
            MessageManager.error('Hours must be between 0 and 8');
            return;
        }

        try {
            ModalManager.hide('allocateHoursModal');
            ModalManager.showLoading();

            const employeeDisplayText = document.getElementById('selectedEmployee').textContent;
            const employeeName = employeeDisplayText.split('(')[0].trim();

            const data = {
                employee: employeeName,
                day: document.getElementById('selectedDay').textContent,
                project: project,
                hours: hours,
                task: task
            };

            await this.dataService.saveHourAllocation(data);

            await this.loadWeeklyAllocation();
            await this.loadDashboard();

            ModalManager.hideLoading();
            MessageManager.success('Hours allocated successfully');
        } catch (error) {
            ModalManager.hideLoading();
            console.error('[DASHBOARD APP] Error saving allocation:', error);
            MessageManager.error('Failed to save allocation');
        }
    }

    openLogoutModal() {
        ModalManager.show('logoutModal');
    }

    handleLogout() {
        localStorage.removeItem('loggedUser');
        sessionStorage.clear();
        ModalManager.hide('logoutModal');
        ModalManager.showLoading();
        
        setTimeout(() => {
            window.location.href = "/login/HTML_Files/login.html";
        }, 500);
    }
}

// ============================================
// INITIALIZATION
// ============================================

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new DashboardApp();
    app.init();
});