// newproject-modal (Optimized)
// Same behavior & output as original, but refactored for readability, performance, and maintainability.

import { supabase } from "../../supabaseClient.js";

/* ---------- Small DOM helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from((root || document).querySelectorAll(sel));
const setText = (el, txt) => { if (el) el.textContent = txt; };

/* ---------- User display (kept behavior) ---------- */
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
        const { data: userData, error } = await supabase.from('users').select('name').eq('email', loggedUser.email).single();
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
      const initials = displayName.split(' ').map(w => w.charAt(0).toUpperCase()).join('').substring(0,2);
      userAvatarElement.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=000&color=fff`;
      userAvatarElement.alt = initials;
      console.log('[USER DISPLAY] Avatar updated with initials:', initials);
    }
  } catch (error) {
    console.error('[USER DISPLAY] Error updating user name:', error);
    setText($('#userName'), 'Project Manager');
  }
}

/* ---------- Utils ---------- */
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
function calculateDurationDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/* ---------- Modal & Message ---------- */
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
  static show(message, type = 'info'){
    const container = this._container(); if (!container) return;
    const box = document.createElement('div'); box.className = `message-box ${type}`;
    const icon = document.createElement('i');
    const iconMap = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    icon.className = `fas ${iconMap[type] || 'fa-info-circle'}`;
    const text = document.createElement('span'); text.textContent = message;
    const closeBtn = document.createElement('button'); closeBtn.className = 'message-close'; closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.addEventListener('click', () => box.remove());
    box.append(icon, text, closeBtn); container.appendChild(box);
    setTimeout(() => box.remove(), 5000);
  }
  static success(m){ this.show(m, 'success'); }
  static error(m){ this.show(m, 'error'); }
  static warning(m){ this.show(m, 'warning'); }
  static info(m){ this.show(m, 'info'); }
}

/* ---------- ResourceRowManager ---------- */
class ResourceRowManager {
  constructor(containerId) {
    this.rowCounter = 0;
    this.container = null;
    this.template = null;
    if (containerId) this.init(containerId);
  }

  init(containerId) {
    this.container = document.getElementById(containerId);
    this.template = document.getElementById('projectResourceRowTemplate');
    if (this.container) this.addResourceRow();
  }

  _todayISO(){ return new Date().toISOString().split('T')[0]; }

  addResourceRow() {
    if (!this.container || !this.template) return;
    this.rowCounter++; const rowId = `project-resource-row-${this.rowCounter}`;

    const rowElement = document.createElement('div');
    rowElement.className = 'project-resource-row'; rowElement.id = rowId; rowElement.dataset.rowId = this.rowCounter;
    rowElement.innerHTML = this.template.innerHTML;

    const titleText = rowElement.querySelector('.resource-title-text'); if (titleText) titleText.textContent = `Resource Requirement #${this.rowCounter}`;

    const today = this._todayISO();
    const startDateInput = rowElement.querySelector('.project-resource-start-date');
    const endDateInput = rowElement.querySelector('.project-resource-end-date');
    if (startDateInput) startDateInput.min = today;
    if (endDateInput) endDateInput.min = today;

    const removeBtn = rowElement.querySelector('.project-btn-remove-resource');
    if (removeBtn) {
      removeBtn.style.display = this.rowCounter > 1 ? '' : 'none';
      removeBtn.addEventListener('click', () => this.removeResourceRow(this.rowCounter));
    }

    this.container.appendChild(rowElement);
    this.updateRowNumbers();
  }

  removeResourceRow(rowId) {
    const row = document.getElementById(`project-resource-row-${rowId}`);
    if (row) { row.remove(); this.updateRowNumbers(); this.rowCounter = Math.max(1, this.container.querySelectorAll('.project-resource-row').length); }
  }

  updateRowNumbers() {
    const rows = this.container.querySelectorAll('.project-resource-row');
    rows.forEach((row, index) => {
      const titleText = row.querySelector('.resource-title-text'); if (titleText) titleText.textContent = `Resource Requirement #${index + 1}`;
    });
  }

  getResourcesData() {
    if (!this.container) return [];
    const rows = this.container.querySelectorAll('.project-resource-row');
    return Array.from(rows).map(row => ({
      position: row.querySelector('.project-resource-position')?.value?.trim() || '',
      quantity: parseInt(row.querySelector('.project-resource-quantity')?.value || '1', 10) || 1,
      skillLevel: row.querySelector('.project-resource-skill-level')?.value || '',
      assignmentType: row.querySelector('.project-resource-assignment-type')?.value || '',
      skills: (row.querySelector('.project-resource-skills')?.value || '').split(',').map(s => s.trim()).filter(Boolean),
      justification: row.querySelector('.project-resource-justification')?.value || ''
    }));
  }

  reset() {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.rowCounter = 0;
    this.addResourceRow();
  }
}

/* ---------- ProjectRequestService ---------- */
class ProjectRequestService {
  constructor() { this.currentPMId = null; this.currentPMEmail = null; }

  async initialize() {
    const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || '{}');
    if (!loggedUser.email) throw new Error('No logged in user found');
    this.currentPMEmail = loggedUser.email;

    const { data: userData, error } = await supabase.from('users').select('id,name,email,role').eq('email', this.currentPMEmail).eq('role','project_manager').single();
    if (error) { console.error('[PROJECT REQUEST SERVICE] Error fetching PM user:', error); throw error; }
    this.currentPMId = userData.id; console.log('[PROJECT REQUEST SERVICE] Initialized for PM:', userData);
  }

  async createProjectRequest(requestData) {
    try {
      console.log('[PROJECT REQUEST SERVICE] Creating project request:', requestData);
      const durationDays = calculateDurationDays(requestData.startDate, requestData.endDate);

      const projectMetadata = {
        projectName: requestData.name,
        projectDescription: requestData.description,
        teamSize: requestData.teamSize,
        priority: requestData.priority,
        startDate: requestData.startDate,
        endDate: requestData.endDate,
        durationDays
      };

      // Generate one requestGroupId for the whole submission
      const requestGroupId = `PM${this.currentPMId}_${Date.now()}_GROUP`;
      console.log('[PROJECT REQUEST SERVICE] Using requestGroupId:', requestGroupId);

      const insertPayloads = requestData.resources.map((resource, index) => ({
        project_id: null,
        requirement_id: null,
        requested_by: this.currentPMId,
        status: 'pending',
        notes: JSON.stringify({
          ...projectMetadata,
          resourceDetails: {
            position: resource.position,
            quantity: resource.quantity,
            skillLevel: resource.skillLevel,
            assignmentType: resource.assignmentType,
            skills: resource.skills,
            justification: resource.justification
          },
          requestGroupId,
          resourceIndex: index,
          totalResources: requestData.resources.length
        }),
        start_date: requestData.startDate,
        end_date: requestData.endDate,
        duration_days: durationDays
      }));

      // Insert all resource_requests in parallel
      const insertPromises = insertPayloads.map(payload => supabase.from('resource_requests').insert(payload).select());
      const results = await Promise.all(insertPromises);

      const firstError = results.find(r => r.error)?.error;
      if (firstError) { console.error('[PROJECT REQUEST SERVICE] Insert error:', firstError); throw firstError; }

      const insertedRequests = results.map(r => r.data[0]);
      console.log('[PROJECT REQUEST SERVICE] Resource requests created:', insertedRequests);

      return { success: true, message: `Project request "${requestData.name}" submitted successfully! Waiting for Resource Manager approval.`, requestGroupId, requestIds: insertedRequests.map(r => r.id) };
    } catch (error) {
      console.error('[PROJECT REQUEST SERVICE] Error creating project request:', error);
      throw error;
    }
  }
}

/* ---------- NewProjectModalController ---------- */
class NewProjectModalController {
  constructor() {
    this.projectRequestService = new ProjectRequestService();
    this.resourceRowManager = new ResourceRowManager('projectResourceRowsContainer');

    // cache frequently used elements
    this.dom = {
      addProjectBtn: $('#addProjectBtn'),
      createForm: $('#createProjectForm'),
      addResourceBtn: $('#addProjectResourceBtn'),
      projectStartTime: $('#projectStartTime'),
      projectEndTime: $('#projectEndTime'),
      duration: $('#duration'),
      modal: $('#createProjectModal')
    };
  }

  async initialize() {
    try {
      await this.projectRequestService.initialize();
      this.setupEventListeners();
      console.log('[NEW PROJECT MODAL] Initialized successfully');
    } catch (error) {
      console.error('[NEW PROJECT MODAL] Initialization error:', error);
      MessageManager.error('Failed to initialize. Please login again.');
    }
  }

  setupEventListeners() {
    const { addProjectBtn, createForm, addResourceBtn, projectStartTime, projectEndTime, duration, modal } = this.dom;

    addProjectBtn?.addEventListener('click', () => this.openModal());

    $('#closeCreateProjectModal')?.addEventListener('click', () => this.closeModal());
    $('#cancelCreateProjectBtn')?.addEventListener('click', () => this.closeModal());

    createForm?.addEventListener('submit', (e) => { e.preventDefault(); this.submitProjectRequest(); });

    addResourceBtn?.addEventListener('click', () => this.resourceRowManager.addResourceRow());

    const calculateDuration = () => {
      const start = projectStartTime?.value; const end = projectEndTime?.value;
      if (start && end) {
        const days = calculateDurationDays(start, end);
        if (days > 0 && duration) duration.value = days;
      }
    };

    projectStartTime?.addEventListener('change', calculateDuration);
    projectEndTime?.addEventListener('change', calculateDuration);

    modal?.addEventListener('click', (e) => { if (e.target === modal) this.closeModal(); });
  }

  openModal() {
    this.dom.createForm?.reset();

    if (!this.resourceRowManager.container) this.resourceRowManager.init('projectResourceRowsContainer'); else this.resourceRowManager.reset();

    const today = new Date().toISOString().split('T')[0];
    if (this.dom.projectStartTime) this.dom.projectStartTime.min = today;
    if (this.dom.projectEndTime) this.dom.projectEndTime.min = today;

    ModalManager.show('createProjectModal');
  }

  closeModal() { ModalManager.hide('createProjectModal'); }

  async submitProjectRequest() {
    const resources = this.resourceRowManager.getResourcesData();

    const formData = {
      name: $('#projectName')?.value?.trim() || '',
      description: $('#projectDescription')?.value?.trim() || '',
      teamSize: parseInt($('#teamSize')?.value || '0', 10) || 0,
      duration: parseInt($('#duration')?.value || '0', 10) || 0,
      startDate: $('#projectStartTime')?.value || '',
      endDate: $('#projectEndTime')?.value || '',
      priority: $('#projectPriority')?.value || 'medium',
      resources
    };

    // validation (report first error)
    const errors = [];
    if (!formData.name) errors.push('Project name is required');
    if (!formData.teamSize || formData.teamSize < 1) errors.push('Team size must be at least 1');
    if (!formData.duration || formData.duration < 1) errors.push('Duration must be at least 1 day');
    if (!formData.startDate) errors.push('Project start date is required');
    if (!formData.endDate) errors.push('Project end date is required');
    if (formData.startDate && formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) errors.push('End date must be after start date');
    if (!formData.resources || formData.resources.length === 0) errors.push('At least one resource requirement is needed');

    (formData.resources || []).forEach((resource, index) => {
      const n = index + 1;
      if (!resource.position) errors.push(`Resource ${n}: Position is required`);
      if (!resource.quantity || resource.quantity < 1) errors.push(`Resource ${n}: Quantity must be at least 1`);
      if (!resource.skillLevel) errors.push(`Resource ${n}: Experience level is required`);
      if (!resource.assignmentType) errors.push(`Resource ${n}: Assignment type is required`);
      if (!resource.skills || resource.skills.length === 0) errors.push(`Resource ${n}: Skills are required`);
    });

    if (errors.length) { MessageManager.error(errors[0]); return; }

    try {
      this.closeModal();
      ModalManager.showLoading();
      const result = await this.projectRequestService.createProjectRequest(formData);
      ModalManager.hideLoading();
      MessageManager.success(result.message);
      console.log('[NEW PROJECT MODAL] Request created with groupId:', result.requestGroupId);
      console.log('[NEW PROJECT MODAL] Request IDs:', result.requestIds);

      if (window.app && typeof window.app.loadProjects === 'function') await window.app.loadProjects();
    } catch (error) {
      ModalManager.hideLoading();
      console.error('[NEW PROJECT MODAL] Error creating project request:', error);
      MessageManager.error('Failed to create project request: ' + (error?.message || error));
    }
  }
}

/* ---------- Initialization ---------- */
let newProjectController;
document.addEventListener('DOMContentLoaded', () => {
  newProjectController = new NewProjectModalController();
  newProjectController.initialize();
  window.newProjectController = newProjectController;
});
