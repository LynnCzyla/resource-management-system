import { supabase } from "../../supabaseClient.js";
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
// ============================================
// DATA SERVICE - Ready for Supabase Integration
// ============================================
class ProfileDataService {
    constructor() {
        this.supabase = supabase;
        this.currentUserId = null;
        this.bucketName = 'cvs';
        this.profileCache = null; // Add caching
        this.cacheTimestamp = null;
        this.CACHE_DURATION = 30000; // 30 seconds cache
    }

    // ADD THIS MISSING METHOD
    setCurrentUser(userId) {
        this.currentUserId = userId;
    }

    // ADD THIS MISSING METHOD
    async getEmployeeFolderId() {
        if (!this.currentUserId) throw new Error('No logged-in user ID set');
    
        const { data, error } = await supabase
            .from('user_details')
            .select('employee_id')
            .eq('user_id', this.currentUserId)
            .single();
    
        if (error) {
            console.error('Error fetching employee ID:', error);
            throw error;
        }
    
        return data.employee_id;
    }

    // ADD THIS MISSING METHOD
    async uploadProfilePicture(file) {
        try {
            const { data: userDetails, error: detailsError } = await this.supabase
                .from('user_details')
                .select('employee_id')
                .eq('user_id', this.currentUserId)
                .single();

            if (detailsError) throw detailsError;

            const employeeId = userDetails.employee_id || `EMP${this.currentUserId}`;

            // Upload file to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${employeeId}-${Date.now()}.${fileExt}`;
            
            const { data: uploadData, error: uploadError } = await this.supabase.storage
                .from('profile-pictures')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = this.supabase.storage
                .from('profile-pictures')
                .getPublicUrl(fileName);

            // Update user_details table with new profile_pic URL
            const { error: updateError } = await this.supabase
                .from('user_details')
                .update({ profile_pic: publicUrl })
                .eq('user_id', this.currentUserId);

            if (updateError) throw updateError;

            return { success: true, url: publicUrl };
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            throw error;
        }
    }

    // ADD THIS MISSING METHOD
    async removeSkill(skillName) {
        if (!this.currentUserId) throw new Error('No logged-in user ID');
    
        // 1. Fetch current skills
        const { data, error: fetchError } = await this.supabase
            .from('user_details')
            .select('skills')
            .eq('user_id', this.currentUserId)
            .single();
    
        if (fetchError) throw fetchError;
    
        // 2. Remove the skill from array
        const updatedSkills = (data.skills || []).filter(s => s.toLowerCase() !== skillName.toLowerCase());
    
        // 3. Update Supabase
        const { error: updateError } = await this.supabase
            .from('user_details')
            .update({ skills: updatedSkills })
            .eq('user_id', this.currentUserId);
    
        if (updateError) throw updateError;
    
        console.log('Skill removed:', skillName);
        return { success: true };
    }

    // ADD THIS MISSING METHOD
    async updateExperience(experienceData) {
        if (!this.currentUserId) throw new Error('No logged-in user ID');
    
        const { error } = await this.supabase
            .from('user_details')
            .update({
                experience_level: experienceData.level,
                job_title: experienceData.role
            })
            .eq('user_id', this.currentUserId);
    
        if (error) throw error;
    
        console.log('Experience updated in DB:', experienceData);
        return { success: true };
    }

    // ADD THIS MISSING METHOD
    async deleteCV(fileName) {
        if (!this.currentUserId) throw new Error('No logged-in user ID');
    
        try {
            const employeeId = await this.getEmployeeFolderId();
            
            // List files to find the exact file to delete
            const { data: files, error: listError } = await this.supabase.storage
                .from(this.bucketName)
                .list(employeeId);
            
            if (listError) throw listError;

            // Find the file - we need to match by the original name stored in the object
            const fileToDelete = files.find(f => {
                return f.name.includes(fileName) || f.name === fileName;
            });

            if (!fileToDelete) {
                throw new Error('File not found in storage');
            }

            const filePath = `${employeeId}/${fileToDelete.name}`;
            
            // Delete from Supabase storage
            const { error: deleteError } = await this.supabase.storage
                .from(this.bucketName)
                .remove([filePath]);

            if (deleteError) throw deleteError;

            console.log('[DEBUG] File deleted successfully:', fileName);
            return { success: true };
        } catch (error) {
            console.error('Error deleting CV:', error);
            return { success: false, message: error.message };
        }
    }

    // ADD THIS MISSING METHOD
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    async getEmployeeProfile(forceRefresh = false) {
        // Return cached data if still valid
        if (!forceRefresh && this.profileCache && this.cacheTimestamp && 
            (Date.now() - this.cacheTimestamp) < this.CACHE_DURATION) {
            return this.profileCache;
        }

        if (!this.currentUserId) throw new Error('No logged-in user ID set');
    
        try {
            // Use more specific select to reduce data transfer
            const { data, error } = await this.supabase
                .from('user_details')
                .select(`
                    employee_id,
                    job_title,
                    department,
                    phone_number,
                    profile_pic,
                    location,
                    join_date,
                    experience_level,
                    skills,
                    users (name, email)
                `)
                .eq('user_id', this.currentUserId)
                .single();
        
            if (error) throw error;
        
            // Fetch files
            const employeeId = data.employee_id;
            const { data: filesData, error: filesError } = await this.supabase.storage
                .from(this.bucketName)
                .list(employeeId, { limit: 50, offset: 0 });
        
            if (filesError) {
                console.warn('Error fetching files from storage:', filesError);
            }

            const uploadedFiles = [];
            if (filesData && filesData.length > 0) {
                for (const file of filesData) {
                    if (file.name) {
                        const filePath = `${employeeId}/${file.name}`;
                        const { data: { publicUrl } } = this.supabase.storage
                            .from(this.bucketName)
                            .getPublicUrl(filePath);
                        
                        uploadedFiles.push({
                            name: file.name,
                            size: this.formatFileSize(file.metadata?.size || 0),
                            uploadDate: file.created_at || new Date().toISOString(),
                            public_url: publicUrl,
                            path: filePath
                        });
                    }
                }
            }
        
            const profileData = {
                id: data.employee_id || '',
                name: data.users?.name || '',
                email: data.users?.email || '',
                role: data.job_title || '',
                department: data.department || '',
                phone_number: data.phone_number || '',
                status: 'Available',
                avatar: data.profile_pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.users?.name || 'User')}&background=4A90E2&color=fff`,
                location: data.location || '',
                joinDate: data.join_date ? new Date(data.join_date).toISOString().split('T')[0] : '',
                experienceLevel: data.experience_level || 'beginner',
                skills: (data.skills || []).map(skill => ({ name: skill, level: 'Intermediate' })),
                uploadedFiles: uploadedFiles
            };

            // Cache the result
            this.profileCache = profileData;
            this.cacheTimestamp = Date.now();
        
            return profileData;
        } catch (error) {
            console.error('Error in getEmployeeProfile:', error);
            throw error;
        }
    }

    async updateEmployeeProfile(profileData) {
        if (!this.currentUserId) throw new Error('No logged-in user ID');
    
        const { error } = await this.supabase
            .from('user_details')
            .update({
                job_title: profileData.role,
                department: profileData.department,
                phone_number: profileData.phone_number,
                profile_pic: profileData.avatar,
                location: profileData.location,
                experience_level: profileData.experienceLevel,
                skills: profileData.skills.map(s => s.name)
            })
            .eq('user_id', this.currentUserId);
    
        if (error) throw error;
    
        // Clear cache after update
        this.profileCache = null;
    
        return { success: true };
    }

    clearCache() {
        this.profileCache = null;
        this.cacheTimestamp = null;
    }
}

// ============================================
// UI MANAGER CLASS
// ============================================
class ProfileUIManager {
    constructor() {
        this.currentProfile = null;
        // Move debouncedRender after renderSkills is defined
    }

    // ADD THESE MISSING METHODS
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
        const experienceLevelEl = document.getElementById('experienceLevelDisplay');
        const currentPosition = document.getElementById('currentPosition');
        const joinDate = document.getElementById('joinDate');

        if (profileName) profileName.textContent = profile.name;
        if (profileRole) profileRole.textContent = profile.role;
        if (profileId) profileId.textContent = profile.id;
        if (profileDept) profileDept.textContent = profile.department;
        if (profileEmail) profileEmail.textContent = profile.email;
        if (profileAvatar) profileAvatar.src = profile.avatar;
        if (experienceLevelEl) experienceLevelEl.textContent = profile.experienceLevel;
        if (currentPosition) currentPosition.textContent = profile.role;
        if (joinDate) joinDate.textContent = profile.joinDate;

        // Render skills
        this.renderSkills(profile.skills);

        // Render uploaded files
        this.renderUploadedFiles(profile.uploadedFiles);
    }

    // ADD THIS MISSING METHOD
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    // ADD THIS MISSING METHOD
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

    // Now define renderSkills before setting up debouncedRender
    renderSkills(skills) {
        const container = document.getElementById('skillsGrid');
        if (!container) return;
    
        // Quick empty state check
        if (!skills || skills.length === 0) {
            if (container.children.length === 1 && container.querySelector('.empty-state')) {
                return; // Already showing empty state
            }
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <i class="fas fa-code"></i>
                    <p>No skills added yet. Click "Add Skill" to get started!</p>
                </div>
            `;
            return;
        }
    
        // Only re-render if skills actually changed
        const currentSkillNames = Array.from(container.querySelectorAll('.skill-item h4'))
            .map(el => el.textContent)
            .sort()
            .join(',');
        
        const newSkillNames = skills.map(s => s.name).sort().join(',');
        
        if (currentSkillNames === newSkillNames) {
            return; // Skills haven't changed, skip re-render
        }
    
        // Render skills
        container.innerHTML = skills.map(skill => `
            <div class="skill-item">
                <div class="skill-info">
                    <h4>${this.escapeHtml(skill.name)}</h4>
                    <p class="skill-level">${this.escapeHtml(skill.level)}</p>
                </div>
                <button class="skill-remove" data-skill="${this.escapeHtml(skill.name)}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    
        // Use event delegation instead of attaching listeners to each button
        this.setupSkillEventDelegation(container);
    }

    // Now initialize debouncedRender after renderSkills is defined
    setupDebouncedRender() {
        this.debouncedRender = debounce(this.renderSkills.bind(this), 100);
    }

    setupSkillEventDelegation(container) {
        // Remove existing listeners and attach a single one
        container.removeEventListener('click', this.skillClickHandler);
        
        this.skillClickHandler = (e) => {
            const removeBtn = e.target.closest('.skill-remove');
            if (removeBtn) {
                const skillName = removeBtn.dataset.skill;
                profileApp.removeSkill(skillName);
            }
        };
        
        container.addEventListener('click', this.skillClickHandler);
    }

    renderUploadedFiles(files) {
        const container = document.getElementById('uploadedFilesList');
        if (!container) return;
    
        // Quick empty state check
        if (!files || files.length === 0) {
            if (container.children.length === 1 && container.querySelector('.empty-state')) {
                return; // Already showing empty state
            }
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <i class="fas fa-file"></i>
                    <p>No files uploaded yet.</p>
                </div>
            `;
            return;
        }
    
        // Only re-render if files actually changed
        const currentFileNames = Array.from(container.querySelectorAll('.file-details h4'))
            .map(el => el.textContent)
            .sort()
            .join(',');
        
        const newFileNames = files.map(f => f.name).sort().join(',');
        
        if (currentFileNames === newFileNames) {
            return; // Files haven't changed, skip re-render
        }
    
        container.innerHTML = files.map(file => {
            let iconClass = 'fas fa-file';
            if (file.name.endsWith('.pdf')) iconClass = 'fas fa-file-pdf';
            else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) iconClass = 'fas fa-file-word';
            else if (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') || file.name.endsWith('.png')) iconClass = 'fas fa-file-image';
    
            return `
                <div class="uploaded-file">
                    <div class="file-info">
                        <div class="file-icon"><i class="${iconClass}"></i></div>
                        <div class="file-details">
                            <h4>${this.escapeHtml(file.name)}</h4>
                            <p>${this.escapeHtml(file.size)} • Uploaded ${this.formatDate(file.uploadDate)}</p>
                        </div>
                    </div>
                    <div class="file-actions">
                        <button class="icon-btn view-btn" title="View" data-file="${this.escapeHtml(file.name)}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="icon-btn delete-btn" title="Delete" data-file="${this.escapeHtml(file.name)}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    
        // Use event delegation for file actions
        this.setupFileEventDelegation(container);
    }

    setupFileEventDelegation(container) {
        // Remove existing listeners and attach single ones
        container.removeEventListener('click', this.fileClickHandler);
        
        this.fileClickHandler = (e) => {
            const viewBtn = e.target.closest('.view-btn');
            const deleteBtn = e.target.closest('.delete-btn');
            
            if (viewBtn) {
                const fileName = viewBtn.dataset.file;
                profileApp.viewFile(fileName);
            } else if (deleteBtn) {
                const fileName = deleteBtn.dataset.file;
                profileApp.deleteFile(fileName);
            }
        };
        
        container.addEventListener('click', this.fileClickHandler);
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
        // Initialize debounced render after UI manager is created
        this.uiManager.setupDebouncedRender();
    }

    async init(loggedInUser) {
        try {
            if (!loggedInUser || !loggedInUser.id) throw new Error('User not logged in');
    
            // Set current user ID
            this.dataService.setCurrentUser(loggedInUser.id);
    
            // Load profile dynamically
            await this.loadProfile();
    
            this.setupEventListeners();
        } catch (error) {
            console.error('Error initializing profile app:', error);
            this.uiManager.showError('Failed to initialize profile');
        }
    }

    setupEventListeners() {
        this.setupProfilePictureEvents();
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

    setupProfilePictureEvents() {
        const changeAvatarBtn = document.getElementById('changeAvatarBtn');
        
        if (changeAvatarBtn) {
            changeAvatarBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.changeProfilePicture();
            });
        }
    }

    async changeProfilePicture() {
        let selectedFile = null;
        
        const result = await Swal.fire({
            title: 'Upload Profile Picture',
            html: `
                <div style="text-align: center; padding: 20px;">
                    <div style="margin-bottom: 20px;">
                        <img id="previewImage" src="${this.currentProfile.avatar}" 
                             style="width: 150px; height: 150px; border-radius: 50%; object-fit: cover; border: 3px solid #000;">
                    </div>
                    <input type="file" id="avatarFileInput" accept="image/jpeg,image/png,image/jpg" 
                           style="display: none;">
                    <button type="button" class="primary-btn" id="choosePhotoBtn"
                            style="display: inline-flex; margin: 0 auto;">
                        <i class="fas fa-upload"></i> Choose Photo
                    </button>
                    <p id="selectedFileName" style="font-size: 13px; color: #4A90E2; margin-top: 8px; min-height: 20px;"></p>
                    <p style="font-size: 12px; color: #6C757D; margin-top: 4px;">
                        Supported formats: JPG, PNG (Max 2MB)
                    </p>
                </div>
            `,
            width: 500,
            showCancelButton: true,
            confirmButtonColor: '#000000',
            cancelButtonColor: '#6C757D',
            confirmButtonText: 'Upload',
            cancelButtonText: 'Cancel',
            didOpen: () => {
                const fileInput = document.getElementById('avatarFileInput');
                const previewImage = document.getElementById('previewImage');
                const choosePhotoBtn = document.getElementById('choosePhotoBtn');
                const selectedFileName = document.getElementById('selectedFileName');
                
                choosePhotoBtn.addEventListener('click', () => {
                    fileInput.click();
                });
                
                fileInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const maxSize = 2 * 1024 * 1024;
                        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
                        
                        if (file.size > maxSize) {
                            Swal.showValidationMessage('File size exceeds 2MB limit');
                            selectedFile = null;
                            return;
                        }
                        
                        if (!allowedTypes.includes(file.type)) {
                            Swal.showValidationMessage('Only JPG and PNG files are allowed');
                            selectedFile = null;
                            return;
                        }
                        
                        selectedFile = file;
                        selectedFileName.textContent = `Selected: ${file.name}`;
                        
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            previewImage.src = e.target.result;
                        };
                        reader.readAsDataURL(file);
                    }
                });
            },
            preConfirm: () => {
                if (!selectedFile) {
                    Swal.showValidationMessage('Please select a photo');
                    return false;
                }
                return selectedFile;
            }
        });

        if (result.isConfirmed && result.value) {
            try {
                this.uiManager.showLoading('Uploading profile picture...');
                const uploadResult = await this.dataService.uploadProfilePicture(result.value);
                
                if (uploadResult.success) {
                    this.currentProfile.avatar = uploadResult.url;
                    this.uiManager.updateHeaderInfo(this.currentProfile);
                    
                    this.uiManager.hideLoading();
                    this.uiManager.showSuccess('Profile picture updated successfully!');
                }
            } catch (error) {
                this.uiManager.hideLoading();
                console.error('Error uploading profile picture:', error);
                this.uiManager.showError('Failed to upload profile picture. Please try again.');
            }
        }
    }

    setupCVUploadEvents() {
        const cvUploadArea = document.getElementById('cvUploadArea');
        const cvFileInput = document.getElementById('cvFileInput');
        const browseBtn = document.getElementById('browseBtn');
    
        if (!cvUploadArea || !cvFileInput) return;
    
        // Click to open file browser
        cvUploadArea.addEventListener('click', (e) => {
            if (e.target !== browseBtn && !browseBtn.contains(e.target)) {
                cvFileInput.click();
            }
        });
    
        // Browse button click
        if (browseBtn) {
            browseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                cvFileInput.click();
            });
        }
    
        // Drag over
        cvUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            cvUploadArea.classList.add('drag-over');
        });
    
        cvUploadArea.addEventListener('dragleave', () => {
            cvUploadArea.classList.remove('drag-over');
        });
    
        // Drop files/folders
        cvUploadArea.addEventListener('drop', async (e) => {
            e.preventDefault();
            cvUploadArea.classList.remove('drag-over');
        
            const items = e.dataTransfer.items;
            const allFiles = [];
        
            for (let i = 0; i < items.length; i++) {
                const entry = items[i].webkitGetAsEntry();
                if (entry) {
                    const filesFromEntry = await this.readEntryRecursively(entry);
                    allFiles.push(...filesFromEntry);
                }
            }
        
            // Remove duplicates
            const uniqueFilesMap = new Map();
            allFiles.forEach(file => {
                const key = `${file.name}-${file.size}`;
                if (!uniqueFilesMap.has(key)) uniqueFilesMap.set(key, file);
            });
            const uniqueFiles = Array.from(uniqueFilesMap.values());
        
            if (uniqueFiles.length > 0) {
                await this.handleCVUpload(uniqueFiles);
            }
        });
    
        // File input change (multi-select)
        cvFileInput.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                const files = [...e.target.files];
                await this.handleCVUpload(files);
            }
        });
    }

    // Recursively read files from a folder entry
    async readEntryRecursively(entry) {
        return new Promise((resolve) => {
            if (entry.isFile) {
                entry.file((file) => resolve([file]));
            } else if (entry.isDirectory) {
                const dirReader = entry.createReader();
                const files = [];
                const readEntries = () => {
                    dirReader.readEntries(async (entries) => {
                        if (!entries.length) {
                            resolve(files);
                            return;
                        }
                        for (const ent of entries) {
                            const nestedFiles = await this.readEntryRecursively(ent);
                            files.push(...nestedFiles);
                        }
                        readEntries(); // Read remaining entries
                    });
                };
                readEntries();
            } else {
                resolve([]);
            }
        });
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

    async handleCVUpload(files) {
        if (!files || files.length === 0) return;
    
        const maxSize = 5 * 1024 * 1024;
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png'
        ];
    
        // Quick validation without detailed error messages for each file
        const invalidFiles = files.filter(file => 
            file.size > maxSize || !allowedTypes.includes(file.type)
        );
        
        if (invalidFiles.length > 0) {
            this.uiManager.showError(`${invalidFiles.length} file(s) are invalid (wrong type or too large)`);
            return;
        }
    
        try {
            this.uiManager.showLoading(`Uploading ${files.length} file(s)...`);
    
            const employeeId = await this.dataService.getEmployeeFolderId();
    
            // Upload files - don't wait for skill extraction
            const uploadFormData = new FormData();
            uploadFormData.append('employee_id', employeeId);
            files.forEach(file => uploadFormData.append('files', file));
    
            const uploadPromise = fetch('http://127.0.0.1:8000/upload_cv/', {
                method: 'POST',
                body: uploadFormData
            });
            
            // Start skill extraction in parallel but don't wait for it
            const skillPromise = this.extractSkillsParallel(files, employeeId);
    
            const uploadResponse = await uploadPromise;
            
            if (!uploadResponse.ok) {
                throw new Error(`Upload failed with status: ${uploadResponse.status}`);
            }
    
            // Refresh profile immediately after upload
            this.dataService.clearCache(); // Force refresh
            this.currentProfile = await this.dataService.getEmployeeProfile();
            this.uiManager.renderProfile(this.currentProfile);
            this.uiManager.updateHeaderInfo(this.currentProfile);
    
            this.uiManager.hideLoading();
    
            // Show success immediately, skills will be added in background
            this.uiManager.showSuccess(`${files.length} file(s) uploaded successfully!`);
    
            // Process skills in background and update when ready
            skillPromise.then(extractedSkills => {
                if (extractedSkills && extractedSkills.length > 0) {
                    this.addExtractedSkills(extractedSkills);
                }
            }).catch(error => {
                console.warn('Skill extraction completed with warnings:', error);
            });
    
        } catch (error) {
            this.uiManager.hideLoading();
            console.error('Error uploading files:', error);
            this.uiManager.showError(error.message || 'Failed to upload files');
        }
    }

    async extractSkillsParallel(files, employeeId) {
        try {
            const skillFormData = new FormData();
            files.forEach(file => skillFormData.append('files', file));
            skillFormData.append('employee_number', employeeId);
    
            const skillResponse = await fetch('http://127.0.0.1:8000/extract_skills/', {
                method: 'POST',
                body: skillFormData
            });
            
            if (!skillResponse.ok) return [];
            
            const skillResult = await skillResponse.json();
            return Array.isArray(skillResult.skills) ? skillResult.skills : [];
        } catch (error) {
            console.warn('Skill extraction failed:', error);
            return [];
        }
    }

    async addExtractedSkills(extractedSkills) {
        if (!extractedSkills.length) return;
        
        let skillsAdded = 0;
        extractedSkills.forEach(skill => {
            if (!this.currentProfile.skills.find(s => s.name.toLowerCase() === skill.toLowerCase())) {
                this.currentProfile.skills.push({ name: skill, level: 'Intermediate' });
                skillsAdded++;
            }
        });
        
        if (skillsAdded > 0) {
            this.uiManager.renderSkills(this.currentProfile.skills);
            // Optional: show a subtle notification about new skills
            if (skillsAdded > 0) {
                console.log(`Added ${skillsAdded} new skills from uploaded files`);
            }
        }
    }

    // Add this method to handle bulk operations more efficiently
    async bulkUpdateProfile(updates) {
        // This would be called when multiple changes happen at once
        // to prevent multiple API calls
        Object.assign(this.currentProfile, updates);
        await this.dataService.updateEmployeeProfile(this.currentProfile);
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
                const existingSkill = this.currentProfile.skills.find(
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
        try {
            const { value: formValues } = await Swal.fire({
                title: 'Edit Work Experience',
                html: `
                    <div style="text-align: left;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Experience Level:</label>
                        <select id="experienceLevel" class="swal2-input" style="width: 90%; margin-bottom: 16px;">
                            <option value="beginner" ${this.currentProfile.experienceLevel === 'beginner' ? 'selected' : ''}>Beginner</option>
                            <option value="intermediate" ${this.currentProfile.experienceLevel === 'intermediate' ? 'selected' : ''}>Intermediate</option>
                            <option value="advanced" ${this.currentProfile.experienceLevel === 'advanced' ? 'selected' : ''}>Advanced</option>
                        </select>
                        
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Current Position:</label>
                        <input id="currentPos" class="swal2-input" value="${this.currentProfile.role}" placeholder="e.g., Senior Developer" style="width: 90%; margin: 0;">
                    </div>
                `,
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonText: 'Save Changes',
                confirmButtonColor: '#000000',
                cancelButtonColor: '#6C757D',
                preConfirm: () => {
                    const level = document.getElementById('experienceLevel').value;
                    const role = document.getElementById('currentPos').value.trim();
                    if (!level || !role) {
                        Swal.showValidationMessage('Please fill in all fields');
                        return false;
                    }
                    return { level, role };
                }
            });
    
            if (!formValues) return;
    
            // 1. Update database via ProfileDataService
            await this.dataService.updateExperience(formValues);
    
            // 2. Update local profile for immediate UI refresh
            this.currentProfile.experienceLevel = formValues.level;
            this.currentProfile.role = formValues.role;
    
            // 3. Update UI elements
            const experienceLevelEl = document.getElementById('experienceLevelDisplay');
            const currentPosition = document.getElementById('currentPosition');
            const profileRole = document.getElementById('profileRole');
    
            if (experienceLevelEl) experienceLevelEl.textContent = formValues.level;
            if (currentPosition) currentPosition.textContent = formValues.role;
            if (profileRole) profileRole.textContent = formValues.role;
    
            // 4. Show success message
            this.uiManager.showSuccess('Work experience updated successfully!');
        } catch (error) {
            console.error('Error updating experience:', error);
            this.uiManager.showError('Failed to update work experience.');
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
        if (!this.currentProfile) return;
    
        const fileData = this.currentProfile.uploadedFiles.find(f => f.name === fileName);
        if (!fileData) {
            this.uiManager.showError('File not found');
            return;
        }
    
        const fileUrl = fileData.public_url;
        const fileExtension = fileName.split('.').pop().toLowerCase();
    
        if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
            await Swal.fire({
                title: fileName,
                html: `
                    <div style="text-align: center; padding: 20px;">
                        <img src="${fileUrl}" alt="${fileName}" style="max-width: 100%; max-height: 400px; border-radius: 6px;" />
                    </div>
                `,
                width: 700,
                confirmButtonColor: '#000000',
                confirmButtonText: 'Close'
            });
        } else if (fileExtension === 'pdf') {
            const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
            
            await Swal.fire({
                title: fileName,
                html: `
                    <div style="text-align: center; padding: 20px;">
                        <iframe src="${googleViewerUrl}" width="100%" height="400px" style="border: none;"></iframe>
                        <p style="font-size: 12px; color: #6C757D; margin-top: 8px;">
                            PDF loading... If it doesn't appear, use the download option.
                        </p>
                    </div>
                `,
                width: 700,
                confirmButtonColor: '#000000',
                confirmButtonText: 'Close',
                showCancelButton: true,
                cancelButtonText: 'Download',
                cancelButtonColor: '#4A90E2'
            }).then((result) => {
                if (result.isDismissed) {
                    window.open(fileUrl, '_blank');
                }
            });
        } else {
            await Swal.fire({
                title: fileName,
                html: `
                    <div style="text-align: center; padding: 40px;">
                        <i class="fas fa-file" style="font-size: 64px; color: #6C757D;"></i>
                        <p style="margin-top: 16px;">Preview not available for this file type.</p>
                        <p style="color: #6C757D;">Click "Download" to view the file.</p>
                    </div>
                `,
                width: 500,
                confirmButtonColor: '#000000',
                confirmButtonText: 'Close',
                showCancelButton: true,
                cancelButtonText: 'Download',
                cancelButtonColor: '#4A90E2'
            }).then((result) => {
                if (result.isDismissed) {
                    window.open(fileUrl, '_blank');
                }
            });
        }
    }

    async deleteFile(fileName) {
        const confirmed = await this.uiManager.showConfirmation(
            'Delete File',
            `Are you sure you want to delete "${fileName}"? This action cannot be undone.`
        );
    
        if (confirmed) {
            try {
                this.uiManager.showLoading('Deleting file...');
                
                const result = await this.dataService.deleteCV(fileName);
                if (!result.success) throw new Error(result.message || 'Delete failed');
    
                this.currentProfile.uploadedFiles = this.currentProfile.uploadedFiles.filter(
                    f => f.name !== fileName
                );
                this.uiManager.renderUploadedFiles(this.currentProfile.uploadedFiles);
    
                this.uiManager.hideLoading();
                this.uiManager.showSuccess('File deleted successfully');
            } catch (error) {
                this.uiManager.hideLoading();
                console.error('Error deleting CV:', error);
                this.uiManager.showError(error.message);
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
      
            setTimeout(() => {
                window.location.href = "/login/HTML_Files/login.html";
            }, 1000);
        }
    }
}


// ============================================
// INITIALIZE APPLICATION
// ============================================
let profileApp;

document.addEventListener('DOMContentLoaded', () => {
    const loggedUser = JSON.parse(localStorage.getItem('loggedUser'));

    profileApp = new ProfileApp();
    profileApp.init(loggedUser); 
});
