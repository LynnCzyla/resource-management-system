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
// DATA SERVICE - Ready for Supabase Integration
// ============================================
class ProfileDataService {
    constructor() {
        // TODO: Initialize Supabase client here
        // this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        this.currentEmployeeId = 'EMP001'; // Mock current user
    }

    // Employee Profile Methods
    async getEmployeeProfile() {
        // TODO: Replace with Supabase query
        // const { data, error } = await this.supabase
        //     .from('employees')
        //     .select('*')
        //     .eq('id', this.currentEmployeeId)
        //     .single();
        return this.getMockEmployeeProfile();
    }

    async updateEmployeeProfile(profileData) {
        // TODO: Replace with Supabase mutation
        // const { data, error } = await this.supabase
        //     .from('employees')
        //     .update(profileData)
        //     .eq('id', this.currentEmployeeId);
        console.log('Profile updated:', profileData);
        return { success: true };
    }

    async uploadCV(file) {
        // TODO: Replace with Supabase storage upload + OCR processing
        // const { data, error } = await this.supabase.storage
        //     .from('cvs')
        //     .upload(`${this.currentEmployeeId}/${file.name}`, file);
        // Then trigger OCR processing backend function
        console.log('CV uploaded:', file.name);
        
        // Simulate OCR processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return { 
            success: true, 
            fileName: file.name, 
            fileSize: this.formatFileSize(file.size),
            uploadDate: new Date().toISOString().split('T')[0],
            skills: ['Python', 'JavaScript', 'React', 'Node.js', 'SQL', 'Docker'] 
        };
    }

    async deleteCV(fileName) {
        // TODO: Replace with Supabase storage delete
        // const { data, error } = await this.supabase.storage
        //     .from('cvs')
        //     .remove([`${this.currentEmployeeId}/${fileName}`]);
        console.log('CV deleted:', fileName);
        return { success: true };
    }

    async addSkill(skillData) {
        // TODO: Replace with Supabase insert
        // const { data, error } = await this.supabase
        //     .from('employee_skills')
        //     .insert({ 
        //         employee_id: this.currentEmployeeId, 
        //         skill_name: skillData.name,
        //         proficiency_level: skillData.level 
        //     });
        console.log('Skill added:', skillData);
        return { success: true };
    }

    async removeSkill(skillName) {
        // TODO: Replace with Supabase delete
        // const { data, error } = await this.supabase
        //     .from('employee_skills')
        //     .delete()
        //     .eq('employee_id', this.currentEmployeeId)
        //     .eq('skill_name', skillName);
        console.log('Skill removed:', skillName);
        return { success: true };
    }

    async updateExperience(experienceData) {
        // TODO: Replace with Supabase update
        // const { data, error } = await this.supabase
        //     .from('employees')
        //     .update({ 
        //         experience: experienceData.experience,
        //         role: experienceData.role 
        //     })
        //     .eq('id', this.currentEmployeeId);
        console.log('Experience updated:', experienceData);
        return { success: true };
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Mock Data Methods (Remove these when integrating with Supabase)
    getMockEmployeeProfile() {
        return {
            id: 'EMP001',
            name: 'John Doe',
            role: 'Senior Developer',
            department: 'Engineering',
            email: 'john.doe@company.com',
            joinDate: 'Jan 2020',
            experience: '5 years',
            avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=4A90E2&color=fff',
            skills: [
                { name: 'Python', level: 'Expert' },
                { name: 'JavaScript', level: 'Expert' },
                { name: 'React', level: 'Advanced' },
                { name: 'Node.js', level: 'Advanced' },
                { name: 'SQL', level: 'Intermediate' },
                { name: 'Docker', level: 'Intermediate' }
            ],
            uploadedFiles: [
                { name: 'Resume_2024.pdf', size: '245 KB', uploadDate: '2024-10-15' }
            ]
        };
    }
}

// ============================================
// UI MANAGER CLASS
// ============================================
class ProfileUIManager {
    constructor() {
        this.currentProfile = null;
    }

    showLoading(message = 'Loading...') {
        Swal.fire({
            title: message,
            allowOutsideClick: false,
            allowEscapeKey: false,
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
            confirmButtonColor: '#000000',
            timer: 2000,
            showConfirmButton: true
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
        const headerName = document.getElementById('headerName');
        const headerAvatar = document.getElementById('headerAvatar');
        
        if (headerName) headerName.textContent = profile.name;
        if (headerAvatar) headerAvatar.src = profile.avatar;
    }

    renderProfile(profile) {
        this.currentProfile = profile;
        
        // Update profile header
        const profileName = document.getElementById('profileName');
        const profileRole = document.getElementById('profileRole');
        const profileId = document.getElementById('profileId');
        const profileDept = document.getElementById('profileDept');
        const profileEmail = document.getElementById('profileEmail');
        const profileAvatar = document.getElementById('profileAvatar');
        const totalExperience = document.getElementById('totalExperience');
        const currentPosition = document.getElementById('currentPosition');
        const joinDate = document.getElementById('joinDate');

        if (profileName) profileName.textContent = profile.name;
        if (profileRole) profileRole.textContent = profile.role;
        if (profileId) profileId.textContent = profile.id;
        if (profileDept) profileDept.textContent = profile.department;
        if (profileEmail) profileEmail.textContent = profile.email;
        if (profileAvatar) profileAvatar.src = profile.avatar;
        if (totalExperience) totalExperience.textContent = profile.experience;
        if (currentPosition) currentPosition.textContent = profile.role;
        if (joinDate) joinDate.textContent = profile.joinDate;

        // Render skills
        this.renderSkills(profile.skills);

        // Render uploaded files
        this.renderUploadedFiles(profile.uploadedFiles);
    }

    renderSkills(skills) {
        const container = document.getElementById('skillsGrid');
        
        if (!container) return;

        if (skills.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <i class="fas fa-code"></i>
                    <p>No skills added yet. Click "Add Skill" to get started!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = skills.map(skill => `
            <div class="skill-item">
                <div class="skill-info">
                    <h4>${this.escapeHtml(skill.name)}</h4>
                    <p class="skill-level">${this.escapeHtml(skill.level)}</p>
                </div>
                <button class="skill-remove" onclick="profileApp.removeSkill('${this.escapeHtml(skill.name)}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }

    renderUploadedFiles(files) {
        const container = document.getElementById('uploadedFilesList');
        
        if (!container) return;

        if (!files || files.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = files.map(file => `
            <div class="uploaded-file">
                <div class="file-info">
                    <div class="file-icon">
                        <i class="fas fa-file-pdf"></i>
                    </div>
                    <div class="file-details">
                        <h4>${this.escapeHtml(file.name)}</h4>
                        <p>${this.escapeHtml(file.size)} • Uploaded ${this.formatDate(file.uploadDate)}</p>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="icon-btn" onclick="profileApp.viewFile('${this.escapeHtml(file.name)}')" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="icon-btn" onclick="profileApp.deleteFile('${this.escapeHtml(file.name)}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

// ============================================
// MAIN PROFILE APPLICATION CLASS
// ============================================
class ProfileApp {
    constructor() {
        this.dataService = new ProfileDataService();
        this.uiManager = new ProfileUIManager();
        this.currentProfile = null;
    }

    async init() {
        try {
            await this.loadProfile();
            this.setupEventListeners();
        } catch (error) {
            console.error('Error initializing profile app:', error);
            this.uiManager.showError('Failed to initialize profile');
        }
    }

    setupEventListeners() {
        // CV Upload Events
        this.setupCVUploadEvents();

        // Skill Management Events
        this.setupSkillEvents();

        // Experience Events
        this.setupExperienceEvents();

        // Profile Update
        this.setupProfileUpdateEvents();

        // Logout
        this.setupLogoutEvent();
    }

    setupCVUploadEvents() {
        const cvUploadArea = document.getElementById('cvUploadArea');
        const cvFileInput = document.getElementById('cvFileInput');
        const browseBtn = document.getElementById('browseBtn');

        if (cvUploadArea && cvFileInput) {
            // Click to upload
            cvUploadArea.addEventListener('click', (e) => {
                if (e.target !== browseBtn && !browseBtn.contains(e.target)) {
                    cvFileInput.click();
                }
            });

            // Drag and drop
            cvUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                cvUploadArea.classList.add('drag-over');
            });

            cvUploadArea.addEventListener('dragleave', () => {
                cvUploadArea.classList.remove('drag-over');
            });

            cvUploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                cvUploadArea.classList.remove('drag-over');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleCVUpload(files[0]);
                }
            });

            // File input change
            cvFileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleCVUpload(e.target.files[0]);
                }
            });
        }

        if (browseBtn) {
            browseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                cvFileInput.click();
            });
        }
    }

    setupSkillEvents() {
        const addSkillBtn = document.getElementById('addSkillBtn');
        if (addSkillBtn) {
            addSkillBtn.addEventListener('click', () => this.addSkill());
        }
    }

    setupExperienceEvents() {
        const editExpBtn = document.getElementById('editExperienceBtn');
        if (editExpBtn) {
            editExpBtn.addEventListener('click', () => this.editExperience());
        }
    }

    setupProfileUpdateEvents() {
        const updateBtn = document.getElementById('updateProfileBtn');
        if (updateBtn) {
            updateBtn.addEventListener('click', () => this.updateProfile());
        }
    }

    setupLogoutEvent() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    async loadProfile() {
        try {
            this.uiManager.showLoading('Loading profile...');
            this.currentProfile = await this.dataService.getEmployeeProfile();
            this.uiManager.renderProfile(this.currentProfile);
            this.uiManager.updateHeaderInfo(this.currentProfile);
            this.uiManager.hideLoading();
        } catch (error) {
            this.uiManager.hideLoading();
            console.error('Error loading profile:', error);
            this.uiManager.showError('Failed to load profile');
        }
    }

    async handleCVUpload(file) {
        // Validate file
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        
        if (file.size > maxSize) {
            this.uiManager.showError('File size exceeds 5MB limit');
            return;
        }
        
        if (!allowedTypes.includes(file.type)) {
            this.uiManager.showError('Only PDF, JPG, and PNG files are allowed');
            return;
        }

        try {
            this.uiManager.showLoading('Processing CV with OCR and NLP...');
            const result = await this.dataService.uploadCV(file);
            this.uiManager.hideLoading();
            
            if (result.success) {
                // Add file to uploaded files list
                this.currentProfile.uploadedFiles.push({
                    name: result.fileName,
                    size: result.fileSize,
                    uploadDate: result.uploadDate
                });

                // Show success with extracted skills
                await Swal.fire({
                    icon: 'success',
                    title: 'CV Uploaded Successfully!',
                    html: `
                        <div style="text-align: left; padding: 20px;">
                            <p style="margin-bottom: 16px;">Your CV has been processed using OCR and NLP technology.</p>
                            <p style="font-weight: 600; margin-bottom: 12px;">Extracted Skills:</p>
                            <div class="extracted-skills-container">
                                ${result.skills.map(skill => `
                                    <span class="extracted-skill">${this.uiManager.escapeHtml(skill)}</span>
                                `).join('')}
                            </div>
                            <p style="margin-top: 16px; font-size: 13px; color: #6C757D;">
                                These skills have been automatically detected. You can add them to your profile or manage them manually.
                            </p>
                        </div>
                    `,
                    width: 600,
                    confirmButtonColor: '#000000',
                    confirmButtonText: 'Great!',
                    showCancelButton: true,
                    cancelButtonText: 'Add Skills to Profile',
                    cancelButtonColor: '#4A90E2'
                }).then(async (result) => {
                    if (result.isDismissed) {
                        // Add extracted skills to profile
                        await this.addExtractedSkills(result.skills);
                    }
                });
                
                // Refresh uploaded files list
                this.uiManager.renderUploadedFiles(this.currentProfile.uploadedFiles);
                
                // Clear file input
                const cvFileInput = document.getElementById('cvFileInput');
                if (cvFileInput) cvFileInput.value = '';
            }
        } catch (error) {
            this.uiManager.hideLoading();
            console.error('Error uploading CV:', error);
            this.uiManager.showError('Failed to upload CV. Please try again.');
        }
    }

    async addExtractedSkills(skills) {
        try {
            this.uiManager.showLoading('Adding skills to your profile...');
            
            // Filter out skills that already exist
            const existingSkillNames = this.currentProfile.skills.map(s => s.name.toLowerCase());
            const newSkills = skills.filter(skill => 
                !existingSkillNames.includes(skill.toLowerCase())
            );

            // Add new skills with intermediate level by default
            for (const skillName of newSkills) {
                const skillData = { name: skillName, level: 'Intermediate' };
                await this.dataService.addSkill(skillData);
                this.currentProfile.skills.push(skillData);
            }

            this.uiManager.hideLoading();
            
            if (newSkills.length > 0) {
                this.uiManager.renderSkills(this.currentProfile.skills);
                this.uiManager.showSuccess(`${newSkills.length} skill(s) added to your profile!`);
            } else {
                this.uiManager.showSuccess('All extracted skills already exist in your profile.');
            }
        } catch (error) {
            this.uiManager.hideLoading();
            console.error('Error adding extracted skills:', error);
            this.uiManager.showError('Failed to add skills to profile');
        }
    }

    async addSkill() {
        const { value: formValues } = await Swal.fire({
            title: 'Add New Skill',
            html: `
                <div style="text-align: left;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">Skill Name:</label>
                    <input id="skillName" class="swal2-input" placeholder="e.g., Python" style="width: 90%; margin: 0 0 16px 0;">
                    
                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">Proficiency Level:</label>
                    <select id="skillLevel" class="swal2-input" style="width: 90%; margin: 0;">
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate" selected>Intermediate</option>
                        <option value="Advanced">Advanced</option>
                        <option value="Expert">Expert</option>
                    </select>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#000000',
            cancelButtonColor: '#6C757D',
            confirmButtonText: 'Add Skill',
            preConfirm: () => {
                const skillName = document.getElementById('skillName').value.trim();
                const skillLevel = document.getElementById('skillLevel').value;
                
                if (!skillName) {
                    Swal.showValidationMessage('Please enter a skill name');
                    return false;
                }

                // Check if skill already exists
                const existingSkill = profileApp.currentProfile.skills.find(
                    s => s.name.toLowerCase() === skillName.toLowerCase()
                );
                
                if (existingSkill) {
                    Swal.showValidationMessage('This skill already exists in your profile');
                    return false;
                }
                
                return { name: skillName, level: skillLevel };
            }
        });

        if (formValues) {
            try {
                await this.dataService.addSkill(formValues);
                this.currentProfile.skills.push(formValues);
                this.uiManager.renderSkills(this.currentProfile.skills);
                this.uiManager.showSuccess(`${formValues.name} has been added to your skills`);
            } catch (error) {
                console.error('Error adding skill:', error);
                this.uiManager.showError('Failed to add skill');
            }
        }
    }

    async removeSkill(skillName) {
        const confirmed = await this.uiManager.showConfirmation(
            'Remove Skill',
            `Are you sure you want to remove "${skillName}" from your skills?`
        );

        if (confirmed) {
            try {
                await this.dataService.removeSkill(skillName);
                this.currentProfile.skills = this.currentProfile.skills.filter(
                    s => s.name !== skillName
                );
                this.uiManager.renderSkills(this.currentProfile.skills);
                this.uiManager.showSuccess(`${skillName} has been removed from your skills`);
            } catch (error) {
                console.error('Error removing skill:', error);
                this.uiManager.showError('Failed to remove skill');
            }
        }
    }

    async editExperience() {
        const { value: formValues } = await Swal.fire({
            title: 'Edit Work Experience',
            html: `
                <div style="text-align: left;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">Total Experience:</label>
                    <input id="totalExp" class="swal2-input" value="${this.currentProfile.experience}" placeholder="e.g., 5 years" style="width: 90%; margin: 0 0 16px 0;">
                    
                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">Current Position:</label>
                    <input id="currentPos" class="swal2-input" value="${this.currentProfile.role}" placeholder="e.g., Senior Developer" style="width: 90%; margin: 0;">
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#000000',
            cancelButtonColor: '#6C757D',
            confirmButtonText: 'Save Changes',
            preConfirm: () => {
                const totalExp = document.getElementById('totalExp').value.trim();
                const currentPos = document.getElementById('currentPos').value.trim();
                
                if (!totalExp || !currentPos) {
                    Swal.showValidationMessage('Please fill in all fields');
                    return false;
                }
                
                return {
                    experience: totalExp,
                    role: currentPos
                };
            }
        });

        if (formValues) {
            try {
                await this.dataService.updateExperience(formValues);
                this.currentProfile.experience = formValues.experience;
                this.currentProfile.role = formValues.role;
                
                const totalExperience = document.getElementById('totalExperience');
                const currentPosition = document.getElementById('currentPosition');
                const profileRole = document.getElementById('profileRole');
                
                if (totalExperience) totalExperience.textContent = formValues.experience;
                if (currentPosition) currentPosition.textContent = formValues.role;
                if (profileRole) profileRole.textContent = formValues.role;
                
                this.uiManager.showSuccess('Experience updated successfully');
            } catch (error) {
                console.error('Error updating experience:', error);
                this.uiManager.showError('Failed to update experience');
            }
        }
    }

    async updateProfile() {
        const confirmed = await this.uiManager.showConfirmation(
            'Update Profile',
            'Are you sure you want to save all changes to your profile?'
        );

        if (confirmed) {
            try {
                this.uiManager.showLoading('Updating profile...');
                await this.dataService.updateEmployeeProfile(this.currentProfile);
                this.uiManager.hideLoading();
                this.uiManager.showSuccess('Profile updated successfully!');
            } catch (error) {
                this.uiManager.hideLoading();
                console.error('Error updating profile:', error);
                this.uiManager.showError('Failed to update profile');
            }
        }
    }

    async viewFile(fileName) {
        await Swal.fire({
            title: fileName,
            html: `
                <div style="text-align: center; padding: 20px;">
                    <div class="file-preview-container">
                        <i class="fas fa-file-pdf file-preview-icon"></i>
                        <p class="file-preview-info">File preview will be available when integrated with backend storage.</p>
                    </div>
                    <p style="font-size: 13px; color: #6C757D; margin-top: 16px;">
                        You can download this file or view it in a new tab once the backend integration is complete.
                    </p>
                </div>
            `,
            width: 600,
            confirmButtonColor: '#000000',
            confirmButtonText: 'Close',
            showCancelButton: true,
            cancelButtonText: 'Download',
            cancelButtonColor: '#4A90E2'
        }).then((result) => {
            if (result.isDismissed) {
                // TODO: Implement download functionality
                this.uiManager.showSuccess('Download functionality will be available soon');
            }
        });
    }

    async deleteFile(fileName) {
        const confirmed = await this.uiManager.showConfirmation(
            'Delete File',
            `Are you sure you want to delete "${fileName}"? This action cannot be undone.`
        );

        if (confirmed) {
            try {
                this.uiManager.showLoading('Deleting file...');
                await this.dataService.deleteCV(fileName);
                this.currentProfile.uploadedFiles = this.currentProfile.uploadedFiles.filter(
                    f => f.name !== fileName
                );
                this.uiManager.hideLoading();
                this.uiManager.renderUploadedFiles(this.currentProfile.uploadedFiles);
                this.uiManager.showSuccess('File deleted successfully');
            } catch (error) {
                this.uiManager.hideLoading();
                console.error('Error deleting file:', error);
                this.uiManager.showError('Failed to delete file');
            }
        }
    }

    async logout() {
        const confirmed = await this.uiManager.showConfirmation(
            'Confirm Logout',
            'Are you sure you want to logout?'
        );

        if (confirmed) {
            this.uiManager.showLoading('Logging out...');
            
            // TODO: Add Supabase logout here
            // await this.dataService.supabase.auth.signOut();
            
            setTimeout(() => {
                window.location.href = "/login/HTML_Files/login.html";// Redirect to login page
            }, 1000);
        }
    }
}

// ============================================
// INITIALIZE APPLICATION
// ============================================
let profileApp;

document.addEventListener('DOMContentLoaded', () => {
    profileApp = new ProfileApp();
    profileApp.init();
});