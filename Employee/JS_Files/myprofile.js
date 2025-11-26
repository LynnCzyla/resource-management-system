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
class ProfileDataService {
    constructor() {
        this.supabase = supabase; //
        this.currentEmployeeId = null; // will set after login
    }

    setCurrentUser(userId) {
        this.currentUserId = userId;
    }

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
    
        return data.employee_id; // e.g., "EMP-1014"
    }
    

    // Employee Profile Methods
    async getEmployeeProfile() {
        if (!this.currentUserId) throw new Error('No logged-in user ID set');
    
        // 1. Fetch main profile info
        const { data, error } = await this.supabase
            .from('user_details')
            .select(`
                *,
                users (name, email, role)
            `)
            .eq('user_id', this.currentUserId)
            .single();
    
        if (error) throw error;
    
        // 2. Fetch uploaded files for this employee
        const { data: filesData, error: filesError } = await this.supabase
            .from('employee_files')
            .select('*')
            .eq('employee_id', data.employee_id)
            .order('uploaded_at', { ascending: false }); // optional: newest first
    
        if (filesError) throw filesError;
    
        return {
            id: data.employee_id || '',
            name: data.users?.name || '',
            email: data.users?.email || '',
            role: data.job_title || '',
            department: data.department || '',
            phone_number: data.phone_number || '',
            status: data.status || 'Available',
            avatar: data.profile_pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.users?.name || 'User')}&background=4A90E2&color=fff`,
            location: data.location || '',
            joinDate: data.join_date ? new Date(data.join_date).toISOString().split('T')[0] : '',
            experienceLevel: data.experience_level || 'beginner',
            skills: (data.skills || []).map(skill => ({ name: skill, level: 'Intermediate' })),
            uploadedFiles: (filesData || []).map(f => ({
                name: f.filename,
                size: 'Unknown', // optional: can store size when uploading
                uploadDate: f.uploaded_at
            }))
        };
    }
    


    async updateEmployeeProfile(profileData) {
        if (!this.currentUserId) throw new Error('No logged-in user ID');
    
        const { data: mainData, error: mainError } = await this.supabase
            .from('user_details')
            .update({
                job_title: profileData.role,
                department: profileData.department,
                phone_number: profileData.phone_number,
                profile_pic: profileData.avatar,
                location: profileData.location,
                experience_level: profileData.experienceLevel,
                skills: profileData.skills.map(s => s.name) // store as array of skill names
            })
            .eq('user_id', this.currentUserId);
    
        if (mainError) throw mainError;
    
        if (profileData.uploadedFiles && profileData.uploadedFiles.length > 0) {
            const { error: fileError } = await this.supabase
                .from('employee_files')
                .upsert(
                    profileData.uploadedFiles.map(file => ({
                        employee_id: profileData.id,
                        filename: file.name,
                        uploaded_at: file.uploadDate
                    })),
                    { onConflict: ['employee_id', 'filename'] } // <-- ADD THIS
                );
            if (fileError) throw fileError;
        }
        
    
        return { success: true };
    }


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
    
    

    async uploadCV(files) {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));
    
        try {
            // Call the FastAPI endpoint
            const response = await fetch('http://127.0.0.1:8000/extract_skills/', {
                method: 'POST',
                body: formData
            });
    
            if (!response.ok) {
                throw new Error('Failed to extract skills from CV');
            }
    
            const result = await response.json();
    
            // Return file info + extracted skills
            return {
                success: true,
                fileName: file.name,
                fileSize: this.formatFileSize(file.size),
                uploadDate: new Date().toISOString().split('T')[0],
                skills: result.skills || [] // Skills from FastAPI
            };
    
        } catch (error) {
            console.error('Error uploading CV:', error);
            return { success: false, skills: [] };
        }
    }
    
async deleteCV(fileName) {
    if (!this.currentUserId) throw new Error('No logged-in user ID');

    try {
        // 1. Get employee_id
        const employeeId = await this.getEmployeeFolderId();

        // 2. Delete from Supabase table
        const { error: dbError } = await this.supabase
            .from('employee_files')
            .delete()
            .eq('employee_id', employeeId)
            .eq('filename', fileName);

        if (dbError) throw dbError;

        // 3. Delete from local FastAPI folder
        const url = new URL('http://127.0.0.1:8000/delete_cv/');
        url.searchParams.append('employee_id', employeeId);
        url.searchParams.append('filename', fileName);

        const response = await fetch(url.toString(), { method: 'DELETE' });
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.detail || 'Failed to delete file from local folder');
        }

        console.log('[DEBUG] File deleted successfully:', fileName);
        return { success: true };
    } catch (error) {
        console.error('Error deleting CV:', error);
        return { success: false, message: error.message };
    }
}

// In ProfileApp class
async deleteFile(fileName) {
    const confirmed = await this.uiManager.showConfirmation(
        'Delete File',
        `Are you sure you want to delete "${fileName}"? This action cannot be undone.`
    );

    if (confirmed) {
        try {
            this.uiManager.showLoading('Deleting file...');
            await this.dataService.deleteCV(fileName); // backend call
            // Remove file from UI list
            this.currentProfile.uploadedFiles = this.currentProfile.uploadedFiles.filter(
                f => f.name !== fileName
            );
            this.uiManager.renderUploadedFiles(this.currentProfile.uploadedFiles);
            this.uiManager.showSuccess('File deleted successfully');
        } catch (error) {
            console.error('Error deleting file:', error);
            this.uiManager.showError(error.message || 'Failed to delete file');
        } finally {
            this.uiManager.hideLoading();
        }
    }
}


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
    

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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

    renderSkills(skills) {
        const container = document.getElementById('skillsGrid');
        if (!container) return;
    
        // Empty state
        if (!skills || skills.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <i class="fas fa-code"></i>
                    <p>No skills added yet. Click "Add Skill" to get started!</p>
                </div>
            `;
            return;
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
    
        // Attach event listeners to remove buttons
        container.querySelectorAll('.skill-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const skillName = e.currentTarget.dataset.skill;
                profileApp.removeSkill(skillName); // safely use profileApp here
            });
        });
    }
    

    renderUploadedFiles(files) {
        const container = document.getElementById('uploadedFilesList');
        if (!container) return;
    
        container.innerHTML = ''; // Clear current content
    
        if (!files || files.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <i class="fas fa-file"></i>
                    <p>No files uploaded yet.</p>
                </div>
            `;
            return;
        }
    
        files.forEach(file => {
            const fileDiv = document.createElement('div');
            fileDiv.classList.add('uploaded-file');
    
            // Determine icon
            let iconClass = 'fas fa-file'; // default generic file
            if (file.name.endsWith('.pdf')) iconClass = 'fas fa-file-pdf';
            else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) iconClass = 'fas fa-file-word';
            else if (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') || file.name.endsWith('.png')) iconClass = 'fas fa-file-image';
    
            fileDiv.innerHTML = `
                <div class="file-info">
                    <div class="file-icon"><i class="${iconClass}"></i></div>
                    <div class="file-details">
                        <h4>${this.escapeHtml(file.name)}</h4>
                        <p>${this.escapeHtml(file.size)} • Uploaded ${this.formatDate(file.uploadDate)}</p>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="icon-btn view-btn" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="icon-btn delete-btn" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(fileDiv);
    
            // Attach event listeners
            const viewBtn = fileDiv.querySelector('.view-btn');
            const deleteBtn = fileDiv.querySelector('.delete-btn');
    
            viewBtn.addEventListener('click', () => {
                profileApp.viewFile(file.name); // Use the new preview logic
            });
    
            deleteBtn.addEventListener('click', () => {
                profileApp.deleteFile(file.name);
            });
        });
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

    async init(loggedInUser) { // pass the logged-in user here
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
       // Drop event handler
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
            // Simply upload files as-is
            await profileApp.handleCVUpload(uniqueFiles);
        }
    });
    
        // File input change (multi-select)
        cvFileInput.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                const files = [...e.target.files];
                // Simply upload files as-is
                await profileApp.handleCVUpload(files);
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
    
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png'
        ];
    
        // Validate files
        for (const file of files) {
            if (file.size > maxSize) {
                this.uiManager.showError(`File "${file.name}" exceeds 5MB`);
                return;
            }
            if (!allowedTypes.includes(file.type)) {
                this.uiManager.showError(`File "${file.name}" is not allowed`);
                return;
            }
        }
    
        try {
            this.uiManager.showLoading('Uploading files...');
    
            // --- 1. Upload files to FastAPI /uploads folder ---
            const formData = new FormData();
            formData.append('employee_id', await this.dataService.getEmployeeFolderId());
            files.forEach(file => formData.append('files', file));
    
            const uploadResponse = await fetch('http://127.0.0.1:8000/upload_cv/', {
                method: 'POST',
                body: formData
            });
            const uploadResult = await uploadResponse.json();
            if (!uploadResult.success) throw new Error('Failed to save files locally');
    
            // Map uploaded files for front-end display
            const uploadedFiles = uploadResult.files.map(f => ({
                name: f.filename,
                size: this.dataService.formatFileSize(files.find(file => file.name === f.filename).size),
                uploadDate: new Date().toISOString().split('T')[0],
                url: `http://127.0.0.1:8000/${f.path.replace(/\\/g, '/')}` 
            }));
    
            // --- 2. Extract skills from uploaded files without saving again ---
            const skillResponse = await fetch('http://127.0.0.1:8000/extract_skills/', {
                method: 'POST',
                body: formData // reuse the same files in memory
            });
            const skillResult = skillResponse.ok ? await skillResponse.json() : { skills: [] };
            const extractedSkills = Array.isArray(skillResult.skills) ? skillResult.skills : [];
    
            // --- 3. Update profile and render ---
            this.currentProfile.uploadedFiles.push(...uploadedFiles);
            this.uiManager.renderUploadedFiles(this.currentProfile.uploadedFiles);
    
            extractedSkills.forEach(skill => {
                if (!this.currentProfile.skills.find(s => s.name.toLowerCase() === skill.toLowerCase())) {
                    this.currentProfile.skills.push({ name: skill, level: 'Intermediate' });
                }
            });
            this.uiManager.renderSkills(this.currentProfile.skills);

    
            // --- 4. Success notification ---
            await Swal.fire({
                icon: 'success',
                title: 'CV Uploaded Successfully!',
                html: `
                    <p>Your CV has been processed using OCR and NLP.</p>
                    <p style="margin-top: 12px;"><strong>Extracted Skills:</strong></p>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 8px;">
                        ${extractedSkills.length
                            ? extractedSkills.map(skill => `
                                <span style="
                                    padding: 6px 12px;
                                    background-color: #E9ECEF;
                                    border-radius: 4px;
                                    font-size: 12px;
                                ">
                                    ${skill}
                                </span>
                            `).join('')
                            : '<em>No skills detected.</em>'
                        }
                    </div>
                `,
                confirmButtonColor: '#000000'
            });            
            
    
        } catch (error) {
            console.error('Error uploading files:', error);
            this.uiManager.showError(error.message);
        } finally {
            this.uiManager.hideLoading();
        }
    }

    async readDirectory(directoryEntry) {
        const reader = directoryEntry.createReader();
        const entries = await new Promise((resolve, reject) => {
            reader.readEntries(resolve, reject);
        });
    
        for (const entry of entries) {
            if (entry.isFile) {
                const file = await new Promise((resolve, reject) =>
                    entry.file(resolve, reject)
                );
                await this.handleCVUpload([file]); // handleCVUpload expects an array
            } else if (entry.isDirectory) {
                await this.readDirectory(entry); // Recursive call
            }
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
    
        // Find the file in the current profile
        const file = this.currentProfile.uploadedFiles.find(f => f.name === fileName);
        if (!file) {
            this.uiManager.showError('File not found');
            return;
        }
    
        // Construct the public URL served by FastAPI
        const employeeId = this.currentProfile.id;
        const fileUrl = `http://127.0.0.1:8000/uploads/${employeeId}/${encodeURIComponent(fileName)}`;
    
        // Determine preview content
        let previewHtml = '';
        if (fileName.match(/\.(jpg|jpeg|png|gif)$/i)) {
            previewHtml = `<img src="${fileUrl}" alt="${fileName}" style="max-width: 100%; max-height: 400px; border-radius: 6px;" />`;
        } else if (fileName.match(/\.pdf$/i)) {
            previewHtml = `
                <iframe src="${fileUrl}" width="100%" height="400px" style="border: none;"></iframe>
            `;
        } else {
            previewHtml = `<p style="margin-top: 20px;">Preview not available for this file type.</p>`;
        }
    
        await Swal.fire({
            title: fileName,
            html: `
                <div style="text-align: center; padding: 20px;">
                    ${previewHtml}
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
    }
    
    


    async deleteFile(fileName) {
        const confirmed = await this.uiManager.showConfirmation(
            'Delete File',
            `Are you sure you want to delete "${fileName}"? This action cannot be undone.`
        );
    
        if (confirmed) {
            try {
                this.uiManager.showLoading('Deleting file...');
                
                // Call the data service
                const result = await this.dataService.deleteCV(fileName);
                if (!result.success) throw new Error(result.message || 'Delete failed');
    
                // Remove from local profile list and re-render
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
    const loggedUser = JSON.parse(localStorage.getItem('loggedUser'));

    profileApp = new ProfileApp();
    profileApp.init(loggedUser); // pass the logged-in user object
});
