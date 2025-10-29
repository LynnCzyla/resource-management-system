
import { supabase } from "../../supabaseClient.js";


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
// DATA SERVICE (Supabase Connected)
// ============================================

class DataService {
    constructor() {
        this.currentUser = this.getCurrentUser();
    }

    getCurrentUser() {
        const user = localStorage.getItem("loggedUser");
        const parsedUser = user ? JSON.parse(user) : null;
        console.log('Current user from localStorage:', parsedUser);
        return parsedUser;
    }

    async getAllRequests() {
        try {
            const { data, error } = await supabase
                .from('resource_requests')
                .select(`
                    *,
                    project:projects(
                        id,
                        name,
                        description,
                        priority,
                        start_date,
                        end_date
                    ),
                    requirement:project_requirements(
                        id,
                        experience_level,
                        quantity_needed,
                        required_skills
                    ),
                    requester:users!resource_requests_requested_by_fkey(
                        id,
                        name,
                        email
                    ),
                    approver:users!resource_requests_approved_by_fkey(
                        id,
                        name
                    )
                `)
                .order('requested_at', { ascending: false });

            if (error) throw error;

            // Transform data to match UI expectations
            return data.map(req => ({
                id: `REQ${String(req.id).padStart(3, '0')}`,
                rawId: req.id,
                projectName: req.project?.name || 'N/A',
                projectId: req.project?.id,
                requester: req.requester?.name || 'N/A',
                requesterEmail: req.requester?.email || 'N/A',
                department: 'N/A',
                position: 'Developer',
                skillsRequired: req.requirement?.required_skills || [],
                experience: this.formatExperienceLevel(req.requirement?.experience_level),
                quantity: req.requirement?.quantity_needed || 1,
                priority: this.capitalize(req.project?.priority || 'medium'),
                startDate: req.project?.start_date || null,
                duration: this.calculateDuration(req.project?.start_date, req.project?.end_date),
                status: req.status,
                submittedDate: req.requested_at,
                notes: req.notes,
                approvedBy: req.approver?.name,
                approvedAt: req.approved_at
            }));
        } catch (error) {
            console.error('Error fetching requests:', error);
            throw error;
        }
    }

    async getRequestById(id) {
        try {
            // Extract raw ID from formatted ID (REQ001 -> 1)
            const rawId = typeof id === 'string' && id.startsWith('REQ') 
                ? parseInt(id.replace('REQ', '')) 
                : id;

            const { data, error } = await supabase
                .from('resource_requests')
                .select(`
                    *,
                    project:projects(
                        id,
                        name,
                        description,
                        priority,
                        start_date,
                        end_date
                    ),
                    requirement:project_requirements(
                        id,
                        experience_level,
                        quantity_needed,
                        required_skills
                    ),
                    requester:users!resource_requests_requested_by_fkey(
                        id,
                        name,
                        email
                    ),
                    approver:users!resource_requests_approved_by_fkey(
                        id,
                        name
                    )
                `)
                .eq('id', rawId)
                .single();

            if (error) throw error;

            return {
                id: `REQ${String(data.id).padStart(3, '0')}`,
                rawId: data.id,
                projectName: data.project?.name || 'N/A',
                projectId: data.project?.id,
                requester: data.requester?.name || 'N/A',
                requesterEmail: data.requester?.email || 'N/A',
                department: 'N/A',
                position: 'Developer',
                skillsRequired: data.requirement?.required_skills || [],
                experience: this.formatExperienceLevel(data.requirement?.experience_level),
                quantity: data.requirement?.quantity_needed || 1,
                priority: this.capitalize(data.project?.priority || 'medium'),
                startDate: data.project?.start_date || null,
                duration: this.calculateDuration(data.project?.start_date, data.project?.end_date),
                status: data.status,
                submittedDate: data.requested_at,
                notes: data.notes,
                approvedBy: data.approver?.name,
                approvedAt: data.approved_at
            };
        } catch (error) {
            console.error('Error fetching request:', error);
            throw error;
        }
    }

    async updateRequestStatus(id, status, notes = null) {
        try {
            // Extract raw ID
            const rawId = typeof id === 'string' && id.startsWith('REQ') 
                ? parseInt(id.replace('REQ', '')) 
                : id;

            console.log('Updating request - Input ID:', id, 'Raw ID:', rawId, 'Status:', status);

            const updateData = {
                status: status,
                approved_by: this.currentUser?.id,
                approved_at: new Date().toISOString()
            };

            if (notes) {
                updateData.notes = notes;
            }

            console.log('Update data:', updateData);

            // First, get the project_id from the request
            const { data: existingRequest, error: fetchError } = await supabase
                .from('resource_requests')
                .select('project_id, id, status')
                .eq('id', rawId)
                .single();

            console.log('Existing request:', existingRequest, 'Fetch error:', fetchError);

            if (fetchError) throw fetchError;

            // Update resource request status
            const { data: requestData, error: requestError } = await supabase
                .from('resource_requests')
                .update(updateData)
                .eq('id', rawId)
                .select();

            console.log('Update result:', requestData, 'Update error:', requestError);

            if (requestError) throw requestError;

            // If approved, update project status to 'ongoing'
            if (status === 'approved' && existingRequest?.project_id) {
                console.log('Updating project status for project ID:', existingRequest.project_id);
                
                const { error: projectError } = await supabase
                    .from('projects')
                    .update({ status: 'ongoing' })
                    .eq('id', existingRequest.project_id);

                if (projectError) {
                    console.error('Error updating project status:', projectError);
                    // Don't throw - request was still approved
                }
            }

            return { success: true, data: requestData };
        } catch (error) {
            console.error('Error updating request status:', error);
            throw error;
        }
    }

    formatExperienceLevel(level) {
        const map = {
            'beginner': 'Junior (1-3 years)',
            'intermediate': 'Mid-level (3-5 years)',
            'advanced': 'Senior (5+ years)'
        };
        return map[level] || level;
    }

    calculateDuration(startDate, endDate) {
        if (!startDate || !endDate) return 'N/A';
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 30) {
            return `${diffDays} days`;
        } else {
            const months = Math.round(diffDays / 30);
            return `${months} month${months > 1 ? 's' : ''}`;
        }
    }

    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// ============================================
// UI MANAGER
// ============================================

class UIManager {
    constructor() {}

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    getPriorityColor(priority) {
        const colors = {
            High: '#D0021B',
            Medium: '#F5A623',
            Low: '#4A90E2'
        };
        return colors[priority] || '#6C757D';
    }

    renderRequests(requests) {
        const container = document.getElementById('requestsList');
        
        if (!container) return;

        if (requests.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6C757D; padding: 40px;">No requests found</p>';
            return;
        }

        const fragment = document.createDocumentFragment();

        requests.forEach(req => {
            const card = this.createRequestCard(req);
            fragment.appendChild(card);
        });

        container.innerHTML = '';
        container.appendChild(fragment);
    }

    createRequestCard(req) {
        const card = document.createElement('div');
        card.className = 'request-card';
        card.dataset.id = req.id;
        card.dataset.rawId = req.rawId;

        const header = this.createRequestHeader(req);
        card.appendChild(header);

        const content = this.createRequestContent(req);
        card.appendChild(content);

        // Always show actions - but different for different statuses
        const actions = this.createRequestActions(req);
        card.appendChild(actions);

        return card;
    }

    createRequestHeader(req) {
        const header = document.createElement('div');
        header.className = 'request-header';

        const info = document.createElement('div');
        info.className = 'request-info';

        const h3 = document.createElement('h3');
        h3.textContent = req.projectName;

        const meta = document.createElement('div');
        meta.className = 'request-meta';
        
        const metaItems = [
            { icon: 'fa-user', text: req.requester },
            { icon: 'fa-building', text: req.department },
            { icon: 'fa-calendar', text: this.formatDate(req.submittedDate) }
        ];

        metaItems.forEach(item => {
            const span = document.createElement('span');
            const icon = document.createElement('i');
            icon.className = `fas ${item.icon}`;
            span.appendChild(icon);
            span.appendChild(document.createTextNode(` ${item.text}`));
            meta.appendChild(span);
        });

        info.appendChild(h3);
        info.appendChild(meta);

        const statusBadge = document.createElement('span');
        statusBadge.className = `status-badge ${req.status}`;
        statusBadge.textContent = this.capitalize(req.status);

        header.appendChild(info);
        header.appendChild(statusBadge);

        return header;
    }

    createRequestContent(req) {
        const content = document.createElement('div');
        content.className = 'request-content';

        const details = document.createElement('div');
        details.className = 'request-details';

        const detailItems = [
            { label: 'Position', value: req.position },
            { label: 'Quantity', value: req.quantity },
            { label: 'Experience', value: req.experience },
            { label: 'Priority', value: req.priority },
            { label: 'Start Date', value: this.formatDate(req.startDate) },
            { label: 'Duration', value: req.duration }
        ];

        detailItems.forEach(item => {
            const detailItem = document.createElement('div');
            detailItem.className = 'detail-item';

            const label = document.createElement('span');
            label.className = 'detail-label';
            label.textContent = item.label;

            const value = document.createElement('span');
            value.className = 'detail-value';
            value.textContent = item.value;

            detailItem.appendChild(label);
            detailItem.appendChild(value);
            details.appendChild(detailItem);
        });

        content.appendChild(details);

        // Skills section
        const skillsSection = document.createElement('div');
        skillsSection.className = 'skills-section';

        const skillsLabel = document.createElement('span');
        skillsLabel.className = 'detail-label';
        skillsLabel.textContent = 'Required Skills:';

        const skillsList = document.createElement('div');
        skillsList.className = 'skills-list';

        req.skillsRequired.forEach(skill => {
            const skillTag = document.createElement('span');
            skillTag.className = 'skill-tag';
            skillTag.textContent = skill;
            skillsList.appendChild(skillTag);
        });

        skillsSection.appendChild(skillsLabel);
        skillsSection.appendChild(skillsList);
        content.appendChild(skillsSection);

        return content;
    }

    createRequestActions(req) {
        const actions = document.createElement('div');
        actions.className = 'request-actions';

        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn-view';
        viewBtn.innerHTML = '<i class="fas fa-eye"></i> View Details';
        viewBtn.onclick = () => window.requestController.viewRequest(req.id);

        actions.appendChild(viewBtn);

        // Only show approve/reject for pending requests
        if (req.status === 'pending') {
            const approveBtn = document.createElement('button');
            approveBtn.className = 'btn-approve';
            approveBtn.innerHTML = '<i class="fas fa-check"></i> Approve';
            approveBtn.onclick = () => window.requestController.openApproveModal(req.id);

            const rejectBtn = document.createElement('button');
            rejectBtn.className = 'btn-reject';
            rejectBtn.innerHTML = '<i class="fas fa-times"></i> Reject';
            rejectBtn.onclick = () => window.requestController.openRejectModal(req.id);

            actions.appendChild(approveBtn);
            actions.appendChild(rejectBtn);
        }

        return actions;
    }
}

// ============================================
// REQUEST CONTROLLER
// ============================================

class RequestController {
    constructor() {
        this.dataService = new DataService();
        this.uiManager = new UIManager();
        this.currentRequestId = null;
        this.currentFilter = '';
    }

    async initialize() {
        // Check if user is logged in
        if (!this.dataService.currentUser) {
            window.location.href = '../index.html';
            return;
        }

        // Check if user is resource manager
        if (this.dataService.currentUser.role !== 'resource_manager') {
            MessageManager.error('Access denied. Resource Manager role required.');
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 2000);
            return;
        }

        this.setupEventListeners();
        await this.loadRequests();
    }

    async loadRequests(filter = '') {
        try {
            ModalManager.showLoading();
            let requests = await this.dataService.getAllRequests();

            // Only show approved requests if explicitly filtered
            if (filter === '') {
                // Default view: Show only pending and rejected (NOT approved)
                requests = requests.filter(req => req.status !== 'approved');
            } else if (filter) {
                // Specific filter selected
                requests = requests.filter(req => req.status === filter);
            }

            this.uiManager.renderRequests(requests);
        } catch (error) {
            MessageManager.error('Failed to load requests');
            console.error(error);
        } finally {
            ModalManager.hideLoading();
        }
    }

    async viewRequest(id) {
        try {
            const request = await this.dataService.getRequestById(id);
            if (!request) {
                MessageManager.error('Request not found');
                return;
            }

            document.getElementById('viewRequestProjectName').textContent = request.projectName;
            document.getElementById('viewRequestRequester').textContent = request.requester;
            document.getElementById('viewRequestDepartment').textContent = request.department;
            document.getElementById('viewRequestPosition').textContent = request.position;
            document.getElementById('viewRequestQuantity').textContent = request.quantity;
            document.getElementById('viewRequestExperience').textContent = request.experience;
            document.getElementById('viewRequestPriority').textContent = request.priority;
            document.getElementById('viewRequestStartDate').textContent = this.uiManager.formatDate(request.startDate);
            document.getElementById('viewRequestDuration').textContent = request.duration;

            const skillsContainer = document.getElementById('viewRequestSkills');
            skillsContainer.innerHTML = '';
            request.skillsRequired.forEach(skill => {
                const badge = document.createElement('span');
                badge.className = 'skill-badge';
                badge.textContent = skill;
                skillsContainer.appendChild(badge);
            });

            ModalManager.show('viewRequestModal');
        } catch (error) {
            MessageManager.error('Failed to load request details');
            console.error(error);
        }
    }

    openApproveModal(id) {
        this.currentRequestId = id;
        ModalManager.show('approveRequestModal');
    }

    openRejectModal(id) {
        this.currentRequestId = id;
        document.getElementById('rejectReason').value = '';
        ModalManager.show('rejectRequestModal');
    }

    async approveRequest() {
        if (!this.currentRequestId) return;

        try {
            ModalManager.hide('approveRequestModal');
            ModalManager.showLoading();

            console.log('Approving request ID:', this.currentRequestId);
            
            const result = await this.dataService.updateRequestStatus(this.currentRequestId, 'approved');
            
            console.log('Approval result:', result);
            
            MessageManager.success('Request approved successfully. Project moved to Projects page.');
            await this.loadRequests(this.currentFilter);
            this.currentRequestId = null;
        } catch (error) {
            MessageManager.error('Failed to approve request: ' + error.message);
            console.error('Approval error:', error);
        } finally {
            ModalManager.hideLoading();
        }
    }

    async rejectRequest() {
        if (!this.currentRequestId) return;

        const reason = document.getElementById('rejectReason').value.trim();

        try {
            ModalManager.hide('rejectRequestModal');
            ModalManager.showLoading();

            await this.dataService.updateRequestStatus(this.currentRequestId, 'rejected', reason);
            
            MessageManager.success('Request rejected');
            await this.loadRequests(this.currentFilter);
            this.currentRequestId = null;
        } catch (error) {
            MessageManager.error('Failed to reject request');
            console.error(error);
        } finally {
            ModalManager.hideLoading();
        }
    }

    handleLogout() {
        ModalManager.show('logoutModal');
    }

    async confirmLogout() {
        ModalManager.hide('logoutModal');
        ModalManager.showLoading();
        
        localStorage.removeItem('loggedUser');
        
        setTimeout(() => {
            ModalManager.hideLoading();
            MessageManager.success('Logged out successfully');
            window.location.href = '../login.html';
        }, 1000);
    }

    setupEventListeners() {
        // Filter
        const filterSelect = document.getElementById('requestStatusFilter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.loadRequests(this.currentFilter);
            });
        }

        // View Request Modal
        const closeViewBtn = document.getElementById('closeViewRequest');
        const closeViewModalBtn = document.getElementById('closeViewRequestModal');
        if (closeViewBtn) {
            closeViewBtn.addEventListener('click', () => ModalManager.hide('viewRequestModal'));
        }
        if (closeViewModalBtn) {
            closeViewModalBtn.addEventListener('click', () => ModalManager.hide('viewRequestModal'));
        }

        // Approve Modal
        const cancelApproveBtn = document.getElementById('cancelApprove');
        const confirmApproveBtn = document.getElementById('confirmApprove');
        if (cancelApproveBtn) {
            cancelApproveBtn.addEventListener('click', () => {
                ModalManager.hide('approveRequestModal');
                this.currentRequestId = null;
            });
        }
        if (confirmApproveBtn) {
            confirmApproveBtn.addEventListener('click', () => this.approveRequest());
        }

        // Reject Modal
        const cancelRejectBtn = document.getElementById('cancelReject');
        const confirmRejectBtn = document.getElementById('confirmReject');
        if (cancelRejectBtn) {
            cancelRejectBtn.addEventListener('click', () => {
                ModalManager.hide('rejectRequestModal');
                this.currentRequestId = null;
            });
        }
        if (confirmRejectBtn) {
            confirmRejectBtn.addEventListener('click', () => this.rejectRequest());
        }

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        const cancelLogoutBtn = document.getElementById('cancelLogout');
        const confirmLogoutBtn = document.getElementById('confirmLogout');
        if (cancelLogoutBtn) {
            cancelLogoutBtn.addEventListener('click', () => ModalManager.hide('logoutModal'));
        }
        if (confirmLogoutBtn) {
            confirmLogoutBtn.addEventListener('click', () => this.confirmLogout());
        }

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
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const controller = new RequestController();
    window.requestController = controller;
    controller.initialize();
});