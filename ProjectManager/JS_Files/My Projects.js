// My Projects (Optimized)
// Purpose: Same functionality and output as original but cleaner, DRYer, and more maintainable.

import { supabase } from "../../supabaseClient.js";

/* ==========================
   Small DOM helpers
   ========================== */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const setText = (el, txt) => { if (el) el.textContent = txt; };

/* ==========================
   User display
   ========================== */
export async function updateUserNameDisplayEnhanced() {
  const userNameElement = $('#userName');
  const userAvatarElement = document.querySelector('.user-avatar');
  if (!userNameElement) return console.warn('[USER DISPLAY] userName element not found');

  try {
    const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || '{}');
    let displayName = '';

    if (loggedUser.name) {
      displayName = loggedUser.name;
    } else if (loggedUser.email) {
      try {
        const { data: userData, error } = await supabase
          .from('users')
          .select('name')
          .eq('email', loggedUser.email)
          .single();

        if (!error && userData?.name) {
          displayName = userData.name;
          loggedUser.name = userData.name;
          localStorage.setItem('loggedUser', JSON.stringify(loggedUser));
        } else {
          displayName = loggedUser.email.split('@')[0];
        }
      } catch (dbError) {
        console.error('[USER DISPLAY] Error fetching from Supabase:', dbError);
        displayName = loggedUser.email.split('@')[0];
      }
    } else {
      displayName = 'Project Manager';
      console.warn('[USER DISPLAY] No user information found');
    }

    setText(userNameElement, displayName);

    if (userAvatarElement && displayName) {
      const initials = displayName.split(' ').map(w => w[0]?.toUpperCase() || '').join('').slice(0,2);
      userAvatarElement.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=000&color=fff`;
      userAvatarElement.alt = initials;
    }

    console.log('[USER DISPLAY] User name updated to:', displayName);
  } catch (err) {
    console.error('[USER DISPLAY] Error updating user name:', err);
    setText($('#userName'), 'Project Manager');
  }
}

/* ==========================
   Modal & Message Managers
   ========================== */
class ModalManager {
  static toggle(modalId, show) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.toggle('active', !!show);
    document.body.style.overflow = show ? 'hidden' : '';
  }
  static show(id){ this.toggle(id, true); }
  static hide(id){ this.toggle(id, false); }
  static showLoading(){ this.show('loadingOverlay'); }
  static hideLoading(){ this.hide('loadingOverlay'); }
}

class MessageManager {
  static _container(){ return document.getElementById('messageContainer'); }
  static _create(message, type){
    const container = this._container(); if(!container) return;
    const box = document.createElement('div');
    box.className = `message-box ${type}`;
    const icon = document.createElement('i');
    icon.className = `fas ${{
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    }[type] || 'fa-info-circle'}`;

    const text = document.createElement('span'); text.textContent = message;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'message-close';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.addEventListener('click', () => box.remove());

    box.append(icon, text, closeBtn);
    container.appendChild(box);
    setTimeout(() => box.remove(), 5000);
  }
  static success(m){ this._create(m,'success'); }
  static error(m){ this._create(m,'error'); }
  static warning(m){ this._create(m,'warning'); }
  static info(m){ this._create(m,'info'); }
}

/* ==========================
   Utils
   ========================== */
const debounce = (fn, wait = 300) => {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
};

const formatDate = (dateString) => {
  if(!dateString) return 'Not specified';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const statusMap = {
  active: 'Active',
  ongoing: 'Active',
  planning: 'Planning',
  completed: 'Completed',
  'on-hold': 'On Hold',
  pending: 'Pending Approval',
  cancelled: 'Cancelled'
};
const formatStatus = s => statusMap[s] || (s ? (s.charAt(0).toUpperCase() + s.slice(1)) : '');

/* ==========================
   PMDataService (Supabase)
   ========================== */
class PMDataService {
  constructor(){ this.currentPMId = null; this.currentPMEmail = null; }

  async initialize(){
    const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || '{}');
    if (!loggedUser.email) throw new Error('No logged in user found');

    this.currentPMEmail = loggedUser.email;

    const { data: userData, error } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('email', this.currentPMEmail)
      .eq('role', 'project_manager')
      .single();

    if (error) { console.error('[PM DATA SERVICE] Error fetching PM user:', error); throw error; }
    this.currentPMId = userData.id;
    console.log('[PM DATA SERVICE] Initialized for PM:', userData);
  }

  async getProjects(){
    try {
      const { data: approvedProjects, error: projectsError } = await supabase
        .from('projects')
        .select(`id,name,description,status,priority,start_date,end_date,duration_days,created_at`)
        .eq('created_by', this.currentPMId)
        .not('status', 'in', '(completed,cancelled)')
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      const { data: pendingRequests, error: requestsError } = await supabase
        .from('resource_requests')
        .select('*')
        .eq('requested_by', this.currentPMId)
        .eq('status', 'pending');

      if (requestsError) throw requestsError;

      // Reconstruct pending projects
      const pendingProjectsMap = {};
      (pendingRequests || []).forEach(req => {
        try {
          const parsed = JSON.parse(req.notes || '{}');
          if (!parsed.projectName || !parsed.requestGroupId) return;
          const key = parsed.requestGroupId;
          if (!pendingProjectsMap[key]) {
            pendingProjectsMap[key] = {
              id: `pending_${key}`,
              name: parsed.projectName,
              description: parsed.projectDescription || 'No description',
              status: 'pending',
              priority: parsed.priority || 'medium',
              start_date: parsed.startDate,
              end_date: parsed.endDate,
              duration_days: parsed.durationDays,
              isPending: true,
              requestCount: 0,
              totalResources: 0
            };
          }
          pendingProjectsMap[key].requestCount++;
          pendingProjectsMap[key].totalResources += parsed.resourceDetails?.quantity || 1;
        } catch(e){ /* ignore malformed */ }
      });

      const pendingProjects = Object.values(pendingProjectsMap);

      // For each approved project, fetch assignments and PM allocations in parallel
      const projectsWithTeam = await Promise.all((approvedProjects || []).map(async project => {
        const [{ data: rmAssignments, error: rmError }, { data: pmAssignments, error: pmError }] = await Promise.all([
          supabase.from('project_assignments').select('user_id').eq('project_id', project.id).eq('status','assigned'),
          // only fetch pm allocations after we have assigned RM ids
          Promise.resolve({ data: [], error: null })
        ]);

        if (rmError) console.error('Error fetching RM assignments:', rmError);

        const rmCount = (rmAssignments || []).length;

        let pmCount = 0;
        if (rmCount > 0) {
          const assignedUserIds = (rmAssignments || []).map(a => a.user_id);
          const { data: pmAlloc, error: pmAllocErr } = await supabase
            .from('employee_assigned')
            .select('user_id')
            .eq('project_id', project.id)
            .in('user_id', assignedUserIds);
          if (pmAllocErr) console.error('Error fetching PM allocations:', pmAllocErr);
          pmCount = new Set((pmAlloc || []).map(a => a.user_id)).size;
        }

        return { ...project, rmAssignedCount: rmCount, pmAllocatedCount: pmCount, teamSize: rmCount, isPending: false };
      }));

      const pendingWithMeta = pendingProjects.map(p => ({ ...p, rmAssignedCount: 0, pmAllocatedCount: 0, teamSize: p.totalResources }));

      const all = [...pendingWithMeta, ...projectsWithTeam];
      console.log('[PM DATA SERVICE] Total projects:', all.length);
      return all;
    } catch (err) {
      console.error('[PM DATA SERVICE] Error fetching projects:', err);
      return [];
    }
  }

  async getProjectRequirements(projectId){
    try {
      if (String(projectId).startsWith('pending_')) return 0;
      const { data, error } = await supabase.from('project_requirements').select('quantity_needed').eq('project_id', projectId);
      if (error) throw error;
      return (data || []).reduce((s, r) => s + (r.quantity_needed || 0), 0);
    } catch (err) {
      console.error('[PM DATA SERVICE] Error fetching project requirements:', err);
      return 0;
    }
  }

  async getAssignedEmployeesForProject(projectId){
    try {
      if (String(projectId).startsWith('pending_')) return [];

      const { data: assignments, error } = await supabase
        .from('project_assignments')
        .select(`user_id,role_in_project,assigned_hours,assignment_type,allocation_percent,users(id,name,email,user_details(job_title,status,skills))`)
        .eq('project_id', projectId)
        .eq('status','assigned');

      if (error) throw error;

      const { data: pmAllocations = [], error: allocError } = await supabase
        .from('employee_assigned')
        .select('user_id,assigned_hours_per_day')
        .eq('project_id', projectId);

      if (allocError) throw allocError;

      const allocatedHoursPerDay = {};
      (pmAllocations || []).forEach(a => { allocatedHoursPerDay[a.user_id] = (allocatedHoursPerDay[a.user_id] || 0) + parseFloat(a.assigned_hours_per_day || 0); });

      const unique = {};
      (assignments || []).forEach(asg => {
        const user = asg.users;
        if (!user || unique[user.id]) return;
        const weeklyHours = asg.assigned_hours || 40;
        const assignmentType = asg.assignment_type || 'Full-Time';
        let maxHoursPerDay = assignmentType === 'Full-Time' ? 8 : (assignmentType === 'Part-Time' ? 4 : Math.min(8, Math.floor(weeklyHours/5)));
        const allocatedPerDay = allocatedHoursPerDay[user.id] || 0;
        const availablePerDay = Math.max(maxHoursPerDay - allocatedPerDay, 0);

        unique[user.id] = {
          id: user.id,
          name: user.name,
          role: user.user_details?.[0]?.job_title || asg.role_in_project || 'Team Member',
          email: user.email,
          status: user.user_details?.[0]?.status || 'Available',
          weeklyHours,
          assignmentType,
          maxHoursPerDay,
          allocatedHoursPerDay: allocatedPerDay,
          availableHoursPerDay: availablePerDay,
          skills: user.user_details?.[0]?.skills || [],
          allocationPercent: asg.allocation_percent || 100
        };
      });

      return Object.values(unique);
    } catch (err) {
      console.error('[PM DATA SERVICE] Error fetching assigned employees:', err);
      return [];
    }
  }

  async allocateHours({ employeeId, projectId, hoursPerDay, startDate, endDate, taskDescription }){
    try {
      await supabase.from('employee_assigned').insert({
        user_id: parseInt(employeeId,10),
        project_id: parseInt(projectId,10),
        assigned_hours_per_day: parseFloat(hoursPerDay),
        start_date: startDate,
        end_date: endDate,
        description: taskDescription || 'Assigned work',
        created_by: this.currentPMId
      });

      const { data: updatedProject } = await supabase.from('projects').update({ status: 'active' }).eq('id', parseInt(projectId,10)).select('id,status').single();
      return { success: true, updatedStatus: updatedProject?.status || 'active' };
    } catch (err) {
      console.error('[PM DATA SERVICE] Error allocating hours:', err);
      throw err;
    }
  }
}

/* ==========================
   MyProjectsApp
   ========================== */
class MyProjectsApp {
  constructor(){
    this.dataService = new PMDataService();
    this.allProjects = [];
    this.assignedEmployees = [];
    this.currentProjectId = null;
    this.currentProjectRequiredCount = 0;

    // cache DOM
    this.dom = {
      projectsGrid: $('#projectsGrid'),
      searchInput: $('#projectSearch'),
      statusFilter: $('#projectStatusFilter'),
      employeeSelect: $('#employeeSelect'),
      allocateForm: $('#allocateForm'),
      availabilityDisplay: $('#availabilityDisplay'),
      assignmentNotification: $('#assignmentNotification')
    };

    this.filterDebounced = debounce(() => this.filterProjects(), 300);
  }

  async init(){
    try {
      ModalManager.showLoading();
      await this.dataService.initialize();
      await updateUserNameDisplayEnhanced();
      this.setupEventListeners();
      await this.loadProjects();
    } catch (err) {
      console.error('[MY PROJECTS APP] Initialization error:', err);
      MessageManager.error('Failed to initialize. Please login again.');
      setTimeout(() => { window.location.href = "/login/HTML_Files/login.html"; }, 2000);
    } finally { ModalManager.hideLoading(); }
  }

  setupEventListeners(){
    const { searchInput, statusFilter, allocateForm, employeeSelect } = this.dom;

    // global delegation for card actions
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.project-card');
      if (!card) return;
      if (e.target.closest('.btn-allocate')) this.openAllocateModal(card);
      if (e.target.closest('.btn-view')) this.viewProject(card);
    });

    $('#logoutBtn')?.addEventListener('click', () => ModalManager.show('logoutModal'));

    if (searchInput) searchInput.addEventListener('input', () => this.filterDebounced());
    if (statusFilter) statusFilter.addEventListener('change', () => this.filterProjects());

    $('#closeAllocateModal')?.addEventListener('click', () => ModalManager.hide('allocateHoursModal'));
    $('#cancelAllocate')?.addEventListener('click', () => ModalManager.hide('allocateHoursModal'));

    allocateForm?.addEventListener('submit', (e) => { e.preventDefault(); this.submitAllocation(); });

    employeeSelect?.addEventListener('change', (e) => this.updateAvailability(e.target.value));

    $('#closeViewProjectModal')?.addEventListener('click', () => ModalManager.hide('viewProjectModal'));
    $('#closeProjectBtn')?.addEventListener('click', () => ModalManager.hide('viewProjectModal'));

    $('#cancelLogout')?.addEventListener('click', () => ModalManager.hide('logoutModal'));
    $('#confirmLogout')?.addEventListener('click', () => this.handleLogout());

    // overlay click to close modals
    $$('.modal-overlay').forEach(overlay => overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.classList.remove('active'); document.body.style.overflow = ''; } }));
  }

  async loadProjects(){
    try {
      this.allProjects = await this.dataService.getProjects();
      this.renderProjects(this.allProjects);
    } catch (err) { console.error('[MY PROJECTS APP] Error loading projects:', err); MessageManager.error('Failed to load projects'); }
  }

  async loadAssignedEmployees(projectId){
    try {
      this.currentProjectRequiredCount = await this.dataService.getProjectRequirements(projectId);
      this.assignedEmployees = await this.dataService.getAssignedEmployeesForProject(projectId);
      this.populateEmployeeDropdown();
      this.showAssignmentNotification();
    } catch (err) {
      console.error('[MY PROJECTS APP] Error loading assigned employees:', err);
      this.assignedEmployees = [];
      this.populateEmployeeDropdown();
    }
  }

  showAssignmentNotification(){
    const div = this.dom.assignmentNotification; if(!div) return;
    const assignedCount = this.assignedEmployees.length; const requiredCount = this.currentProjectRequiredCount;

    if (String(this.currentProjectId).startsWith('pending_')){
      div.style.display = 'block'; div.className = 'assignment-notification warning';
      div.innerHTML = `<i class="fas fa-hourglass-half"></i><span>⏳ This project is pending Resource Manager approval. You cannot allocate hours yet.</span>`;
      return;
    }

    if (requiredCount === 0) { div.style.display = 'none'; return; }

    div.style.display = 'block';
    if (assignedCount === 0) {
      div.className = 'assignment-notification warning';
      div.innerHTML = `<i class="fas fa-exclamation-circle"></i><span>⚠️ No employees assigned yet. Resource Manager needs to assign ${requiredCount} employee(s).</span>`;
    } else if (assignedCount < requiredCount) {
      div.className = 'assignment-notification info';
      div.innerHTML = `<i class="fas fa-info-circle"></i><span>ℹ️ ${assignedCount}/${requiredCount} employees assigned by Resource Manager. Waiting for ${requiredCount - assignedCount} more.</span>`;
    } else {
      div.className = 'assignment-notification success';
      div.innerHTML = `<i class="fas fa-check-circle"></i><span>✓ All ${assignedCount}/${requiredCount} employees assigned by Resource Manager. You can now allocate hours.</span>`;
    }
  }

  populateEmployeeDropdown(){
    const select = this.dom.employeeSelect; if(!select) return;
    select.innerHTML = '<option value="">Select Team Member</option>';

    if (!this.assignedEmployees || this.assignedEmployees.length === 0){
      const opt = document.createElement('option'); opt.value = ''; opt.textContent = 'No employees assigned by Resource Manager yet'; opt.disabled = true; select.appendChild(opt); return;
    }

    const avail = this.assignedEmployees.filter(e => e.availableHoursPerDay > 0).sort((a,b)=>a.name.localeCompare(b.name));
    const busy = this.assignedEmployees.filter(e => e.availableHoursPerDay <= 0).sort((a,b)=>a.name.localeCompare(b.name));

    const createOpt = (emp, unavailable = false) => {
      const o = document.createElement('option');
      o.value = emp.id; o.textContent = `${emp.name} - ${emp.role} (${ unavailable ? 'Fully Allocated' : `${emp.availableHoursPerDay}h/day available` })`;
      if (unavailable) { o.disabled = true; o.style.color = '#999'; }
      // store metadata
      o.dataset.employeeId = emp.id; o.dataset.name = emp.name; o.dataset.role = emp.role;
      o.dataset.maxHoursPerDay = emp.maxHoursPerDay; o.dataset.availableHoursPerDay = emp.availableHoursPerDay; o.dataset.allocatedHoursPerDay = emp.allocatedHoursPerDay; o.dataset.weeklyHours = emp.weeklyHours; o.dataset.assignmentType = emp.assignmentType; o.dataset.allocationPercent = emp.allocationPercent; o.dataset.skills = JSON.stringify(emp.skills || []);
      return o;
    };

    avail.forEach(a => select.appendChild(createOpt(a, false)));
    if (avail.length && busy.length) {
      const sep = document.createElement('option'); sep.disabled = true; sep.textContent = '--- Fully Allocated ---'; select.appendChild(sep);
    }
    busy.forEach(b => select.appendChild(createOpt(b, true)));
  }

  renderProjects(projects){
    const grid = this.dom.projectsGrid; if(!grid) return;
    grid.innerHTML = '';

    if (!projects || projects.length === 0){
      grid.innerHTML = `<div class="empty-state"><i class="fas fa-folder-open"></i><h3>No Projects Found</h3><p>Start by creating a new project</p></div>`; return;
    }

    projects.forEach(p => grid.appendChild(this.createProjectCard(p)));
  }

  createProjectCard(project){
    const card = document.createElement('div');
    card.className = 'project-card';
    card.dataset.id = project.id; card.dataset.status = project.status; card.dataset.isPending = project.isPending || false;
    card.dataset.rmAssignedCount = project.rmAssignedCount; card.dataset.pmAllocatedCount = project.pmAllocatedCount;

    const statusClass = (project.status === 'active' || project.status === 'ongoing') ? 'active' : project.status;

    let statusBadge = `<span class="project-status ${statusClass}">${formatStatus(project.status)}</span>`;
    if (!project.isPending && project.pmAllocatedCount > 0) {
      statusBadge += `<span class="pm-indicator" title="You have allocated hours to ${project.pmAllocatedCount} team member(s)"><i class="fas fa-user-check"></i> ${project.pmAllocatedCount} allocated</span>`;
    }
    if (project.isPending) {
      statusBadge += `<span class="pending-indicator" title="Awaiting Resource Manager approval"><i class="fas fa-clock"></i> ${project.requestCount} resource request(s)</span>`;
    }

    card.innerHTML = `
      <div class="project-card-header">
        <div>
          <h3>${project.name}</h3>
          <div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap;">${statusBadge}</div>
        </div>
      </div>
      <div class="project-card-meta">
        <span><i class="fas fa-calendar"></i> ${formatDate(project.end_date || project.start_date)}</span>
        <span><i class="fas fa-users"></i> ${project.isPending ? `${project.teamSize} requested` : `${project.rmAssignedCount} assigned by RM`}</span>
      </div>
      <p class="project-card-description">${project.description || 'No description provided'}</p>
      <div class="project-card-actions">
        <button class="btn-view"><i class="fas fa-eye"></i> View</button>
        <button class="btn-allocate" ${project.isPending ? 'disabled title="Cannot allocate hours until RM approves"' : ''}><i class="fas fa-clock"></i> ${project.isPending ? 'Pending Approval' : 'Allocate Hours'}</button>
      </div>
    `;

    return card;
  }

  filterProjects(){
    const searchTerm = ($('#projectSearch')?.value || '').toLowerCase().trim();
    const status = $('#projectStatusFilter')?.value;
    let result = this.allProjects || [];
    if (searchTerm) result = result.filter(p => (p.name || '').toLowerCase().includes(searchTerm) || (p.description || '').toLowerCase().includes(searchTerm));
    if (status) {
      const statusToMatch = status === 'active' ? ['ongoing','active'] : [status];
      result = result.filter(p => statusToMatch.includes(p.status));
    }
    this.renderProjects(result);
  }

  async openAllocateModal(card){
    const projectId = card.dataset.id; const isPending = card.dataset.isPending === 'true'; const projectName = card.querySelector('h3')?.textContent || '';
    if (isPending) { MessageManager.warning('Cannot allocate hours to pending projects. Wait for Resource Manager approval.'); return; }

    this.currentProjectId = projectId; $('#modalProjectName') && setText($('#modalProjectName'), projectName);
    $('#allocateForm')?.reset(); this.dom.availabilityDisplay && (this.dom.availabilityDisplay.style.display = 'none');

    ModalManager.showLoading();
    await this.loadAssignedEmployees(projectId);

    const project = this.allProjects.find(p => String(p.id) === String(projectId));
    if (project?.end_date) $('#endDate') && ($('#endDate').value = project.end_date);

    ModalManager.hideLoading();
    ModalManager.show('allocateHoursModal');
  }

  updateAvailability(employeeId){
    const availDisplay = this.dom.availabilityDisplay; const hoursPerDayInput = $('#hoursPerDay');
    if (!availDisplay) return;
    if (!employeeId) { availDisplay.style.display = 'none'; if (hoursPerDayInput) hoursPerDayInput.max = 8; return; }

    const employee = this.assignedEmployees.find(e => String(e.id) === String(employeeId));
    if (!employee) return;

    const isAvailable = employee.availableHoursPerDay > 0;
    if (hoursPerDayInput) { hoursPerDayInput.max = employee.availableHoursPerDay; hoursPerDayInput.value = Math.min(hoursPerDayInput.value || employee.availableHoursPerDay, employee.availableHoursPerDay); }

    availDisplay.style.display = 'block';
    const badge = availDisplay.querySelector('.availability-badge'); if (badge) { badge.className = `availability-badge ${isAvailable ? 'available' : 'busy'}`; badge.innerHTML = `<i class="fas fa-${isAvailable ? 'check' : 'times'}-circle"></i> ${isAvailable ? 'Available' : 'Fully Allocated'}`; }

    const assignmentInfo = availDisplay.querySelector('.assignment-info'); if (assignmentInfo) assignmentInfo.innerHTML = `<div class="info-item"><span class="info-label">Assignment Type:</span><span class="info-value"><strong>${employee.assignmentType}</strong> (${employee.weeklyHours}h/week)</span></div><div class="info-item"><span class="info-label">Max Hours Per Day:</span><span class="info-value"><strong>${employee.maxHoursPerDay}h/day</strong></span></div>`;

    const utilizationInfo = availDisplay.querySelector('.utilization-info'); if (utilizationInfo) {
      const utilizationPercent = employee.maxHoursPerDay > 0 ? Math.round((employee.allocatedHoursPerDay/employee.maxHoursPerDay)*100) : 0;
      utilizationInfo.innerHTML = `<div class="info-item"><span class="info-label">Current Utilization:</span><span class="info-value">${utilizationPercent}% (${employee.allocatedHoursPerDay}h/${employee.maxHoursPerDay}h per day)</span></div><div class="info-item"><span class="info-label">Available Hours:</span><span class="info-value ${employee.availableHoursPerDay>0? 'success':''}">${employee.availableHoursPerDay}h/day remaining</span></div>`;
    }

    const skillsInfo = availDisplay.querySelector('.skills-info');
    if (skillsInfo) {
      if (employee.skills?.length) skillsInfo.innerHTML = `<div class="info-item"><span class="info-label">Skills:</span><div class="skills-display">${employee.skills.map(s=>`<span class="skill-tag">${s}</span>`).join('')}</div></div>`;
      else skillsInfo.innerHTML = `<div class="info-item"><span class="info-label">Skills:</span><span class="info-value">No skills listed</span></div>`;
    }
  }

  async submitAllocation(){
    const employeeId = $('#employeeSelect')?.value; const startDate = $('#startDate')?.value; const endDate = $('#endDate')?.value; const hoursPerDay = parseFloat($('#hoursPerDay')?.value || 0); const taskDescription = $('#taskDescription')?.value;

    if (!employeeId) { MessageManager.error('Please select an employee'); return; }
    if (!startDate || !endDate) { MessageManager.error('Please select start and end dates'); return; }
    const employee = this.assignedEmployees.find(e => String(e.id) === String(employeeId)); if (!employee) { MessageManager.error('Invalid employee selection'); return; }
    if (hoursPerDay <= 0 || hoursPerDay > employee.availableHoursPerDay) { MessageManager.error(`Hours per day must be between 0 and ${employee.availableHoursPerDay} (employee's available hours)`); return; }
    if (new Date(endDate) < new Date(startDate)) { MessageManager.error('End date must be after start date'); return; }

    try {
      ModalManager.hide('allocateHoursModal'); ModalManager.showLoading();
      const data = { projectId: this.currentProjectId, employeeId, startDate, endDate, hoursPerDay, taskDescription };
      const result = await this.dataService.allocateHours(data);
      await this.loadProjects();
      MessageManager.success(`Hours allocated successfully! Project is now ${result.updatedStatus.toUpperCase()}.`);
    } catch (err) {
      console.error('Error allocating hours:', err); MessageManager.error('Failed to allocate hours: ' + (err?.message || err));
    } finally { ModalManager.hideLoading(); }
  }

  viewProject(card){
    const projectId = card.dataset.id; const isPending = card.dataset.isPending === 'true';
    const project = this.allProjects.find(p => String(p.id) === String(projectId)); if (!project) return;

    setText($('#viewProjectName'), project.name);
    const statusElem = $('#viewProjectStatus'); if (statusElem) { setText(statusElem, formatStatus(project.status)); statusElem.className = `project-status ${(project.status==='ongoing'||project.status==='active')? 'active' : project.status}`; }
    setText($('#viewProjectDescription'), project.description || 'No description provided');
    setText($('#viewProjectDeadline'), formatDate(project.end_date || project.start_date));
    setText($('#viewProjectTeamSize'), project.isPending ? `${project.teamSize} resources requested` : `${project.teamSize} members`);
    setText($('#viewProjectBudget'), project.duration_days ? `${project.duration_days} days` : 'Not specified');

    ModalManager.show('viewProjectModal');
  }

  openLogoutModal(){ ModalManager.show('logoutModal'); }

  handleLogout(){
    localStorage.removeItem('loggedUser'); sessionStorage.clear(); ModalManager.hide('logoutModal'); ModalManager.showLoading();
    setTimeout(() => { window.location.href = "/login/HTML_Files/login.html"; }, 500);
  }
}

// Initialization
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new MyProjectsApp();
  app.init();
  window.app = app; // expose globally for other modules
});
