// ============================================
// UTILITY - Debounce Function
// ============================================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// DATA SERVICE - Ready for Supabase Integration (Assignments-focused)
// ============================================
class EmployeeDataService {
    constructor() {
        // TODO: Initialize Supabase client here
        // this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        this.currentEmployeeId = 'EMP001'; // Mock current user
    }

    // Assignment Methods
    async getEmployeeAssignments() {
        // TODO: Replace with Supabase query
        // const { data, error } = await this.supabase.from('assignments').select('*').eq('employee_id', this.currentEmployeeId);
        return this.getMockAssignments();
    }

    async updateAssignmentStatus(assignmentId, status) {
        // TODO: Replace with Supabase mutation
        // const { data, error } = await this.supabase.from('assignments').update({ status }).eq('id', assignmentId);
        console.log(`Assignment ${assignmentId} updated to ${status}`);
        return { success: true };
    }

    async logWorkHours(assignmentId, hours, date) {
        // TODO: Replace with Supabase insert
        // const { data, error } = await this.supabase.from('work_logs').insert({ employee_id: this.currentEmployeeId, assignment_id: assignmentId, hours, date });
        console.log(`Logged ${hours} hours for assignment ${assignmentId}`);
        return { success: true };
    }

    // Mock Data Methods (Remove these when integrating with Supabase)
    getMockAssignments() {
        return [
            {
                id: 'ASSIGN001',
                title: 'Backend API Development',
                project: 'Project Alpha',
                description: 'Develop RESTful APIs for the new customer portal',
                status: 'in-progress',
                priority: 'high',
                deadline: '2025-11-15',
                progress: 65,
                hoursAllocated: 40,
                hoursWorked: 26
            },
            {
                id: 'ASSIGN002',
                title: 'Database Optimization',
                project: 'Project Alpha',
                description: 'Optimize database queries and improve performance',
                status: 'in-progress',
                priority: 'medium',
                deadline: '2025-11-20',
                progress: 30,
                hoursAllocated: 16,
                hoursWorked: 5
            },
            {
                id: 'ASSIGN003',
                title: 'Code Review',
                project: 'Project Beta',
                description: 'Review pull requests from team members',
                status: 'pending',
                priority: 'low',
                deadline: '2025-11-10',
                progress: 0,
                hoursAllocated: 8,
                hoursWorked: 0
            },
            {
                id: 'ASSIGN004',
                title: 'Authentication Module',
                project: 'Project Gamma',
                description: 'Implement JWT authentication and authorization',
                status: 'completed',
                priority: 'high',
                deadline: '2025-10-30',
                progress: 100,
                hoursAllocated: 24,
                hoursWorked: 24
            }
        ];
    }
}

// ============================================
// UI MANAGER CLASS (Assignments-focused)
// ============================================
class EmployeeUIManager {
    constructor() {
        this.currentPage = 'assignments';
    }

    showLoading() {
        Swal.fire({
            title: 'Loading...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
    }

    hideLoading() {
        Swal.close();
    }

    showSuccess(message) {
        Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: message,
            confirmButtonColor: '#000000'
        });
    }

    showError(message) {
        Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: message,
            confirmButtonColor: '#D0021B'
        });
    }

    async showConfirmation(title, text) {
        const result = await Swal.fire({
            title: title,
            text: text,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#000000',
            cancelButtonColor: '#6C757D',
            confirmButtonText: 'Yes, proceed',
            cancelButtonText: 'Cancel'
        });
        return result.isConfirmed;
    }

    updateHeaderInfo(profile) {
        document.getElementById('headerName').textContent = profile.name;
        document.getElementById('headerAvatar').src = profile.avatar;
    }

    renderAssignments(assignments) {
        const container = document.getElementById('assignmentsGrid');
        
        if (assignments.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <i class="fas fa-inbox"></i>
                    <h3>No Assignments Found</h3>
                    <p>You don't have any assignments yet</p>
                </div>
            `;
            return;
        }

        container.innerHTML = assignments.map(assign => `
            <div class="assignment-detail-card">
                <div class="assignment-detail-header">
                    <h3>${assign.title}</h3>
                    <p style="color: #6C757D; font-size: 14px; margin-bottom: 8px;">${assign.project}</p>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <span class="assignment-status ${assign.status}">${this.formatStatus(assign.status)}</span>
                        <span class="priority-badge ${assign.priority}">${this.capitalize(assign.priority)}</span>
                    </div>
                </div>
                <div class="assignment-detail-meta">
                    <span><i class="fas fa-calendar"></i> ${this.formatDate(assign.deadline)}</span>
                    <span><i class="fas fa-clock"></i> ${assign.hoursWorked}/${assign.hoursAllocated}h</span>
                </div>
                <p class="assignment-description">${assign.description}</p>
                <div class="assignment-actions" style="margin-top: 16px;">
                    ${assign.status !== 'completed' ? `
                        <button class="btn-info" onclick="assignmentsApp.viewAssignment('${assign.id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn-success" onclick="assignmentsApp.logHours('${assign.id}')">
                            <i class="fas fa-clock"></i> Log Hours
                        </button>
                    ` : `
                        <button class="btn-info" onclick="assignmentsApp.viewAssignment('${assign.id}')" style="flex: 1;">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                    `}
                </div>
            </div>
        `).join('');

        // Update stats
        this.updateAssignmentsStats(assignments);
    }

    updateAssignmentsStats(assignments) {
        document.getElementById('totalAssignments').textContent = assignments.length;
        document.getElementById('inProgressCount').textContent = assignments.filter(a => a.status === 'in-progress').length;
        document.getElementById('pendingCount').textContent = assignments.filter(a => a.status === 'pending').length;
        document.getElementById('completedCount').textContent = assignments.filter(a => a.status === 'completed').length;
    }

    formatStatus(status) {
        return status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// ============================================
// MAIN APPLICATION CLASS (Assignments-focused)
// ============================================
class AssignmentsApp {
    constructor() {
        this.dataService = new EmployeeDataService();
        this.uiManager = new EmployeeUIManager();
        this.allAssignments = [];
    }

    async init() {
        this.setupEventListeners();
        await this.loadAssignments();
        await this.loadHeaderInfo();
    }

    setupEventListeners() {
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Search with debounce
        const searchInput = document.getElementById('assignmentSearch');
        if (searchInput) {
            const debouncedSearch = debounce(() => this.filterAssignments(), 300);
            searchInput.addEventListener('input', debouncedSearch);
        }

        // Filters
        const statusFilter = document.getElementById('statusFilter');
        const priorityFilter = document.getElementById('priorityFilter');
        
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filterAssignments());
        }
        if (priorityFilter) {
            priorityFilter.addEventListener('change', () => this.filterAssignments());
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadAssignments());
        }
    }

    async loadHeaderInfo() {
        // Mock profile for header - in real app, fetch from shared service or local storage
        const profile = {
            name: 'John Doe',
            avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=4A90E2&color=fff'
        };
        this.uiManager.updateHeaderInfo(profile);
    }

    async loadAssignments() {
        try {
            this.uiManager.showLoading();
            this.allAssignments = await this.dataService.getEmployeeAssignments();
            this.uiManager.renderAssignments(this.allAssignments);
            this.uiManager.hideLoading();
        } catch (error) {
            this.uiManager.hideLoading();
            console.error('Error loading assignments:', error);
            this.uiManager.showError('Failed to load assignments');
        }
    }

    filterAssignments() {
        const searchTerm = document.getElementById('assignmentSearch').value.toLowerCase();
        const statusFilter = document.getElementById('statusFilter').value;
        const priorityFilter = document.getElementById('priorityFilter').value;

        let filtered = this.allAssignments.filter(assign => {
            const matchesSearch = !searchTerm || 
                assign.title.toLowerCase().includes(searchTerm) ||
                assign.project.toLowerCase().includes(searchTerm) ||
                assign.description.toLowerCase().includes(searchTerm);
            
            const matchesStatus = !statusFilter || assign.status === statusFilter;
            const matchesPriority = !priorityFilter || assign.priority === priorityFilter;
            
            return matchesSearch && matchesStatus && matchesPriority;
        });

        this.uiManager.renderAssignments(filtered);
    }

    async viewAssignment(id) {
        const assignment = this.allAssignments.find(a => a.id === id);
        
        if (!assignment) {
            this.uiManager.showError('Assignment not found');
            return;
        }

        await Swal.fire({
            title: assignment.title,
            html: `
                <div style="text-align: left; padding: 20px;">
                    <div style="display: flex; gap: 8px; margin-bottom: 16px;">
                        <span class="assignment-status ${assignment.status}" style="padding: 6px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">${this.uiManager.formatStatus(assignment.status)}</span>
                        <span class="priority-badge ${assignment.priority}" style="padding: 6px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">${this.uiManager.capitalize(assignment.priority)}</span>
                    </div>
                    <p><strong>Project:</strong> ${assignment.project}</p>
                    <p><strong>Deadline:</strong> ${this.uiManager.formatDate(assignment.deadline)}</p>
                    <p><strong>Hours Allocated:</strong> ${assignment.hoursAllocated}h</p>
                    <p><strong>Hours Worked:</strong> ${assignment.hoursWorked}h</p>
                    <p><strong>Progress:</strong> ${assignment.progress}%</p>
                    <div style="width: 100%; height: 10px; background-color: #E9ECEF; border-radius: 5px; margin: 12px 0;">
                        <div style="width: ${assignment.progress}%; height: 100%; background-color: #4A90E2; border-radius: 5px;"></div>
                    </div>
                    <p style="margin-top: 16px;"><strong>Description:</strong></p>
                    <p style="color: #6C757D;">${assignment.description}</p>
                </div>
            `,
            width: 600,
            confirmButtonColor: '#000000',
            confirmButtonText: 'Close'
        });
    }

    async logHours(assignmentId) {
        const assignment = this.allAssignments.find(a => a.id === assignmentId);
        
        if (!assignment) {
            this.uiManager.showError('Assignment not found');
            return;
        }

        const { value: formValues } = await Swal.fire({
            title: 'Log Working Hours',
            html: `
                <div style="text-align: left;">
                    <p style="margin-bottom: 16px;"><strong>Assignment:</strong> ${assignment.title}</p>
                    
                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">Date:</label>
                    <input id="workDate" type="date" class="swal2-input" value="${new Date().toISOString().split('T')[0]}" style="width: 90%; margin: 0 0 16px 0;">
                    
                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">Hours Worked:</label>
                    <input id="hoursWorked" type="number" class="swal2-input" min="0.5" max="12" step="0.5" placeholder="e.g., 4" style="width: 90%; margin: 0 0 16px 0;">
                    
                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">Notes (optional):</label>
                    <textarea id="workNotes" class="swal2-textarea" placeholder="Describe what you worked on..." style="width: 90%; margin: 0;"></textarea>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#000000',
            cancelButtonColor: '#6C757D',
            confirmButtonText: 'Log Hours',
            preConfirm: () => {
                const hours = parseFloat(document.getElementById('hoursWorked').value);
                
                if (!hours || hours <= 0) {
                    Swal.showValidationMessage('Please enter valid hours');
                    return false;
                }
                
                return {
                    date: document.getElementById('workDate').value,
                    hours: hours,
                    notes: document.getElementById('workNotes').value
                };
            }
        });

        if (formValues) {
            try {
                this.uiManager.showLoading();
                await this.dataService.logWorkHours(assignmentId, formValues.hours, formValues.date);
                
                // Update assignment hours
                assignment.hoursWorked += formValues.hours;
                assignment.progress = Math.min(100, Math.round((assignment.hoursWorked / assignment.hoursAllocated) * 100));
                
                this.uiManager.hideLoading();
                this.uiManager.showSuccess(`${formValues.hours} hours logged successfully!`);
                
                // Refresh assignments
                this.uiManager.renderAssignments(this.allAssignments);
            } catch (error) {
                this.uiManager.hideLoading();
                console.error('Error logging hours:', error);
                this.uiManager.showError('Failed to log hours');
            }
        }
    }

    async logout() {
        const confirmed = await this.uiManager.showConfirmation(
            'Confirm Logout',
            'Are you sure you want to logout?'
        );

        if (confirmed) {
            this.uiManager.showLoading();
            
            // TODO: Add Supabase logout here
            // await this.dataService.supabase.auth.signOut();
            
            setTimeout(() => {
                window.location.href = "/login/HTML_Files/login.html"; // Redirect to login page
            }, 1000);
        }
    }
}

// ============================================
// INITIALIZE APPLICATION
// ============================================
let assignmentsApp;

document.addEventListener('DOMContentLoaded', () => {
    assignmentsApp = new AssignmentsApp();
    assignmentsApp.init();
});