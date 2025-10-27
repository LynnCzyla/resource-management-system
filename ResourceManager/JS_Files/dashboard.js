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

function throttle(func, limit = 200) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
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
// DATA MANAGEMENT (In-Memory Storage)
// ============================================

let employeesData = [];

function initializeData() {
    if (employeesData.length === 0) {
        employeesData = [
            {
                id: 1, name: "John Doe", role: "Senior Developer",
                email: "john.doe@company.com",
                skills: ["JavaScript", "React", "Node.js"],
                avatar: "https://ui-avatars.com/api/?name=John+Doe&background=4A90E2&color=fff",
                workload: { today: 8, week: [8, 8, 8, 7, 8], month: Array(30).fill(8) }
            },
            {
                id: 2, name: "Jane Smith", role: "UI/UX Designer",
                email: "jane.smith@company.com",
                skills: ["Figma", "Adobe XD", "UI Design"],
                avatar: "https://ui-avatars.com/api/?name=Jane+Smith&background=7ED321&color=fff",
                workload: { today: 10, week: [10, 9, 10, 10, 8], month: Array(30).fill(9) }
            },
            {
                id: 3, name: "Mike Johnson", role: "Full Stack Developer",
                email: "mike.j@company.com",
                skills: ["Python", "Django", "PostgreSQL"],
                avatar: "https://ui-avatars.com/api/?name=Mike+Johnson&background=F5A623&color=fff",
                workload: { today: 6, week: [6, 7, 5, 6, 6], month: Array(30).fill(6) }
            },
            {
                id: 4, name: "Sarah Williams", role: "Project Manager",
                email: "sarah.w@company.com",
                skills: ["Agile", "Scrum", "Jira"],
                avatar: "https://ui-avatars.com/api/?name=Sarah+Williams&background=D0021B&color=fff",
                workload: { today: 3, week: [3, 4, 3, 2, 4], month: Array(30).fill(3) }
            },
            {
                id: 5, name: "David Brown", role: "DevOps Engineer",
                email: "david.b@company.com",
                skills: ["Docker", "Kubernetes", "AWS"],
                avatar: "https://ui-avatars.com/api/?name=David+Brown&background=4A90E2&color=fff",
                workload: { today: 9, week: [9, 9, 8, 9, 10], month: Array(30).fill(9) }
            },
            {
                id: 6, name: "Emily Davis", role: "Frontend Developer",
                email: "emily.d@company.com",
                skills: ["Vue.js", "CSS", "TypeScript"],
                avatar: "https://ui-avatars.com/api/?name=Emily+Davis&background=7ED321&color=fff",
                workload: { today: 2, week: [2, 3, 2, 1, 3], month: Array(30).fill(2) }
            },
            {
                id: 7, name: "Robert Martinez", role: "Backend Developer",
                email: "robert.m@company.com",
                skills: ["Java", "Spring Boot", "MongoDB"],
                avatar: "https://ui-avatars.com/api/?name=Robert+Martinez&background=F5A623&color=fff",
                workload: { today: 8, week: [8, 8, 7, 8, 8], month: Array(30).fill(8) }
            },
            {
                id: 8, name: "Lisa Anderson", role: "QA Engineer",
                email: "lisa.a@company.com",
                skills: ["Selenium", "Jest", "Testing"],
                avatar: "https://ui-avatars.com/api/?name=Lisa+Anderson&background=D0021B&color=fff",
                workload: { today: 5, week: [5, 6, 5, 5, 4], month: Array(30).fill(5) }
            }
        ];
    }
}

function getEmployees() { return employeesData; }
function saveEmployees(employees) { employeesData = employees; }
function getEmployeeById(id) { return employeesData.find(e => e.id === id); }

// ============================================
// WORKLOAD CALCULATIONS
// ============================================

function calculateWorkloadStats(period = 'today') {
    const employees = getEmployees();
    const stats = {
        total: employees.length, available: 0, partial: 0, fullyAllocated: 0,
        overtime: 0, totalHours: 0, belowTarget: 0, atTarget: 0, overTarget: 0
    };

    employees.forEach(emp => {
        let hours = 0;
        if (period === 'today') hours = emp.workload.today;
        else if (period === 'week') hours = emp.workload.week.reduce((a, b) => a + b, 0) / emp.workload.week.length;
        else if (period === 'month') hours = emp.workload.month.reduce((a, b) => a + b, 0) / emp.workload.month.length;

        stats.totalHours += hours;
        if (hours < 4) stats.available++;
        else if (hours >= 4 && hours < 8) stats.partial++;
        else if (hours === 8) stats.fullyAllocated++;
        else stats.overtime++;

        if (hours < 8) stats.belowTarget++;
        else if (hours === 8) stats.atTarget++;
        else stats.overTarget++;
    });

    stats.avgHours = employees.length > 0 ? (stats.totalHours / employees.length).toFixed(1) : 0;
    return stats;
}

function getWorkloadStatus(hours) {
    if (hours < 4) return 'available';
    if (hours >= 4 && hours < 8) return 'partial';
    if (hours === 8) return 'full';
    return 'over';
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderDashboard(period = 'today') {
    const stats = calculateWorkloadStats(period);
    const statsElements = {
        totalEmployees: document.getElementById('totalEmployees'),
        availableEmployees: document.getElementById('availableEmployees'),
        partialEmployees: document.getElementById('partialEmployees'),
        fullyAllocated: document.getElementById('fullyAllocated'),
        avgHours: document.getElementById('avgHours'),
        belowTarget: document.getElementById('belowTarget'),
        atTarget: document.getElementById('atTarget'),
        overTarget: document.getElementById('overTarget')
    };

    if (statsElements.totalEmployees) statsElements.totalEmployees.textContent = stats.total;
    if (statsElements.availableEmployees) statsElements.availableEmployees.textContent = stats.available;
    if (statsElements.partialEmployees) statsElements.partialEmployees.textContent = stats.partial;
    if (statsElements.fullyAllocated) statsElements.fullyAllocated.textContent = stats.fullyAllocated;
    if (statsElements.avgHours) statsElements.avgHours.textContent = stats.avgHours + 'h';
    if (statsElements.belowTarget) statsElements.belowTarget.textContent = stats.belowTarget;
    if (statsElements.atTarget) statsElements.atTarget.textContent = stats.atTarget;
    if (statsElements.overTarget) statsElements.overTarget.textContent = stats.overTarget;

    renderTimeline(period);
}

function renderTimeline(period = 'today') {
    const employees = getEmployees();
    const timelineRows = document.getElementById('timelineRows');
    const timelineDates = document.getElementById('timelineDates');

    if (!timelineRows || !timelineDates) return;

    const rowsFragment = document.createDocumentFragment();
    timelineRows.textContent = '';
    timelineDates.textContent = '';

    renderTimelineDates(period, timelineDates);
    employees.forEach(emp => {
        const row = createEmployeeRow(emp, period);
        rowsFragment.appendChild(row);
    });

    timelineRows.appendChild(rowsFragment);
}

function renderTimelineDates(period, container) {
    const dateHeader = document.createElement('div');
    dateHeader.className = 'timeline-date-cell';
    dateHeader.textContent = 'Employee';
    container.appendChild(dateHeader);
    
    if (period === 'today') {
        const cell = document.createElement('div');
        cell.className = 'timeline-date-cell';
        cell.textContent = 'Sun, Oct 26';
        container.appendChild(cell);
    } else if (period === 'week') {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        days.forEach((day, i) => {
            const cell = document.createElement('div');
            cell.className = 'timeline-date-cell';
            cell.textContent = `${day}, Oct ${22 + i}`;
            container.appendChild(cell);
        });
    } else if (period === 'month') {
        for (let i = 1; i <= 7; i++) {
            const cell = document.createElement('div');
            cell.className = 'timeline-date-cell';
            cell.textContent = `Week ${i}`;
            container.appendChild(cell);
        }
    }
}

function createEmployeeRow(emp, period) {
    const row = document.createElement('div');
    row.className = 'timeline-row';

    const employeeCell = document.createElement('div');
    employeeCell.className = 'employee-cell';
    
    const img = document.createElement('img');
    img.src = emp.avatar;
    img.alt = emp.name;
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'employee-cell-info';
    
    const h4 = document.createElement('h4');
    h4.textContent = emp.name;
    
    const p = document.createElement('p');
    p.textContent = emp.role;
    
    infoDiv.appendChild(h4);
    infoDiv.appendChild(p);
    employeeCell.appendChild(img);
    employeeCell.appendChild(infoDiv);
    row.appendChild(employeeCell);

    if (period === 'today') {
        row.appendChild(createWorkloadCell(emp.workload.today));
    } else if (period === 'week') {
        emp.workload.week.forEach(hours => row.appendChild(createWorkloadCell(hours)));
    } else if (period === 'month') {
        for (let i = 0; i < 7; i++) {
            const weekStart = i * 4;
            const weekEnd = Math.min(weekStart + 4, emp.workload.month.length);
            const weekHours = emp.workload.month.slice(weekStart, weekEnd);
            const avgHours = Math.round(weekHours.reduce((a, b) => a + b, 0) / weekHours.length);
            row.appendChild(createWorkloadCell(avgHours));
        }
    }

    return row;
}

function createWorkloadCell(hours) {
    const cell = document.createElement('div');
    cell.className = 'workload-cell';
    
    const bar = document.createElement('div');
    bar.className = 'workload-bar';
    
    const fill = document.createElement('div');
    const status = getWorkloadStatus(hours);
    const percentage = Math.min((hours / 8) * 100, 100);
    fill.className = `workload-fill ${status}`;
    fill.style.width = `${percentage}%`;
    
    const label = document.createElement('span');
    label.className = 'workload-label';
    label.textContent = `${hours}h`;
    
    fill.appendChild(label);
    bar.appendChild(fill);
    cell.appendChild(bar);
    
    return cell;
}

// ============================================
// EMPLOYEE MANAGEMENT - ADD
// ============================================

function openAddEmployeeModal() {
    document.getElementById('addEmployeeForm').reset();
    ModalManager.show('addEmployeeModal');
}

function handleAddEmployee() {
    const name = document.getElementById('empName').value.trim();
    const role = document.getElementById('empRole').value.trim();
    const email = document.getElementById('empEmail').value.trim();
    const skillsInput = document.getElementById('empSkills').value.trim();
    const workload = parseInt(document.getElementById('empWorkload').value) || 0;

    if (!name || !role || !email || !skillsInput) {
        alert('Please fill all fields');
        return;
    }

    const employees = getEmployees();
    const newId = Math.max(...employees.map(e => e.id), 0) + 1;
    
    const newEmployee = {
        id: newId,
        name: name,
        role: role,
        email: email,
        skills: skillsInput.split(',').map(s => s.trim()),
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4A90E2&color=fff`,
        workload: {
            today: workload,
            week: Array(5).fill(workload),
            month: Array(30).fill(workload)
        }
    };

    employees.push(newEmployee);
    saveEmployees(employees);
    
    ModalManager.hide('addEmployeeModal');
    showSuccessMessage(`${newEmployee.name} has been added successfully.`);
    renderDashboard();
}

// ============================================
// EMPLOYEE MANAGEMENT - EDIT
// ============================================

function openEditEmployeeModal(id) {
    const employee = getEmployeeById(id);
    if (!employee) return;

    document.getElementById('editEmpId').value = employee.id;
    document.getElementById('editEmpName').value = employee.name;
    document.getElementById('editEmpRole').value = employee.role;
    document.getElementById('editEmpEmail').value = employee.email;
    document.getElementById('editEmpSkills').value = employee.skills.join(', ');
    document.getElementById('editEmpWorkload').value = employee.workload.today;

    ModalManager.show('editEmployeeModal');
}

function handleEditEmployee() {
    const id = parseInt(document.getElementById('editEmpId').value);
    const name = document.getElementById('editEmpName').value.trim();
    const role = document.getElementById('editEmpRole').value.trim();
    const email = document.getElementById('editEmpEmail').value.trim();
    const skillsInput = document.getElementById('editEmpSkills').value.trim();
    const workload = parseInt(document.getElementById('editEmpWorkload').value);

    if (!name || !role || !email || !skillsInput) {
        alert('Please fill all fields');
        return;
    }

    const employees = getEmployees();
    const employee = employees.find(e => e.id === id);
    
    if (employee) {
        employee.name = name;
        employee.role = role;
        employee.email = email;
        employee.skills = skillsInput.split(',').map(s => s.trim());
        employee.workload.today = workload;
        saveEmployees(employees);
        
        ModalManager.hide('editEmployeeModal');
        showSuccessMessage('Employee information has been updated.');
        renderDashboard();
    }
}

// ============================================
// EMPLOYEE MANAGEMENT - VIEW
// ============================================

let currentViewEmployeeId = null;

function openViewEmployeeModal(id) {
    const employee = getEmployeeById(id);
    if (!employee) return;

    currentViewEmployeeId = id;

    document.getElementById('viewEmpName').textContent = employee.name;
    document.getElementById('viewEmpAvatar').src = employee.avatar;
    document.getElementById('viewEmpRole').textContent = employee.role;
    document.getElementById('viewEmpEmail').textContent = employee.email;
    document.getElementById('viewEmpWorkload').textContent = `${employee.workload.today}h / 8h`;

    const skillsContainer = document.getElementById('viewEmpSkills');
    skillsContainer.innerHTML = '';
    employee.skills.forEach(skill => {
        const badge = document.createElement('span');
        badge.className = 'skill-badge';
        badge.textContent = skill;
        skillsContainer.appendChild(badge);
    });

    ModalManager.show('viewEmployeeModal');
}

function handleEditFromView() {
    ModalManager.hide('viewEmployeeModal');
    openEditEmployeeModal(currentViewEmployeeId);
}

function handleDeleteFromView() {
    ModalManager.hide('viewEmployeeModal');
    openConfirmDeleteModal(currentViewEmployeeId);
}

// ============================================
// EMPLOYEE MANAGEMENT - DELETE
// ============================================

let employeeToDelete = null;

function openConfirmDeleteModal(id) {
    const employee = getEmployeeById(id);
    if (!employee) return;

    employeeToDelete = id;
    document.getElementById('deleteConfirmText').textContent = 
        `Are you sure you want to delete ${employee.name}?`;
    
    ModalManager.show('confirmDeleteModal');
}

function handleDeleteEmployee() {
    if (employeeToDelete === null) return;

    const employees = getEmployees();
    const updatedEmployees = employees.filter(e => e.id !== employeeToDelete);
    saveEmployees(updatedEmployees);

    ModalManager.hide('confirmDeleteModal');
    showSuccessMessage('Employee has been deleted.');
    employeeToDelete = null;
    renderDashboard();
}

// ============================================
// SUCCESS/ERROR MESSAGES
// ============================================

function showSuccessMessage(message) {
    const messageBox = document.createElement('div');
    messageBox.className = 'message-box success';
    messageBox.innerHTML = `<i class="fas fa-check-circle"></i><span>${message}</span>`;
    
    document.body.appendChild(messageBox);
    messageBox.style.position = 'fixed';
    messageBox.style.top = '20px';
    messageBox.style.right = '20px';
    messageBox.style.zIndex = '3000';
    messageBox.style.minWidth = '300px';
    
    setTimeout(() => {
        messageBox.remove();
    }, 3000);
}

function showErrorMessage(message) {
    const messageBox = document.createElement('div');
    messageBox.className = 'message-box error';
    messageBox.innerHTML = `<i class="fas fa-exclamation-circle"></i><span>${message}</span>`;
    
    document.body.appendChild(messageBox);
    messageBox.style.position = 'fixed';
    messageBox.style.top = '20px';
    messageBox.style.right = '20px';
    messageBox.style.zIndex = '3000';
    messageBox.style.minWidth = '300px';
    
    setTimeout(() => {
        messageBox.remove();
    }, 3000);
}

// ============================================
// LOGOUT
// ============================================

function openLogoutModal() {
    ModalManager.show('logoutModal');
}

function handleLogout() {
    ModalManager.hide('logoutModal');
    ModalManager.showLoading();
    
    setTimeout(() => {
        ModalManager.hideLoading();
        showSuccessMessage('You have been logged out successfully.');
        // Redirect to login page
        // window.location.href = 'login.html';
    }, 1000);
}

// ============================================
// EVENT LISTENERS SETUP
// ============================================

function setupEventListeners() {
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderDashboard(btn.dataset.period);
        });
    });

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', openLogoutModal);
    }

    // Add Employee Modal
    const cancelAddBtn = document.getElementById('cancelAddEmployee');
    const submitAddBtn = document.getElementById('submitAddEmployee');
    if (cancelAddBtn) cancelAddBtn.addEventListener('click', () => ModalManager.hide('addEmployeeModal'));
    if (submitAddBtn) submitAddBtn.addEventListener('click', handleAddEmployee);

    // Edit Employee Modal
    const cancelEditBtn = document.getElementById('cancelEditEmployee');
    const submitEditBtn = document.getElementById('submitEditEmployee');
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', () => ModalManager.hide('editEmployeeModal'));
    if (submitEditBtn) submitEditBtn.addEventListener('click', handleEditEmployee);

    // View Employee Modal
    const closeViewBtn = document.getElementById('closeViewEmployee');
    const editFromViewBtn = document.getElementById('editFromView');
    const deleteFromViewBtn = document.getElementById('deleteFromView');
    if (closeViewBtn) closeViewBtn.addEventListener('click', () => ModalManager.hide('viewEmployeeModal'));
    if (editFromViewBtn) editFromViewBtn.addEventListener('click', handleEditFromView);
    if (deleteFromViewBtn) deleteFromViewBtn.addEventListener('click', handleDeleteFromView);

    // Confirm Delete Modal
    const cancelDeleteBtn = document.getElementById('cancelDelete');
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', () => ModalManager.hide('confirmDeleteModal'));
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', handleDeleteEmployee);

    // Logout Modal
    const cancelLogoutBtn = document.getElementById('cancelLogout');
    const confirmLogoutBtn = document.getElementById('confirmLogout');
    if (cancelLogoutBtn) cancelLogoutBtn.addEventListener('click', () => ModalManager.hide('logoutModal'));
    if (confirmLogoutBtn) confirmLogoutBtn.addEventListener('click', handleLogout);

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });

    // Form submission with Enter key
    const addForm = document.getElementById('addEmployeeForm');
    const editForm = document.getElementById('editEmployeeForm');
    
    if (addForm) {
        addForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleAddEmployee();
        });
    }
    
    if (editForm) {
        editForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleEditEmployee();
        });
    }
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeData();
    renderDashboard();
    setupEventListeners();
});

// Export functions for use in HTML onclick attributes (if needed)
window.openAddEmployeeModal = openAddEmployeeModal;
window.openEditEmployeeModal = openEditEmployeeModal;
window.openViewEmployeeModal = openViewEmployeeModal;
window.openConfirmDeleteModal = openConfirmDeleteModal;