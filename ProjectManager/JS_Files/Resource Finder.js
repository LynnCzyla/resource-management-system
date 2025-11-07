// ============================================
// UTILITY FUNCTIONS
// ============================================

// Modal Manager
const ModalManager = {
    show(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    },

    hide(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },

    showLoading() {
        this.show('loadingOverlay');
    },

    hideLoading() {
        this.hide('loadingOverlay');
    }
};

// Message Manager
const MessageManager = {
    show(message, type = 'info') {
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
    },

    success(message) {
        this.show(message, 'success');
    },

    error(message) {
        this.show(message, 'error');
    },

    warning(message) {
        this.show(message, 'warning');
    },

    info(message) {
        this.show(message, 'info');
    }
};

// Debounce utility
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
// MAIN APP
// ============================================

const ResourceFinderApp = {
    allCards: [],

    init() {
        this.cacheElements();
        this.setupEventListeners();
        this.populateSkillFilter();
    },

    cacheElements() {
        this.allCards = Array.from(document.querySelectorAll('.resource-card'));
    },

    setupEventListeners() {
        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.openLogoutModal());
        }

        // Search
        const searchInput = document.getElementById('resourceSearch');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(() => this.filterResources(), 300));
        }

        // Filters
        const skillFilter = document.getElementById('skillFilter');
        const deptFilter = document.getElementById('departmentFilter');
        const availFilter = document.getElementById('availabilityFilter');

        if (skillFilter) {
            skillFilter.addEventListener('change', () => this.filterResources());
        }
        if (deptFilter) {
            deptFilter.addEventListener('change', () => this.filterResources());
        }
        if (availFilter) {
            availFilter.addEventListener('change', () => this.filterResources());
        }

        // AI Recommendations
        const aiBtn = document.getElementById('getRecommendationsBtn');
        if (aiBtn) {
            aiBtn.addEventListener('click', () => ModalManager.show('aiModal'));
        }

        // AI Modal
        const closeAiModal = document.getElementById('closeAiModal');
        const cancelAiBtn = document.getElementById('cancelAiBtn');
        const getAiBtn = document.getElementById('getAiBtn');

        if (closeAiModal) {
            closeAiModal.addEventListener('click', () => ModalManager.hide('aiModal'));
        }
        if (cancelAiBtn) {
            cancelAiBtn.addEventListener('click', () => ModalManager.hide('aiModal'));
        }
        if (getAiBtn) {
            getAiBtn.addEventListener('click', () => this.getAIRecommendations());
        }

        // Profile Modal
        const closeProfileModal = document.getElementById('closeProfileModal');
        const closeProfileBtn = document.getElementById('closeProfileBtn');

        if (closeProfileModal) {
            closeProfileModal.addEventListener('click', () => ModalManager.hide('profileModal'));
        }
        if (closeProfileBtn) {
            closeProfileBtn.addEventListener('click', () => ModalManager.hide('profileModal'));
        }

        // Logout Modal
        const cancelLogout = document.getElementById('cancelLogout');
        const confirmLogout = document.getElementById('confirmLogout');

        if (cancelLogout) {
            cancelLogout.addEventListener('click', () => ModalManager.hide('logoutModal'));
        }
        if (confirmLogout) {
            confirmLogout.addEventListener('click', () => this.handleLogout());
        }

        // Profile buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-profile')) {
                const card = e.target.closest('.resource-card');
                this.viewProfile(card);
            }
        });

        // Request buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-request')) {
                const card = e.target.closest('.resource-card');
                const name = card.dataset.name;
                this.requestResource(name);
            }
        });

        // Close modals on overlay click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        });
    },

    populateSkillFilter() {
        const skillFilter = document.getElementById('skillFilter');
        const allSkills = new Set();

        this.allCards.forEach(card => {
            const skills = card.dataset.skills.split(',');
            skills.forEach(skill => allSkills.add(skill.trim()));
        });

        const sortedSkills = Array.from(allSkills).sort();
        
        skillFilter.innerHTML = '<option value="">All Skills</option>' + 
            sortedSkills.map(skill => `<option value="${skill}">${skill}</option>`).join('');
    },

    filterResources() {
        const searchQuery = document.getElementById('resourceSearch').value.toLowerCase().trim();
        const skillFilter = document.getElementById('skillFilter').value.toLowerCase().trim();
        const deptFilter = document.getElementById('departmentFilter').value;
        const availFilter = document.getElementById('availabilityFilter').value;

        let visibleCount = 0;

        this.allCards.forEach(card => {
            const name = card.dataset.name.toLowerCase();
            const role = card.dataset.role.toLowerCase();
            const skills = card.dataset.skills.toLowerCase().split(',');
            const availability = card.dataset.availability;

            // Search matching
            const matchesSearch = !searchQuery || 
                name.includes(searchQuery) ||
                role.includes(searchQuery) ||
                skills.some(s => s.trim().includes(searchQuery));

            // Skill filter
            const matchesSkill = !skillFilter || skills.some(s => s.trim().includes(skillFilter));

            // Department filter - improved mapping
            let matchesDept = true;
            if (deptFilter) {
                const departmentMap = {
                    'Engineering': ['developer', 'engineer'],
                    'Design': ['designer', 'design'],
                    'Quality Assurance': ['qa', 'quality', 'engineer'],
                    'DevOps': ['devops']
                };
                const deptKeywords = departmentMap[deptFilter] || [];
                matchesDept = deptKeywords.some(keyword => role.includes(keyword));
            }

            // Availability filter
            const matchesAvail = !availFilter || availability === availFilter;

            // Show/hide card
            if (matchesSearch && matchesSkill && matchesDept && matchesAvail) {
                card.style.display = '';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Update count
        const resultsCount = document.getElementById('resultsCount');
        if (resultsCount) {
            resultsCount.textContent = `${visibleCount} employee${visibleCount !== 1 ? 's' : ''} found`;
        }

        // Show empty state if no results
        const grid = document.getElementById('resourcesGrid');
        let emptyState = grid.querySelector('.empty-state');
        
        if (visibleCount === 0) {
            if (!emptyState) {
                emptyState = document.createElement('div');
                emptyState.className = 'empty-state';
                emptyState.style.gridColumn = '1/-1';
                emptyState.innerHTML = `
                    <i class="fas fa-user-slash"></i>
                    <h3>No Resources Found</h3>
                    <p>Try adjusting your search criteria</p>
                `;
                grid.appendChild(emptyState);
            }
        } else if (emptyState) {
            emptyState.remove();
        }
    },

    getAIRecommendations() {
        const skills = document.getElementById('aiSkills').value.trim();
        const projectType = document.getElementById('aiProjectType').value;

        if (!skills) {
            MessageManager.error('Please enter required skills');
            return;
        }

        ModalManager.hide('aiModal');
        ModalManager.showLoading();

        // Simulate AI processing
        setTimeout(() => {
            ModalManager.hideLoading();
            
            const skillsArray = skills.toLowerCase().split(',').map(s => s.trim());
            
            // Filter and score cards based on skill match
            const recommendations = [];
            
            this.allCards.forEach(card => {
                const cardSkills = card.dataset.skills.toLowerCase().split(',');
                
                // Calculate match score
                const matchingSkills = skillsArray.filter(skill => 
                    cardSkills.some(cs => cs.trim().includes(skill))
                );
                
                if (matchingSkills.length > 0) {
                    const matchScore = Math.round((matchingSkills.length / skillsArray.length) * 100);
                    recommendations.push({ card, matchScore });
                }
            });

            // Sort by match score
            recommendations.sort((a, b) => b.matchScore - a.matchScore);

            // Show/hide cards and add AI badges (no HTML rendering in JS, just class manipulation)
            this.allCards.forEach(card => {
                card.style.display = 'none';
                card.classList.remove('ai-recommended');
                const existingBadge = card.querySelector('.ai-badge');
                if (existingBadge) existingBadge.remove();
            });

            if (recommendations.length === 0) {
                MessageManager.warning('No matching employees found. Try adjusting your requirements.');
                this.allCards.forEach(card => card.style.display = '');
            } else {
                recommendations.forEach(({ card, matchScore }) => {
                    card.style.display = '';
                    card.classList.add('ai-recommended');
                    
                    // Add AI badge (predefined in HTML or CSS, no dynamic HTML creation)
                    const badge = document.createElement('span');
                    badge.className = 'ai-badge';
                    badge.textContent = `${matchScore}% Match`;
                    card.insertBefore(badge, card.firstChild);
                });

                MessageManager.success(`Found ${recommendations.length} recommended employee${recommendations.length !== 1 ? 's' : ''}`);
                
                // Update title and count
                document.getElementById('resultsTitle').textContent = 'AI Recommendations';
                document.getElementById('resultsCount').textContent = 
                    `${recommendations.length} employee${recommendations.length !== 1 ? 's' : ''} found`;
            }

            // Reset form
            document.getElementById('aiSkills').value = '';
        }, 1500);
    },

    viewProfile(card) {
        const name = card.dataset.name;
        const role = card.dataset.role;
        const avatar = card.querySelector('.resource-avatar').src;
        const availBadge = card.querySelector('.availability-badge');
        const availText = availBadge.textContent.trim();
        const skills = card.dataset.skills.split(',');

        // Determine department from role
        let department = 'Engineering';
        if (role.toLowerCase().includes('design')) department = 'Design';
        else if (role.toLowerCase().includes('qa') || role.toLowerCase().includes('quality')) department = 'Quality Assurance';
        else if (role.toLowerCase().includes('devops')) department = 'DevOps';

        // Determine availability color
        let availColor = '#6C757D';
        if (availBadge.classList.contains('available')) availColor = '#7ED321';
        else if (availBadge.classList.contains('partial')) availColor = '#F5A623';
        else if (availBadge.classList.contains('busy')) availColor = '#D0021B';

        // Populate modal (no dynamic HTML rendering, just text updates)
        document.getElementById('profileName').textContent = name;
        document.getElementById('profileContent').innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <img src="${avatar}" alt="${name}" 
                     style="width: 100px; height: 100px; border-radius: 50%; border: 3px solid #000;">
            </div>
            <p><strong>Role:</strong> ${role}</p>
            <p><strong>Department:</strong> ${department}</p>
            <p><strong>Experience:</strong> ${Math.floor(Math.random() * 5) + 2} years</p>
            <p><strong>Current Workload:</strong> ${availText.match(/\d+/)?.[0] || 0}h/day</p>
            <p><strong>Availability:</strong> 
                <span style="color: ${availColor}">
                    ${availText.split('(')[0].trim()}
                </span>
            </p>
            <div style="margin-top: 15px;">
                <strong>Skills:</strong>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
                    ${skills.map(skill => 
                        `<span style="padding: 6px 12px; background-color: #E9ECEF; border-radius: 4px; font-size: 12px;">${skill.trim()}</span>`
                    ).join('')}
                </div>
            </div>
        `;

        ModalManager.show('profileModal');
    },

    requestResource(name) {
        // Navigate to Resource Requests page
        MessageManager.info(`Redirecting to Resource Requests page for ${name}...`);
        setTimeout(() => {
            window.location.href = 'Resource Requests.html';
        }, 1000);
    },

    openLogoutModal() {
        ModalManager.show('logoutModal');
    },

    handleLogout() {
        ModalManager.hide('logoutModal');
        ModalManager.showLoading();
        
        setTimeout(() => {
            ModalManager.hideLoading();
            MessageManager.success('You have been logged out successfully.');
            setTimeout(() => {
                window.location.href = "/login/HTML_Files/login.html"; 
            }, 1000);
        }, 1000);
    }
};

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    ResourceFinderApp.init();
});