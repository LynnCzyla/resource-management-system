// RESOURCE MANAGEMENT (RM) request.js

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
                        priority
                    ),
                    requirement:project_requirements(
                        id,
                        experience_level,
                        quantity_needed,
                        required_skills,
                        preferred_assignment_type
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

            console.log('Raw data from Supabase:', data);

            // Group requests by project
            const groupedByProject = {};

            data.forEach(req => {
                // Parse notes to get project metadata
                let projectMetadata = null;
                let resourceDetails = null;
                
                try {
                    const parsed = JSON.parse(req.notes);
                    if (parsed.projectName) {
                        projectMetadata = parsed;
                        resourceDetails = parsed.resourceDetails;
                    }
                } catch (e) {
                    console.warn(`Non-JSON notes for request ${req.id}`);
                }

                // FIX: Use projectName as the primary grouping key for new projects
                const projectName = projectMetadata?.projectName || req.project?.name || 'Unknown Project';
                const submissionTimestamp = new Date(req.requested_at).getTime();
                
                // FIX: Group by requestGroupId if available, otherwise by projectName for new projects, or project_id for existing
                let groupKey;
                if (projectMetadata?.requestGroupId) {
                    // Extract base part of requestGroupId (remove the index suffix)
                    // "PM5_1762933052680_0" → "PM5_1762933052680"
                    const match = projectMetadata.requestGroupId.match(/^(.+)_\d+$/);
                    groupKey = match ? match[1] : projectMetadata.requestGroupId;
                } else if (req.project_id) {
                    groupKey = `existing_project_${req.project_id}`;
                } else {
                    // For new projects, group by project name + requester + submission minute
                    const submissionMinute = Math.floor(submissionTimestamp / 60000);
                    groupKey = `new_${projectName}_${req.requested_by}_${submissionMinute}`;
                }

                console.log(`Request ${req.id}: groupKey="${groupKey}", projectName="${projectName}"`);

                if (!groupedByProject[groupKey]) {
                    groupedByProject[groupKey] = {
                        id: `REQ${String(req.id).padStart(3, '0')}`,
                        firstRawId: req.id,
                        projectName: projectName,
                        projectId: req.project?.id || null,
                        projectDescription: projectMetadata?.projectDescription || req.project?.description || 'No description available',
                        requester: req.requester?.name || 'N/A',
                        requesterEmail: req.requester?.email || 'N/A',
                        requestedBy: req.requested_by,
                        priority: this.capitalize(projectMetadata?.priority || req.project?.priority || 'medium'),
                        startDate: projectMetadata?.startDate || req.start_date || null,
                        endDate: projectMetadata?.endDate || req.end_date || null,
                        durationDays: projectMetadata?.durationDays || req.duration_days || 0,
                        status: req.status,
                        submittedDate: req.requested_at,
                        approvedBy: req.approver?.name,
                        approvedAt: req.approved_at,
                        projectMetadata: projectMetadata,
                        // Array to hold multiple requirements
                        requirements: [],
                        requestIds: []
                    };
                }

                // Add requirement to the group
                const skills = resourceDetails?.skills || req.requirement?.required_skills || [];
                const quantity = resourceDetails?.quantity || req.requirement?.quantity_needed || 1;
                const justification = resourceDetails?.justification || '';

                groupedByProject[groupKey].requirements.push({
                    requestId: req.id,
                    quantity: quantity,
                    experienceLevel: resourceDetails?.skillLevel || req.requirement?.experience_level,
                    assignmentType: resourceDetails?.assignmentType || req.requirement?.preferred_assignment_type || 'Full-Time',
                    skills: skills,
                    notes: justification
                });

                groupedByProject[groupKey].requestIds.push(req.id);
            });

            console.log('Grouped by project:', groupedByProject);

            // Convert grouped object to array
            const result = Object.values(groupedByProject).map(group => {
                // Calculate totals
                const totalResources = group.requirements.reduce((sum, req) => sum + req.quantity, 0);
                const allSkills = [...new Set(group.requirements.flatMap(req => req.skills))];

                return {
                    ...group,
                    totalResources,
                    allSkills,
                    duration: this.formatDuration(group.durationDays)
                };
            });

            console.log('Final result:', result);

            return result;
        } catch (error) {
            console.error('Error fetching requests:', error);
            throw error;
        }
    }

    async getRequestById(id) {
        // For grouped requests, id is the display ID (e.g., "REQ001")
        const requests = await this.getAllRequests();
        const request = requests.find(r => r.id === id);
        return request;
    }

    async approveRequestAndCreateProject(groupedRequest) {
        try {
            console.log('Approving grouped request:', groupedRequest);

            // Check if this is a new project request
            if (groupedRequest.projectMetadata) {
                console.log('New project request detected, creating project...');
                
                // Create the project
                const { data: newProject, error: projectError } = await supabase
                    .from('projects')
                    .insert({
                        name: groupedRequest.projectMetadata.projectName,
                        description: groupedRequest.projectMetadata.projectDescription || null,
                        start_date: groupedRequest.projectMetadata.startDate,
                        end_date: groupedRequest.projectMetadata.endDate,
                        duration_days: groupedRequest.projectMetadata.durationDays,
                        priority: groupedRequest.projectMetadata.priority,
                        status: 'ongoing',
                        created_by: groupedRequest.requestedBy
                    })
                    .select()
                    .single();

                if (projectError) {
                    console.error('Error creating project:', projectError);
                    throw projectError;
                }

                console.log('Project created:', newProject);

                // Create project requirements and update resource requests in batch
                const requirementPromises = groupedRequest.requirements.map(async (requirement) => {
                    // Create project requirement
                    const { data: reqData, error: reqError } = await supabase
                        .from('project_requirements')
                        .insert({
                            project_id: newProject.id,
                            experience_level: requirement.experienceLevel,
                            quantity_needed: requirement.quantity,
                            required_skills: requirement.skills,
                            preferred_assignment_type: requirement.assignmentType
                        })
                        .select()
                        .single();

                    if (reqError) {
                        console.error('Error creating requirement:', reqError);
                        throw reqError;
                    }

                    // Update the resource request
                    const { error: updateError } = await supabase
                        .from('resource_requests')
                        .update({
                            project_id: newProject.id,
                            requirement_id: reqData.id,
                            status: 'approved',
                            approved_by: this.currentUser?.id,
                            approved_at: new Date().toISOString(),
                            notes: requirement.notes || 'Approved'
                        })
                        .eq('id', requirement.requestId);

                    if (updateError) {
                        console.error('Error updating request:', updateError);
                        throw updateError;
                    }

                    return reqData;
                });

                await Promise.all(requirementPromises);

                return { 
                    success: true, 
                    projectCreated: true,
                    projectId: newProject.id,
                    projectName: newProject.name
                };
            } else {
                // Existing project - just update status for all requests
                const updatePromises = groupedRequest.requestIds.map(reqId => 
                    supabase
                        .from('resource_requests')
                        .update({
                            status: 'approved',
                            approved_by: this.currentUser?.id,
                            approved_at: new Date().toISOString()
                        })
                        .eq('id', reqId)
                );

                const results = await Promise.all(updatePromises);
                
                // Check for errors
                const hasError = results.some(result => result.error);
                if (hasError) {
                    throw new Error('Failed to update some requests');
                }

                // Update project status if it exists
                if (groupedRequest.projectId) {
                    await supabase
                        .from('projects')
                        .update({ status: 'ongoing' })
                        .eq('id', groupedRequest.projectId);
                }

                return { 
                    success: true, 
                    projectCreated: false
                };
            }
        } catch (error) {
            console.error('Error approving request:', error);
            throw error;
        }
    }

    async rejectGroupedRequest(groupedRequest, reason) {
        try {
            // Reject all requests in the group in batch
            const rejectPromises = groupedRequest.requestIds.map(reqId => 
                supabase
                    .from('resource_requests')
                    .update({
                        status: 'rejected',
                        approved_by: this.currentUser?.id,
                        approved_at: new Date().toISOString(),
                        notes: reason || 'Rejected'
                    })
                    .eq('id', reqId)
            );

            const results = await Promise.all(rejectPromises);
            
            // Check for errors
            const hasError = results.some(result => result.error);
            if (hasError) {
                throw new Error('Failed to reject some requests');
            }

            return { success: true };
        } catch (error) {
            console.error('Error rejecting requests:', error);
            throw error;
        }
    }

    formatExperienceLevel(level) {
        const map = {
            'beginner': 'Beginner',
            'intermediate': 'Intermediate',
            'advanced': 'Advanced'
        };
        return map[level] || level;
    }

    formatDuration(durationDays) {
        if (!durationDays || durationDays === 0) return 'N/A';
        
        if (durationDays < 30) {
            return `${durationDays} days`;
        } else {
            const months = Math.round(durationDays / 30);
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
        card.dataset.rawId = req.firstRawId;

        card.innerHTML = document.getElementById('requestCardTemplate').innerHTML;
        this.populateRequestCard(card, req);

        return card;
    }

    populateRequestCard(card, req) {
        const statusClass = req.status.toLowerCase();
        const statusDisplay = this.capitalize(req.status);

        card.querySelector('.request-project-name').textContent = req.projectName;
        card.querySelector('.meta-project').textContent = req.projectName;
        card.querySelector('.meta-requester').textContent = req.requester;
        card.querySelector('.meta-date').textContent = this.formatDate(req.submittedDate);
        card.querySelector('.meta-resources').textContent = `${req.totalResources} Resource${req.totalResources !== 1 ? 's' : ''}`;

        const statusElem = card.querySelector('.request-status');
        statusElem.textContent = statusDisplay;
        statusElem.className = `request-status ${statusClass}`;

        const skillsContainer = card.querySelector('.skills-tags');
        skillsContainer.innerHTML = '';
        req.allSkills.slice(0, 3).forEach(skill => {
            const tag = document.createElement('span');
            tag.className = 'skill-tag';
            tag.textContent = skill;
            skillsContainer.appendChild(tag);
        });
        if (req.allSkills.length > 3) {
            const more = document.createElement('span');
            more.className = 'skill-tag-more';
            more.textContent = `+${req.allSkills.length - 3} more`;
            skillsContainer.appendChild(more);
        }

        card.querySelector('.timeline-value').textContent = `${this.formatDate(req.startDate)} - ${this.formatDate(req.endDate)}`;
        card.querySelector('.duration-value').textContent = `${req.durationDays} days`;
        card.querySelector('.start-date-value').textContent = this.formatDate(req.startDate);
        card.querySelector('.end-date-value').textContent = this.formatDate(req.endDate);

        // Set up action buttons
        const viewBtn = card.querySelector('.btn-view');
        viewBtn.onclick = () => window.requestController.viewRequest(req.id);

        const approveBtn = card.querySelector('.btn-approve');
        const rejectBtn = card.querySelector('.btn-reject');

        if (req.status === 'pending') {
            approveBtn.style.display = '';
            rejectBtn.style.display = '';
            approveBtn.onclick = () => window.requestController.openApproveModal(req.id);
            rejectBtn.onclick = () => window.requestController.openRejectModal(req.id);
        } else {
            approveBtn.style.display = 'none';
            rejectBtn.style.display = 'none';
        }
    }
}

// ============================================
// REQUEST CONTROLLER
// ============================================

class RequestController {
    constructor() {
        this.dataService = new DataService();
        this.uiManager = new UIManager();
        this.currentRequest = null;
        this.currentFilter = '';
    }

    async initialize() {
        if (!this.dataService.currentUser) {
            window.location.href = '../index.html';
            return;
        }

        if (this.dataService.currentUser.role !== 'resource_manager') {
            MessageManager.error('Access denied. Resource Manager role required.');
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 2000);
            return;
        }
        await updateUserNameDisplayEnhanced();

        this.setupEventListeners();
        await this.loadRequests();
    }

    async loadRequests(filter = '') {
        try {
            ModalManager.showLoading();
            let requests = await this.dataService.getAllRequests();

            if (filter === '') {
                // Show all pending and rejected (hide approved by default)
                requests = requests.filter(req => req.status !== 'approved');
            } else if (filter) {
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
            ModalManager.showLoading();
            const request = await this.dataService.getRequestById(id);
            
            if (!request) {
                MessageManager.error('Request not found');
                return;
            }

            document.getElementById('detailProjectName').textContent = request.projectName;
            document.getElementById('detailProjectDesc').textContent = request.projectDescription;
            
            const statusElem = document.getElementById('detailStatus');
            statusElem.textContent = this.capitalize(request.status);
            statusElem.className = `request-status ${request.status.toLowerCase()}`;
            
            document.getElementById('detailSubmitted').textContent = this.uiManager.formatDate(request.submittedDate);
            
            const approvedRow = document.getElementById('detailApprovedRow');
            if (request.approvedAt) {
                approvedRow.style.display = '';
                document.getElementById('detailApproved').textContent = this.uiManager.formatDate(request.approvedAt);
            } else {
                approvedRow.style.display = 'none';
            }
            
            document.getElementById('detailStartDate').textContent = this.uiManager.formatDate(request.startDate);
            document.getElementById('detailEndDate').textContent = this.uiManager.formatDate(request.endDate);
            document.getElementById('detailDuration').textContent = `${request.durationDays} days`;
            
            // Populate Requirements Table with ALL requirements
            const tbody = document.getElementById('requirementsTableBody');
            tbody.innerHTML = '';
            
            request.requirements.forEach(req => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${req.quantity}</td>
                    <td>${this.capitalize(req.experienceLevel || 'N/A')}</td>
                    <td>${req.assignmentType || 'Full-Time'}</td>
                    <td>
                        <div class="skills-tags">
                            ${req.skills.map(skill => 
                                `<span class="skill-tag">${skill}</span>`
                            ).join('')}
                        </div>
                    </td>
                    <td>${req.notes || '-'}</td>
                `;
                tbody.appendChild(row);
            });

            // Populate Additional Notes section
            const notesElem = document.getElementById('detailNotes');
            const additionalNotes = request.requirements
                .filter(req => req.notes && req.notes.trim())
                .map((req, idx) => `${idx + 1}. ${req.notes}`)
                .join('\n');
            
            if (additionalNotes) {
                notesElem.textContent = additionalNotes;
                notesElem.style.whiteSpace = 'pre-line';
            } else {
                notesElem.textContent = 'No additional notes provided.';
            }
            
            ModalManager.hideLoading();
            ModalManager.show('requestDetailModal');
        } catch (error) {
            ModalManager.hideLoading();
            MessageManager.error('Failed to load request details');
            console.error(error);
        }
    }

    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    async openApproveModal(id) {
        const request = await this.dataService.getRequestById(id);
        this.currentRequest = request;
        ModalManager.show('approveRequestModal');
    }

    async openRejectModal(id) {
        const request = await this.dataService.getRequestById(id);
        this.currentRequest = request;
        document.getElementById('rejectReason').value = '';
        ModalManager.show('rejectRequestModal');
    }

    async approveRequest() {
        if (!this.currentRequest) return;

        try {
            ModalManager.hide('approveRequestModal');
            ModalManager.showLoading();

            console.log('Approving request:', this.currentRequest);
            
            const result = await this.dataService.approveRequestAndCreateProject(this.currentRequest);
            
            console.log('Approval result:', result);
            
            if (result.projectCreated) {
                MessageManager.success(`Request approved! Project "${result.projectName}" created and moved to Projects page.`);
            } else {
                MessageManager.success('Request approved successfully.');
            }
            
            await this.loadRequests(this.currentFilter);
            this.currentRequest = null;
        } catch (error) {
            MessageManager.error('Failed to approve request: ' + error.message);
            console.error('Approval error:', error);
        } finally {
            ModalManager.hideLoading();
        }
    }

    async rejectRequest() {
        if (!this.currentRequest) return;

        const reason = document.getElementById('rejectReason').value.trim();

        try {
            ModalManager.hide('rejectRequestModal');
            ModalManager.showLoading();

            await this.dataService.rejectGroupedRequest(this.currentRequest, reason);
            
            MessageManager.success('Request rejected');
            await this.loadRequests(this.currentFilter);
            this.currentRequest = null;
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
            window.location.href = '/login/HTML_Files/login.html';
        }, 1000);
    }

    setupEventListeners() {
        const filterSelect = document.getElementById('requestStatusFilter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.loadRequests(this.currentFilter);
            });
        }

        const closeDetailBtn = document.getElementById('closeDetailModal');
        const closeDetailBtnAlt = document.getElementById('closeDetailBtn');
        if (closeDetailBtn) {
            closeDetailBtn.addEventListener('click', () => ModalManager.hide('requestDetailModal'));
        }
        if (closeDetailBtnAlt) {
            closeDetailBtnAlt.addEventListener('click', () => ModalManager.hide('requestDetailModal'));
        }

        const cancelApproveBtn = document.getElementById('cancelApprove');
        const confirmApproveBtn = document.getElementById('confirmApprove');
        if (cancelApproveBtn) {
            cancelApproveBtn.addEventListener('click', () => {
                ModalManager.hide('approveRequestModal');
                this.currentRequest = null;
            });
        }
        if (confirmApproveBtn) {
            confirmApproveBtn.addEventListener('click', () => this.approveRequest());
        }

        const cancelRejectBtn = document.getElementById('cancelReject');
        const confirmRejectBtn = document.getElementById('confirmReject');
        if (cancelRejectBtn) {
            cancelRejectBtn.addEventListener('click', () => {
                ModalManager.hide('rejectRequestModal');
                this.currentRequest = null;
            });
        }
        if (confirmRejectBtn) {
            confirmRejectBtn.addEventListener('click', () => this.rejectRequest());
        }

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