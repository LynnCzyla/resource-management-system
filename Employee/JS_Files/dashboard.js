// ============================================
// DATA SERVICE - Mock Data for Dashboard
// ============================================
class DashboardDataService {
    constructor() {
        this.currentEmployeeId = 'EMP001'; // Mock current user
    }

    async getEmployeeProfile() {
        return {
            id: 'EMP001',
            name: 'John Doe',
            role: 'Senior Developer',
            department: 'Engineering',
            email: 'john.doe@company.com',
            avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=4A90E2&color=fff'
        };
    }

    async getEmployeeAssignments() {
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

    async getWorkingHours(period = 'week') {
        if (period === 'today') {
            return { today: 6 };
        }
        
        return {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            data: [8, 7, 6, 8, 5]
        };
    }

    async getDashboardStats() {
        const assignments = await this.getEmployeeAssignments();
        const hours = await this.getWorkingHours('today');
        
        return {
            activeAssignments: assignments.filter(a => a.status === 'in-progress').length,
            workingHours: hours.today || 0,
            completedTasks: assignments.filter(a => a.status === 'completed').length,
            pendingTasks: assignments.filter(a => a.status === 'pending').length
        };
    }
}

// ============================================
// UI MANAGER CLASS
// ============================================
class DashboardUIManager {
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

    updateStats(stats) {
        document.getElementById('activeAssignments').textContent = stats.activeAssignments;
        document.getElementById('workingHours').textContent = stats.workingHours + 'h';
        document.getElementById('completedTasks').textContent = stats.completedTasks;
        document.getElementById('pendingTasks').textContent = stats.pendingTasks;
    }

    updateHeaderInfo(profile) {
        document.getElementById('headerName').textContent = profile.name;
        document.getElementById('headerAvatar').src = profile.avatar;
    }

    renderCurrentAssignments(assignments) {
        const container = document.getElementById('currentAssignmentsList');
        const activeAssignments = assignments.filter(a => a.status === 'in-progress').slice(0, 3);
        
        if (activeAssignments.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6C757D;">No active assignments</p>';
            return;
        }

        container.innerHTML = activeAssignments.map(assign => `
            <div class="assignment-card">
                <div class="assignment-header">
                    <div>
                        <h3 class="assignment-title">${assign.title}</h3>
                        <p class="assignment-project">${assign.project}</p>
                    </div>
                    <span class="assignment-status ${assign.status}">${this.formatStatus(assign.status)}</span>
                </div>
                <div class="assignment-footer">
                    <span class="assignment-deadline">
                        <i class="fas fa-calendar"></i>
                        Due: ${this.formatDate(assign.deadline)}
                    </span>
                    <span class="assignment-hours">${assign.hoursWorked}/${assign.hoursAllocated}h</span>
                </div>
            </div>
        `).join('');
    }

    formatStatus(status) {
        return status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
}

// ============================================
// CHART MANAGER CLASS
// ============================================
class DashboardChartManager {
    constructor() {
        this.hoursChart = null;
    }

    initHoursChart(data) {
        const ctx = document.getElementById('hoursChart').getContext('2d');
        
        if (this.hoursChart) {
            this.hoursChart.destroy();
        }

        this.hoursChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Hours Worked',
                    data: data.data,
                    backgroundColor: data.data.map(h => {
                        if (h < 8) return '#F5A623';
                        if (h === 8) return '#4A90E2';
                        return '#D0021B';
                    }),
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 12,
                        ticks: { stepSize: 2 },
                        grid: { display: true }
                    },
                    x: {
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.parsed.y} hours`
                        }
                    }
                }
            }
        });
    }
}

// ============================================
// MAIN DASHBOARD APP CLASS
// ============================================
class DashboardApp {
    constructor() {
        this.dataService = new DashboardDataService();
        this.uiManager = new DashboardUIManager();
        this.chartManager = new DashboardChartManager();
        this.currentProfile = null;
    }

    async init() {
        this.setupEventListeners();
        await this.loadDashboard();
    }

    setupEventListeners() {
        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    async loadDashboard() {
        try {
            // Load profile for header
            if (!this.currentProfile) {
                this.currentProfile = await this.dataService.getEmployeeProfile();
                this.uiManager.updateHeaderInfo(this.currentProfile);
            }

            // Load stats
            const stats = await this.dataService.getDashboardStats();
            this.uiManager.updateStats(stats);

            // Load working hours chart
            const hoursData = await this.dataService.getWorkingHours('week');
            this.chartManager.initHoursChart(hoursData);

            // Load current assignments
            const assignments = await this.dataService.getEmployeeAssignments();
            this.uiManager.renderCurrentAssignments(assignments);
        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.uiManager.showError('Failed to load dashboard data');
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
let dashboardApp;

document.addEventListener('DOMContentLoaded', () => {
    dashboardApp = new DashboardApp();
    dashboardApp.init();
});