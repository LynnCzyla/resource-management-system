// OPTIMIZED Dashboard-modal.js

import { supabase } from "../../supabaseClient.js";

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================
const INFO_MAP = {
    work: { class: "info-work", icon: "briefcase", text: "Work Assignment" },
    absent: { class: "info-absent", icon: "times-circle", text: "Absent" },
    leave: { class: "info-leave", icon: "calendar-times", text: "Leave" },
    holiday: { class: "info-holiday", icon: "star", text: "Holiday" },
    sick_leave: { class: "info-sick", icon: "medkit", text: "Sick Leave" },
    work_from_home: { class: "info-wfh", icon: "home", text: "Work from Home" },
    training: { class: "info-training", icon: "graduation-cap", text: "Training" },
    other: { class: "info-other", icon: "question-circle", text: "Other" }
};

const BLOCKING_TYPES = ["absent", "leave", "sick_leave"];
const SINGLE_ENTRY_TYPES = ["absent", "leave", "holiday", "sick_leave"];
const DAY_MAP = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4 };

// ============================================
// UTILITY FUNCTIONS
// ============================================
const capitalize = str => str.replace('_', ' ').toUpperCase();

const formatDate = (year, month, day) => 
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

// ============================================
// ALLOCATE HOURS MODAL CLASS
// ============================================
class AllocateHoursModal {
    constructor() {
        this.modal = null;
        this.selectedEmployee = null;
        this.selectedDay = null;
        this.selectedDate = null;
        this.currentAction = null;
        this.pmId = null;
        this.existingEntries = [];
        this.cachedUserId = null;
        this.projectCache = new Map();
    }

    init(pmId) {
        this.pmId = pmId;
        this.modal = document.getElementById("allocateHoursModal");
        this.setupEventListeners();
    }

    setupEventListeners() {
        const bind = (id, evt, fn) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener(evt, fn);
        };

        // Modal controls
        bind("closeAllocateModal", "click", () => this.close());
        bind("cancelAllocate", "click", () => this.close());
        bind("hoursInput", "input", (e) => this.updateHoursIndicator(+e.target.value));

        // Quick actions
        document.querySelectorAll(".quick-action-btn-new").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                this.handleQuickAction(e.currentTarget.dataset.action, e.currentTarget);
            });
        });

        bind("otherActionsSelect", "change", (e) => {
            if (e.target.value) this.handleQuickAction(e.target.value);
        });

        // Form submission
        document.getElementById("allocateHoursForm")?.addEventListener("submit", (e) => {
            e.preventDefault();
            this.saveAllocation();
        });

        // Click outside to close
        this.modal?.addEventListener("click", (e) => {
            if (e.target === this.modal) this.close();
        });
    }

    async open(employeeName, day, weekStart) {
        this.selectedEmployee = employeeName;
        this.selectedDay = day;
        this.calculateSelectedDate(weekStart);

        document.getElementById("selectedEmployee").textContent = employeeName;
        document.getElementById("selectedDay").textContent = day;

        // Parallel loading for better performance
        await Promise.all([
            this.loadExistingEntries(),
            this.fetchAssignmentType()
        ]);
        
        this.resetForm();
        this.updateBlockedDayUI();
        
        this.modal.classList.add("active");
        document.body.style.overflow = "hidden";
    }

    close() {
        this.modal?.classList.remove("active");
        document.body.style.overflow = "";
        this.resetForm();
        this.existingEntries = [];
        this.cachedUserId = null;
    }

    resetForm() {
        const form = document.getElementById("allocateHoursForm");
        form?.reset();
        
        document.querySelectorAll(".quick-action-btn-new").forEach(btn => 
            btn.classList.remove("selected")
        );
        
        ["projectGroup", "hoursGroup", "taskGroup", "reasonGroup", "allocationInfo", 
         "blockedDayWarning", "existingEntriesList"].forEach(id => this.hideElement(id));
        
        const projectSelect = document.getElementById("projectSelect");
        if (projectSelect) projectSelect.required = false;
        
        this.currentAction = null;
    }

    calculateSelectedDate(weekStart) {
        const [y, m, d] = weekStart.split("-").map(Number);
        const dayOffset = DAY_MAP[this.selectedDay.split(",")[0]] || 0;
        const date = new Date(y, m - 1, d + dayOffset);
        this.selectedDate = formatDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
    }

    async getUserId(name) {
        if (this.cachedUserId) return this.cachedUserId;
        
        const { data, error } = await supabase
            .from("users")
            .select("id")
            .eq("name", name)
            .single();
            
        if (error) throw error;
        this.cachedUserId = data.id;
        return data.id;
    }

    showElement(id) { 
        const el = document.getElementById(id); 
        if (el) el.style.display = "block"; 
    }
    
    hideElement(id) { 
        const el = document.getElementById(id); 
        if (el) el.style.display = "none"; 
    }
    
    showMessage(msg, type) { 
        window.dispatchEvent(new CustomEvent("showMessage", { 
            detail: { message: msg, type } 
        })); 
    }

    async loadExistingEntries() {
        try {
            const userId = await this.getUserId(this.selectedEmployee);
            const { data, error } = await supabase
                .from("worklogs")
                .select("work_type, hours, id, work_description, project_id")
                .eq("user_id", userId)
                .eq("log_date", this.selectedDate);
            
            if (error) {
                console.error("Error loading entries:", error);
                this.existingEntries = [];
                return;
            }
            
            this.existingEntries = (data && data.length > 0) ? data : [];
            console.log(`[MODAL] Loaded ${this.existingEntries.length} entries for ${this.selectedEmployee}`);
        } catch (err) {
            console.error("Error loading entries:", err);
            this.existingEntries = [];
        }
    }

    isDayBlocked() {
        return this.existingEntries.some(e => BLOCKING_TYPES.includes(e.work_type));
    }

    hasDuplicateType(type) {
        return SINGLE_ENTRY_TYPES.includes(type) && 
               this.existingEntries.some(e => e.work_type === type);
    }

    hasHoliday() {
        return this.existingEntries.some(e => e.work_type === "holiday");
    }

    updateBlockedDayUI() {
        this.ensureWarningElement();
        this.updateWarningMessage();
        this.showExistingEntriesList();
    }

    ensureWarningElement() {
        let warningDiv = document.getElementById("blockedDayWarning");
        
        if (!warningDiv) {
            const form = document.getElementById("allocateHoursForm");
            if (!form) return;
            
            warningDiv = document.createElement("div");
            warningDiv.id = "blockedDayWarning";
            warningDiv.style.cssText = "display:none;background:#fff3cd;border:1px solid #ffc107;padding:12px;border-radius:8px;margin-bottom:20px;color:#856404;";
            warningDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> <strong>Day Blocked:</strong> <span id="blockedDayMessage"></span>`;
            form.insertBefore(warningDiv, form.firstChild);
        }
    }

    updateWarningMessage() {
        const warningDiv = document.getElementById("blockedDayWarning");
        const message = document.getElementById("blockedDayMessage");
        
        if (!warningDiv || !message) return;
        
        if (this.isDayBlocked()) {
            const blockType = this.existingEntries.find(e => 
                BLOCKING_TYPES.includes(e.work_type)
            )?.work_type;
            const typeName = capitalize(blockType || 'blocked');
            warningDiv.style.display = "block";
            message.textContent = `This day is marked as ${typeName}. No additional entries can be added.`;
        } else {
            warningDiv.style.display = "none";
        }
    }

    showExistingEntriesList() {
        if (this.existingEntries.length === 0) {
            this.hideElement("existingEntriesList");
            return;
        }

        let entriesDiv = document.getElementById("existingEntriesList");
        
        if (!entriesDiv) {
            entriesDiv = this.createEntriesListElement();
        }

        if (!entriesDiv) return;

        entriesDiv.style.display = "block";
        entriesDiv.innerHTML = `
            <div style="margin-bottom:8px;"><strong><i class="fas fa-list"></i> Existing Entries for this Day:</strong></div>
            ${this.existingEntries.map(entry => this.createEntryHTML(entry)).join('')}
        `;

        this.attachDeleteHandlers(entriesDiv);
    }

    createEntriesListElement() {
        const form = document.getElementById("allocateHoursForm");
        if (!form) return null;
        
        const entriesDiv = document.createElement("div");
        entriesDiv.id = "existingEntriesList";
        entriesDiv.style.cssText = "display:none;background:#e3f2fd;border:1px solid #2196F3;padding:12px;border-radius:8px;margin-bottom:20px;";
        
        const warningDiv = document.getElementById("blockedDayWarning");
        if (warningDiv) {
            warningDiv.after(entriesDiv);
        } else {
            form.insertBefore(entriesDiv, form.firstChild);
        }
        
        return entriesDiv;
    }

    createEntryHTML(entry) {
        return `
            <div style="background:white;padding:8px;margin:4px 0;border-radius:4px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <strong>${capitalize(entry.work_type)}</strong>: 
                    ${entry.hours}h - ${entry.work_description || 'No description'}
                </div>
                <button type="button" class="delete-entry-btn" data-entry-id="${entry.id}" 
                        style="background:#f44336;color:white;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:12px;">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
    }

    attachDeleteHandlers(container) {
        container.querySelectorAll('.delete-entry-btn').forEach(btn => {
            btn.addEventListener('click', () => this.deleteEntry(btn.dataset.entryId));
        });
    }

    async deleteEntry(entryId) {
        if (!confirm('Are you sure you want to delete this entry?')) return;

        try {
            const { error } = await supabase
                .from('worklogs')
                .delete()
                .eq('id', entryId);

            if (error) throw error;

            this.showMessage('Entry deleted successfully', 'success');
            
            await this.loadExistingEntries();
            this.updateBlockedDayUI();
            
            window.dispatchEvent(new CustomEvent("allocationSaved"));
        } catch (err) {
            console.error('Error deleting entry:', err);
            this.showMessage('Failed to delete entry: ' + err.message, 'error');
        }
    }

    async fetchAssignmentType() {
        try {
            const userId = await this.getUserId(this.selectedEmployee);
            const { data } = await supabase
                .from("project_assignments")
                .select("assignment_type, assigned_hours")
                .eq("user_id", userId)
                .eq("status", "assigned")
                .limit(1)
                .single();

            const assignmentType = data?.assignment_type || "Full-Time";
            const assignedHours = parseInt(data?.assigned_hours || 40);
            const dailyHours = Math.round(assignedHours / 5);
            
            const isPartTime = assignmentType === "Part-Time";
            const badgeColor = isPartTime ? "#FF9800" : "#4CAF50";

            document.getElementById("selectedEmployee").innerHTML = `
                ${this.selectedEmployee}
                <span style="display:inline-block;margin-left:8px;padding:3px 10px;background:${badgeColor};color:white;font-size:11px;font-weight:600;border-radius:12px;text-transform:uppercase;">${assignmentType}</span>
                <span style="display:inline-block;margin-left:4px;padding:3px 8px;background:#2196F3;color:white;font-size:11px;font-weight:600;border-radius:12px;">${dailyHours}h/day</span>
            `;
        } catch (err) {
            console.error("Error fetching assignment type:", err);
            document.getElementById("selectedEmployee").textContent = this.selectedEmployee;
        }
    }

    handleQuickAction(action, btn) {
        this.currentAction = action;
        document.querySelectorAll(".quick-action-btn-new").forEach(b => 
            b.classList.remove("selected")
        );
        if (btn) btn.classList.add("selected");

        const actionHandlers = {
            work: () => this.setupWorkUI(),
            work_from_home: () => this.setupWorkUI(true),
            absent: () => this.setupSimpleUI("absent", 0, true),
            leave: () => this.setupSimpleUI("leave", 8, true),
            holiday: () => this.setupSimpleUI("holiday", 8, true),
            sick_leave: () => this.setupSimpleUI("sick_leave", 8, true),
            training: () => this.setupSimpleUI("training", 8, false, true),
            other: () => this.setupSimpleUI("other", 0, true, false, true)
        };

        actionHandlers[action]?.();
    }

    setupWorkUI(isWFH = false) {
        this.toggleGroup({ project: true, hours: true, task: true, reason: false });
        this.showElement("allocationInfo");

        const hours = document.getElementById("hoursInput");
        hours.value = 8;
        hours.max = 24;
        hours.disabled = false;
        this.updateHoursIndicator(8);

        document.getElementById("projectSelect").required = true;
        this.loadEmployeeProjects();
        this.showAllocationInfo(isWFH ? "work_from_home" : "work");
    }

    setupSimpleUI(type, hours, showReason, showTask = false, allowCustomHours = false) {
        const hoursInput = document.getElementById("hoursInput");
        const projectSelect = document.getElementById("projectSelect");

        this.toggleGroup({ 
            project: false, 
            hours: showTask || allowCustomHours || type === "training", 
            task: showTask, 
            reason: showReason 
        });
        this.showElement("allocationInfo");

        hoursInput.value = hours;
        hoursInput.max = 24;
        hoursInput.disabled = false;
        this.updateHoursIndicator(hours);
        projectSelect.required = false;

        this.showAllocationInfo(type);
    }

    toggleGroup({ project, hours, task, reason }) {
        const actions = [
            [project, "projectGroup"],
            [hours, "hoursGroup"],
            [task, "taskGroup"],
            [reason, "reasonGroup"]
        ];

        actions.forEach(([show, id]) => {
            show ? this.showElement(id) : this.hideElement(id);
        });
    }

    updateHoursIndicator(hours) {
        const el = document.getElementById("hoursIndicator");
        if (!el) return;
        el.textContent = `${hours}h`;
        el.style.color = hours > 8 ? "#ff6b6b" : "#4ade80";
    }

    showAllocationInfo(type) {
        const box = document.getElementById("allocationInfo");
        const text = document.getElementById("allocationInfoText");
        if (!box || !text) return;

        box.className = "allocation-info";
        const info = INFO_MAP[type];
        if (info) {
            box.classList.add(info.class);
            text.innerHTML = `<i class='fas fa-${info.icon}'></i> <strong>${info.text}</strong>`;
        }
    }

    async loadEmployeeProjects() {
        const select = document.getElementById("projectSelect");
        if (!select) return;

        try {
            const userId = await this.getUserId(this.selectedEmployee);

            // Use cache if available
            const cacheKey = `${userId}-${this.pmId}`;
            if (this.projectCache.has(cacheKey)) {
                this.renderProjectOptions(select, this.projectCache.get(cacheKey), userId);
                return;
            }

            const { data: assignments } = await supabase
                .from("project_assignments")
                .select("project_id, projects(id, name, created_by)")
                .eq("user_id", userId)
                .eq("status", "assigned");

            const projectList = (assignments || [])
                .map(a => a.projects)
                .filter(p => !this.pmId || p.created_by === this.pmId);

            const uniqueProjects = [...new Map(projectList.map(p => [p.id, p])).values()];
            
            // Cache the projects
            this.projectCache.set(cacheKey, uniqueProjects);

            this.renderProjectOptions(select, uniqueProjects, userId);
        } catch (e) {
            console.error("Error loading projects:", e);
            select.innerHTML = `<option>Error loading projects</option>`;
        }
    }

    async renderProjectOptions(select, projects, userId) {
        select.innerHTML = `<option value=''>Select Project</option>`;

        if (!projects.length) {
            select.innerHTML = `<option disabled>No projects assigned</option>`;
            return;
        }

        // Batch fetch all worklogs for this date
        const projectIds = projects.map(p => p.id);
        const { data: logs } = await supabase
            .from("worklogs")
            .select("project_id, hours")
            .eq("user_id", userId)
            .in("project_id", projectIds)
            .eq("log_date", this.selectedDate);

        // Calculate totals per project
        const totals = new Map();
        logs?.forEach(log => {
            const current = totals.get(log.project_id) || 0;
            totals.set(log.project_id, current + Number(log.hours || 0));
        });

        // Create options
        const fragment = document.createDocumentFragment();
        projects.forEach(proj => {
            const total = totals.get(proj.id) || 0;
            const opt = document.createElement("option");
            opt.value = proj.id;
            opt.textContent = total ? `${proj.name} (Currently: ${total}h)` : proj.name;
            fragment.appendChild(opt);
        });

        select.appendChild(fragment);
    }

    async getDefaultProject(userId) {
        try {
            const { data } = await supabase
                .from("project_assignments")
                .select("projects(id,created_by)")
                .eq("user_id", userId)
                .eq("status", "assigned");

            const projectList = (data || [])
                .map(a => a.projects)
                .filter(p => !this.pmId || p.created_by === this.pmId);

            return projectList.length ? projectList[0].id : null;
        } catch {
            return null;
        }
    }

    async saveAllocation() {
        try {
            // Validation checks
            if (this.isDayBlocked()) {
                const blockType = this.existingEntries.find(e => 
                    BLOCKING_TYPES.includes(e.work_type)
                )?.work_type;
                const typeName = capitalize(blockType || 'blocked');
                return this.showMessage(
                    `Cannot add entries. This day is marked as ${typeName}.`, 
                    "error"
                );
            }

            if (!this.currentAction) {
                return this.showMessage("Please select an action.", "error");
            }

            if (this.hasDuplicateType(this.currentAction)) {
                return this.showMessage(
                    `This day already has a ${capitalize(this.currentAction)} entry.`, 
                    "warning"
                );
            }

            const userId = await this.getUserId(this.selectedEmployee);
            const hoursInput = Number(document.getElementById("hoursInput").value || 0);
            const reason = document.getElementById("reasonInput")?.value?.trim();
            const task = document.getElementById("taskInput")?.value?.trim();
            const projectVal = document.getElementById("projectSelect")?.value;

            const finalData = {
                user_id: userId,
                project_id: null,
                log_date: this.selectedDate,
                hours: 0,
                work_description: "",
                work_type: this.currentAction,
                status: "in progress"
            };

            // Handle work types
            if (this.currentAction === "work" || this.currentAction === "work_from_home") {
                if (!projectVal) {
                    return this.showMessage("Please select a project.", "error");
                }

                if (hoursInput <= 0 || hoursInput > 24) {
                    return this.showMessage("Hours must be between 1 and 24.", "error");
                }

                const currentTotal = this.existingEntries.reduce(
                    (sum, e) => sum + Number(e.hours || 0), 0
                );
                const newTotal = currentTotal + hoursInput;

                if (this.hasHoliday() && newTotal > 16) {
                    if (!confirm(`Total hours will be ${newTotal}h (including 8h holiday). Continue?`)) {
                        return;
                    }
                }

                finalData.project_id = Number(projectVal);
                finalData.hours = hoursInput;
                finalData.work_description = this.currentAction === "work_from_home"
                    ? `[WFH] ${task || "Work from home"}`
                    : task || "Work assigned";

            } else {
                // Handle non-work types
                const defaultProject = await this.getDefaultProject(userId);
                if (!defaultProject) {
                    return this.showMessage(
                        "Employee must be assigned to at least one project.", 
                        "error"
                    );
                }

                finalData.project_id = defaultProject;

                if (this.currentAction === "other" && !reason) {
                    return this.showMessage("Please provide a reason.", "error");
                }

                if (hoursInput < 0 || hoursInput > 24) {
                    return this.showMessage("Hours must be 0–24.", "error");
                }

                finalData.hours = this.currentAction === "absent" ? 0
                    : this.currentAction === "other" ? hoursInput
                    : this.currentAction === "training" ? hoursInput
                    : 8;

                finalData.work_description = reason || capitalize(this.currentAction);
                finalData.status = this.currentAction === "absent" ? "absent" : "leave";
            }

            if (!finalData.project_id) {
                return this.showMessage("Project ID missing.", "error");
            }

            const { error } = await supabase.from("worklogs").insert(finalData);
            if (error) throw error;

            this.close();
            this.showMessage("Hours allocated successfully.", "success");
            window.dispatchEvent(new CustomEvent("allocationSaved"));

        } catch (e) {
            console.error("Save allocation error:", e);
            this.showMessage("Failed to save: " + e.message, "error");
        }
    }
}

// ============================================
// EXPORT
// ============================================
export const allocateHoursModal = new AllocateHoursModal();