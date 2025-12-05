// PROJECT MANAGER (PM) Dashboard - Optimized
// - Same functionality & output as original, but cleaner, DRY-er, and more performant

import { supabase } from "../../supabaseClient.js";
import { allocateHoursModal } from "./Dashboard-modal.js";

/* ======================================================================
   Helpers
   ======================================================================*/
const q = selector => document.querySelector(selector);
const qId = id => document.getElementById(id);
const safeParse = (s, fallback = {}) => {
  try { return JSON.parse(s || "null") || fallback; } catch { return fallback; }
};

function toIsoDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMondayOf(date = new Date()) {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.getFullYear(), date.getMonth(), diff);
}

/* ======================================================================
   UI Utilities
   ======================================================================*/
async function updateUserNameDisplayEnhanced() {
  const userNameElement = qId('userName');
  const userAvatarElement = q('.user-avatar');
  if (!userNameElement) return console.warn('[USER DISPLAY] userName element not found');

  try {
    const loggedUser = safeParse(localStorage.getItem('loggedUser'));
    let displayName = '';

    if (loggedUser.name) {
      displayName = loggedUser.name;
    } else if (loggedUser.email) {
      // try fetch name once
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
    } else {
      displayName = 'Project Manager';
      console.warn('[USER DISPLAY] No user information found');
    }

    userNameElement.textContent = displayName;

    if (userAvatarElement && displayName) {
      const initials = displayName.split(' ').map(w => w[0]?.toUpperCase() || '').join('').slice(0,2);
      userAvatarElement.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=000&color=fff`;
      userAvatarElement.alt = initials;
    }
  } catch (err) {
    console.error('[USER DISPLAY] Error updating user name:', err);
    if (userNameElement) userNameElement.textContent = 'Project Manager';
  }
}

class ModalManager {
  static toggle(modalId, show) {
    const modal = qId(modalId);
    if (!modal) return;
    modal.classList.toggle('active', !!show);
    document.body.style.overflow = show ? 'hidden' : '';
  }
  static show(id) { this.toggle(id, true); }
  static hide(id) { this.toggle(id, false); }
  static showLoading() { this.show('loadingOverlay'); }
  static hideLoading() { this.hide('loadingOverlay'); }
}

class MessageManager {
  static _container() { return qId('messageContainer'); }
  static show(message, type = 'info') {
    const container = this._container();
    if (!container) return;
    const box = document.createElement('div');
    box.className = `message-box ${type}`;
    box.innerHTML = `
      <i class="fas ${{
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
      }[type] || 'fa-info-circle'}"></i>
      <span>${message}</span>
      <button class="message-close"><i class="fas fa-times"></i></button>
    `;
    box.querySelector('.message-close').addEventListener('click', () => box.remove());
    container.appendChild(box);
    setTimeout(() => box.remove(), 5000);
  }
  static success(m){this.show(m,'success')} 
  static error(m){this.show(m,'error')} 
  static warning(m){this.show(m,'warning')} 
  static info(m){this.show(m,'info')}
}

/* ======================================================================
   PM Data Service (Supabase) - optimized to reduce duplicate queries
   ======================================================================*/
class PMDataService {
  constructor() {
    this.currentPMId = null;
    this.currentPMEmail = null;
    this.cache = { projects: null, teamMembers: null, timestamp: 0 };
    this.cacheTimeout = 30_000; // 30s
  }

  async initialize() {
    const loggedUser = safeParse(localStorage.getItem('loggedUser'));
    if (!loggedUser.email) throw new Error('No logged in user found');
    this.currentPMEmail = loggedUser.email;

    const { data: userData, error } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('email', this.currentPMEmail)
      .eq('role', 'project_manager')
      .single();

    if (error) throw error;
    this.currentPMId = userData.id;
    return userData;
  }

  isCacheValid() { return (Date.now() - this.cache.timestamp) < this.cacheTimeout; }
  clearCache() { this.cache = { projects: null, teamMembers: null, timestamp: 0 }; }

  // fetch projects (cached)
  async getProjects(force = false) {
    if (!force && this.isCacheValid() && this.cache.projects) return this.cache.projects;
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name, description, status, priority, start_date, end_date, duration_days')
      .eq('created_by', this.currentPMId)
      .in('status', ['pending', 'ongoing', 'active'])
      .order('created_at', { ascending: false });
    if (error) { console.error('[PM DATA SERVICE] getProjects error', error); return []; }
    this.cache.projects = projects || [];
    this.cache.timestamp = Date.now();
    return this.cache.projects;
  }

  async getTeamMembers(force = false) {
    if (!force && this.isCacheValid() && this.cache.teamMembers) return this.cache.teamMembers;

    // derive project ids (avoid duplicate request)
    const projects = await this.getProjects();
    const projectIds = projects.map(p => p.id);
    if (projectIds.length === 0) { this.cache.teamMembers = []; return []; }

    const { data: assignments, error } = await supabase
      .from('project_assignments')
      .select(`user_id, role_in_project, users ( id, name, email, user_details ( job_title, status, profile_pic ) )`)
      .in('project_id', projectIds)
      .eq('status', 'assigned');

    if (error) { console.error('[PM DATA SERVICE] getTeamMembers error', error); return []; }

    const unique = {};
    (assignments || []).forEach(a => {
      const user = a.users;
      if (!user || unique[user.id]) return;
      const det = (user.user_details && user.user_details[0]) || {};
      const profilePic = det.profile_pic;
      const avatar = (profilePic && profilePic.trim()) ? profilePic : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=4A90E2&color=fff`;

      unique[user.id] = {
        id: user.id,
        name: user.name,
        role: det.job_title || a.role_in_project || 'Team Member',
        email: user.email,
        status: det.status || 'Available',
        avatar
      };
    });

    const members = Object.values(unique);
    this.cache.teamMembers = members;
    this.cache.timestamp = Date.now();
    return members;
  }

  // Dashboard stats: optimized queries and parallelism
  async getDashboardStats() {
    try {
      const projects = await supabase
        .from('projects')
        .select('id, status')
        .eq('created_by', this.currentPMId)
        .in('status', ['pending', 'ongoing', 'active']);
      if (projects.error) throw projects.error;
      const projList = projects.data || [];
      const activeProjects = projList.length;
      const projectIds = projList.map(p => p.id);

      if (projectIds.length === 0) return { activeProjects: 0, teamMembers: 0, totalHours: 0, teamUtilization: 0 };

      const [assignRes, worklogRes] = await Promise.all([
        supabase.from('project_assignments').select('user_id, assigned_hours').in('project_id', projectIds).eq('status','assigned'),
        (async () => {
          const today = new Date();
          const monday = getMondayOf(today);
          const startDate = toIsoDate(monday);
          const endDate = toIsoDate(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 4));
          return await supabase.from('worklogs').select('hours').in('project_id', projectIds).gte('log_date', startDate).lte('log_date', endDate);
        })()
      ]);

      if (assignRes.error) throw assignRes.error;
      if (worklogRes.error) throw worklogRes.error;

      const assignments = assignRes.data || [];
      const worklogs = worklogRes.data || [];

      const uniqueTeamMembers = [...new Set(assignments.map(a => a.user_id))];
      const teamMembers = uniqueTeamMembers.length;
      const totalHours = Math.round((worklogs.reduce((s, w) => s + parseFloat(w.hours || 0), 0)) || 0);
      const totalAssignedHours = assignments.reduce((s, a) => s + parseInt(a.assigned_hours || 0), 0);
      const maxPossible = teamMembers * 40;
      const teamUtilization = maxPossible > 0 ? Math.round((totalAssignedHours / maxPossible) * 100) : 0;

      return { activeProjects, teamMembers, totalHours, teamUtilization };
    } catch (err) {
      console.error('[PM DATA SERVICE] getDashboardStats error', err);
      return { activeProjects: 0, teamMembers: 0, totalHours: 0, teamUtilization: 0 };
    }
  }

  // Weekly allocation - reuses projects and team members to avoid redundant calls
  async getWeeklyAllocation(weekStart) {
    try {
      const [year, month, day] = weekStart.split('-').map(Number);
      const base = new Date(year, month - 1, day);
      const dates = Array.from({length:5}, (_,i) => toIsoDate(new Date(base.getFullYear(), base.getMonth(), base.getDate()+i)));
      const dateMap = Object.fromEntries(dates.map((d,i) => [d,i]));

      const teamMembers = await this.getTeamMembers();
      const projects = await this.getProjects();
      const projectIds = projects.map(p => p.id);
      if (projectIds.length === 0) return [];

      const { data: worklogs, error } = await supabase
        .from('worklogs')
        .select('user_id, log_date, hours, work_type')
        .in('project_id', projectIds)
        .in('log_date', dates);

      if (error) throw error;

      const logs = worklogs || [];

      const allocation = teamMembers.map(member => {
        const daily = { mon: {hours:0,types:[]}, tue:{hours:0,types:[]}, wed:{hours:0,types:[]}, thu:{hours:0,types:[]}, fri:{hours:0,types:[]} };
        logs.filter(l => l.user_id === member.id).forEach(log => {
          const idx = dateMap[log.log_date];
          const keys = ['mon','tue','wed','thu','fri'];
          const key = keys[idx];
          if (!key) return;
          daily[key].hours += parseFloat(log.hours || 0);
          if (log.work_type && !daily[key].types.includes(log.work_type)) daily[key].types.push(log.work_type);
        });

        return { employee: member.name, role: member.role, avatar: member.avatar, ...daily };
      });

      return allocation;
    } catch (err) {
      console.error('[PM DATA SERVICE] getWeeklyAllocation error', err);
      return [];
    }
  }

  async getAvailableTeamMembers() {
    try {
      const teamMembers = await this.getTeamMembers();
      const projects = await this.getProjects();
      const projectIds = projects.map(p => p.id);
      if (projectIds.length === 0) return [];

      const { data: assignments, error } = await supabase
        .from('project_assignments')
        .select('user_id, assigned_hours')
        .in('project_id', projectIds)
        .eq('status', 'assigned');

      if (error) throw error;

      const userAssigned = {};
      (assignments || []).forEach(a => { userAssigned[a.user_id] = (userAssigned[a.user_id]||0) + parseInt(a.assigned_hours || 0); });

      const available = teamMembers.map(m => {
        const assignedHours = userAssigned[m.id] || 0;
        const availableHours = 40 - assignedHours;
        const utilization = Math.round((assignedHours / 40) * 100);
        return { ...m, assignedHours, availableHours, utilization, utilizationLevel: assignedHours >= 40 ? 'high' : assignedHours >= 20 ? 'medium' : 'low' };
      }).filter(m => m.availableHours > 0).sort((a,b) => b.availableHours - a.availableHours);

      return available;
    } catch (err) {
      console.error('[PM DATA SERVICE] getAvailableTeamMembers error', err);
      return [];
    }
  }
}

/* ======================================================================
   Dashboard App
   ======================================================================*/
class DashboardApp {
  constructor() {
    this.dataService = new PMDataService();
    this.currentWeek = toIsoDate(getMondayOf());
    this.selectedCell = null;
    this.isLoading = false;
  }

  async init() {
    try {
      if (this.isLoading) return;
      this.isLoading = true;
      ModalManager.showLoading();

      await this.dataService.initialize();
      allocateHoursModal.init(this.dataService.currentPMId);

      this.setupEventListeners();
      updateUserNameDisplayEnhanced();

      await this.loadDashboard();
    } catch (err) {
      console.error('[DASHBOARD APP] Initialization error:', err);
      MessageManager.error('Failed to initialize dashboard. Please login again.');
      setTimeout(() => { window.location.href = "/login/HTML_Files/login.html"; }, 2000);
    } finally {
      this.isLoading = false;
      ModalManager.hideLoading();
    }
  }

  setupEventListeners() {
    const logoutBtn = qId('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => this.openLogoutModal());

    const cancelLogout = qId('cancelLogout');
    const confirmLogout = qId('confirmLogout');
    if (cancelLogout) cancelLogout.addEventListener('click', () => ModalManager.hide('logoutModal'));
    if (confirmLogout) confirmLogout.addEventListener('click', () => this.handleLogout());

    const prevWeek = qId('prevWeek');
    const nextWeek = qId('nextWeek');
    const weekSelect = qId('weekSelect');
    if (prevWeek) prevWeek.addEventListener('click', () => this.changeWeek(-1));
    if (nextWeek) nextWeek.addEventListener('click', () => this.changeWeek(1));
    if (weekSelect) weekSelect.addEventListener('change', (e) => { this.currentWeek = e.target.value; this.loadWeeklyAllocation(); });

    document.addEventListener('click', (e) => {
      const cell = e.target.closest('.hours-cell');
      if (cell) this.openAllocateModal(cell);
    });

    window.addEventListener('allocationSaved', () => this.handleAllocationSaved());
    window.addEventListener('showMessage', (e) => MessageManager.show(e.detail.message, e.detail.type));

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay && overlay.id !== 'allocateHoursModal') {
          overlay.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    });
  }

  async loadDashboard() {
    try {
      this.generateWeekOptions();
      const [stats] = await Promise.all([ this.dataService.getDashboardStats(), this.dataService.getProjects() ]);
      this.updateStats(stats);
      await Promise.all([ this.loadWeeklyAllocation(), this.loadAvailableTeamMembers() ]);
    } catch (err) {
      console.error('[DASHBOARD APP] loadDashboard error', err);
      MessageManager.error('Failed to load dashboard data');
    }
  }

  updateStats(stats) {
    const map = {
      activeProjects: qId('activeProjects'),
      teamMembers: qId('teamMembers'),
      totalHours: qId('totalHours'),
      teamUtilization: qId('teamUtilization')
    };
    if (map.activeProjects) map.activeProjects.textContent = stats.activeProjects;
    if (map.teamMembers) map.teamMembers.textContent = stats.teamMembers;
    if (map.totalHours) map.totalHours.textContent = (stats.totalHours || 0) + 'h';
    if (map.teamUtilization) map.teamUtilization.textContent = (stats.teamUtilization || 0) + '%';
  }

  async loadWeeklyAllocation() {
    try {
      const allocation = await this.dataService.getWeeklyAllocation(this.currentWeek);
      this.renderWeeklyAllocation(allocation);
    } catch (err) {
      console.error('[DASHBOARD APP] loadWeeklyAllocation error', err);
      MessageManager.error('Failed to load weekly allocation');
    }
  }

  updateTableHeaders() {
    const weekSelect = qId('weekSelect');
    if (!weekSelect) return;
    const [year, month, day] = weekSelect.value.split('-').map(Number);
    const thead = document.querySelector('.allocation-table thead tr');
    if (!thead) return;
    const dayNames = ['Mon','Tue','Wed','Thu','Fri'];
    for (let i=0;i<5;i++){
      const d = new Date(year, month-1, day+i);
      const monthName = d.toLocaleDateString('en-US',{month:'short'});
      const dateNum = d.getDate();
      const th = thead.children[i+1];
      if (th) th.innerHTML = `${dayNames[i]}<br><span class="date-label">${monthName} ${dateNum}</span>`;
    }
  }

  getWorkTypeLabel(workTypes){
    if (!workTypes || workTypes.length===0) return '';
    const workTypeMap = { assigned:'', absent:'Absent', leave:'Leave', holiday:'Holiday', sick_leave:'Sick', other:'Other' };
    const display = workTypes.filter(t => t!=='assigned');
    if (display.length===0) return '';
    if (display.length>1) return `${workTypeMap[display[0]] || display[0]} +${display.length-1}`;
    return workTypeMap[display[0]] || display[0];
  }

  renderWeeklyAllocation(allocation){
    const tbody = qId('allocationTableBody');
    if (!tbody) return;
    this.updateTableHeaders();
    if (!allocation || allocation.length===0){
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px; color: #6c757d;">
            <i class="fas fa-users" style="font-size: 48px; opacity: 0.3; margin-bottom: 16px;"></i>
            <p>No team members assigned yet</p>
          </td>
        </tr>`;
      return;
    }

     tbody.innerHTML = '';
    allocation.forEach(member => {
      const days = ['mon','tue','wed','thu','fri'];
      const dayLabels = ['Mon','Tue','Wed','Thu','Fri'];
      const totalHours = days.reduce((s,d) => s + (member[d]?.hours || 0), 0);

      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="employee-cell">
          <div class="employee-info">
            <img src="${member.avatar}" alt="${member.employee}" class="employee-avatar-small">
            <div>
              <div class="employee-name">${member.employee}</div>
              <div class="employee-role">${member.role}</div>
            </div>
          </div>
        </td>
        ${days.map((day,index)=>{
          const dayData = member[day] || {hours:0,types:[]};
          const hours = dayData.hours || 0;
          const workTypes = dayData.types || [];
          
          // FIXED: Only check for work types if there are actual entries
          const hasAnyEntry = workTypes.length > 0;
          const hasHoliday = workTypes.includes('holiday');
          const hasWork = workTypes.some(t => ['assigned', 'work', 'work_from_home'].includes(t));
          const isAbsent = workTypes.includes('absent');
          const isLeave = workTypes.some(t=>['leave', 'sick_leave'].includes(t));
          const workTypeLabel = this.getWorkTypeLabel(workTypes);

          let cellClass='empty';
          let displayHtml='';
          
          // FIXED: Only process styling if there are actual entries
          if (!hasAnyEntry && hours === 0) {
            // Completely empty day - no entries at all
            cellClass = 'empty';
            displayHtml = `<div class="hours-value">0h</div>`;
          }
          // Holiday + Work = Blue cell with combined hours
          else if (hasHoliday && hasWork) {
            cellClass='work-day';
            displayHtml = `<div class="hours-value">${hours}h</div><div class="holiday-work-label">+8h Holiday</div>`;
          }
          // Absent
          else if (isAbsent) {
            cellClass='absent-day';
            displayHtml = `<div class="hours-value">---</div>${workTypeLabel?`<div class="work-type-label">${workTypeLabel}</div>`:''}`;
          }
          // Leave/Sick Leave (not holiday)
          else if (isLeave) {
            cellClass='leave-day';
            displayHtml = `<div class="hours-value">8h</div>${workTypeLabel?`<div class="work-type-label">${workTypeLabel}</div>`:''}`;
          }
          // Holiday only (no work)
          else if (hasHoliday && !hasWork) {
            cellClass='holiday-day';
            displayHtml = `<div class="hours-value">8h</div><div class="work-type-label">Holiday</div>`;
          }
          // Overtime
          else if (hours > 8) {
            cellClass='overtime';
            displayHtml = `<div class="hours-value">${hours}h</div><div class="overtime-label">+${hours-8}h OT</div>`;
          }
          // Regular work day (8 hours)
          else if (hours === 8) {
            cellClass='work-day';
            displayHtml = `<div class="hours-value">8h</div>`;
          }
          // Partial hours (1-7 hours)
          else if (hours > 0) {
            cellClass='work-day';
            displayHtml = `<div class="hours-value">${hours}h</div>`;
          }
          // Empty (should not reach here if logic above is correct)
          else {
            cellClass = 'empty';
            displayHtml = `<div class="hours-value">0h</div>`;
          }

          return `<td class="hours-cell ${cellClass}" data-employee="${member.employee}" data-day="${dayLabels[index]}">${displayHtml}</td>`;
        }).join('')}
        <td class="total-cell">${totalHours}h</td>
      `;

      tbody.appendChild(row);
    });
  }

  async loadAvailableTeamMembers(){
    try {
      const available = await this.dataService.getAvailableTeamMembers();
      this.renderAvailableTeamMembers(available);
    } catch (err) { console.error('[DASHBOARD APP] loadAvailableTeamMembers error', err); }
  }

  renderAvailableTeamMembers(members){
    const container = q('.available-grid');
    if (!container) return;
    if (!members || members.length===0) {
      container.innerHTML = `\n        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #6c757d;">\n          <i class="fas fa-users" style="font-size: 48px; opacity: 0.3; margin-bottom: 16px;"></i>\n          <p>All team members are fully allocated</p>\n        </div>`;
      return;
    }

    container.innerHTML = '';
    members.forEach(member => {
      const card = document.createElement('div');
      card.className = 'available-card';
      card.innerHTML = `\n        <img src="${member.avatar}" alt="${member.name}" class="available-avatar">\n        <div class="available-info">\n          <h4>${member.name}</h4>\n          <p class="available-role">${member.role}</p>\n          <div class="utilization-badge ${member.utilizationLevel}">\n            <i class="fas fa-circle"></i> ${member.utilization}% Utilization\n          </div>\n          <p class="available-hours">${member.availableHours}h available</p>\n        </div>`;
      container.appendChild(card);
    });
  }

  generateWeekOptions(){
    const weekSelect = qId('weekSelect');
    if (!weekSelect) return;
    const today = new Date();
    const currentMonday = getMondayOf(today);
    weekSelect.innerHTML = '';

    for (let i=-10;i<=0;i++){
      const ws = new Date(currentMonday);
      ws.setDate(currentMonday.getDate() + (i*7));
      const we = new Date(ws); we.setDate(ws.getDate()+4);

      const option = document.createElement('option');
      option.value = toIsoDate(ws);

      const startMonth = ws.toLocaleDateString('en-US',{month:'short'});
      const startDay = ws.getDate();
      const startYear = ws.getFullYear();
      const endMonth = we.toLocaleDateString('en-US',{month:'short'});
      const endDay = we.getDate();
      const endYear = we.getFullYear();

      if (startMonth===endMonth && startYear===endYear) option.textContent = `Week of ${startMonth} ${startDay} - ${endDay}, ${startYear}`;
      else if (startYear===endYear) option.textContent = `Week of ${startMonth} ${startDay} - ${endMonth} ${endDay}, ${startYear}`;
      else option.textContent = `Week of ${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`;

      if (i===0) option.selected = true;
      weekSelect.appendChild(option);
    }

    this.currentWeek = weekSelect.value;
  }

  changeWeek(direction){
    const weekSelect = qId('weekSelect');
    if (!weekSelect) return;
    const newIndex = weekSelect.selectedIndex + direction;
    if (newIndex >= 0 && newIndex < weekSelect.options.length) {
      weekSelect.selectedIndex = newIndex;
      this.currentWeek = weekSelect.value;
      this.loadWeeklyAllocation();
    }
  }

  async openAllocateModal(cell){
    const employee = cell.dataset.employee;
    const day = cell.dataset.day;
    this.selectedCell = cell;
    await allocateHoursModal.open(employee, day, this.currentWeek);
  }

  async handleAllocationSaved(){
    try {
      ModalManager.showLoading();
      await Promise.all([
        this.loadWeeklyAllocation(),
        this.dataService.getDashboardStats().then(s=>this.updateStats(s)),
        this.loadAvailableTeamMembers()
      ]);
    } catch (err) { console.error('[DASHBOARD APP] handleAllocationSaved error', err); }
    finally { ModalManager.hideLoading(); }
  }

  openLogoutModal(){ ModalManager.show('logoutModal'); }
  handleLogout(){ localStorage.removeItem('loggedUser'); sessionStorage.clear(); ModalManager.hide('logoutModal'); ModalManager.showLoading(); setTimeout(()=>{ window.location.href = "/login/HTML_Files/login.html"; }, 500); }
}

/* ======================================================================
   Init
   ======================================================================*/
let app;
document.addEventListener('DOMContentLoaded', () => { app = new DashboardApp(); app.init(); });
