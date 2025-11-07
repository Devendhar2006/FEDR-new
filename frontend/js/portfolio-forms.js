/**
 * Portfolio Forms Manager
 * Handles Project, Certification, and Achievement forms
 */

// Form state management
const formState = {
  currentType: null,
  currentEditId: null,
  draftData: {},
  uploadedImages: [],
  tags: []
};

// Auto-save to localStorage
function autoSaveDraft(type, formData) {
  const key = `portfolio_draft_${type}`;
  localStorage.setItem(key, JSON.stringify(formData));
}

function loadDraft(type) {
  const key = `portfolio_draft_${type}`;
  const draft = localStorage.getItem(key);
  return draft ? JSON.parse(draft) : null;
}

function clearDraft(type) {
  const key = `portfolio_draft_${type}`;
  localStorage.removeItem(key);
}

// Image upload handling (for Project and Achievement forms)
function handleImageUpload(event, previewContainer) {
  const files = Array.from(event.target.files || (event.dataTransfer ? event.dataTransfer.files : []));
  
  if (!files || files.length === 0) return;
  
  files.forEach(file => {
    if (!file.type.startsWith('image/')) {
      showNotification('❌ Please upload only image files', 'error');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      showNotification('❌ Image must be less than 5MB', 'error');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = {
        file: file,
        url: e.target.result,
        name: file.name
      };
      
      formState.uploadedImages.push(imageData);
      renderImagePreview(imageData, previewContainer);
    };
    reader.onerror = () => {
      showNotification('❌ Error reading image file', 'error');
    };
    reader.readAsDataURL(file);
  });
}

function renderImagePreview(imageData, container) {
  if (!container) {
    container = document.getElementById('imagePreview');
    if (!container) {
      console.error('Preview container not found');
      return;
    }
  }
  
  const preview = document.createElement('div');
  preview.className = 'image-preview-item';
  const uniqueId = Date.now() + Math.random();
  preview.innerHTML = `
    <img src="${imageData.url}" alt="Preview">
    <button type="button" class="remove-image" data-image-url="${imageData.url}" onclick="removeImage('${imageData.url}')">×</button>
  `;
  container.appendChild(preview);
}

function removeImage(url) {
  formState.uploadedImages = formState.uploadedImages.filter(img => img.url !== url);
  const preview = document.querySelector(`[data-image-url="${url}"]`)?.closest('.image-preview-item');
  if (preview) preview.remove();
}

// Tag management
function addTag(input, tagContainer) {
  const value = input.value.trim();
  if (!value) return;
  
  const tags = value.split(',').map(t => t.trim()).filter(Boolean);
  tags.forEach(tag => {
    if (!formState.tags.includes(tag) && tag.length > 0) {
      formState.tags.push(tag);
      renderTag(tag, tagContainer);
    }
  });
  
  input.value = '';
}

function renderTag(tag, container) {
  const tagEl = document.createElement('span');
  tagEl.className = 'tag-pill';
  tagEl.innerHTML = `${tag} <button type="button" onclick="removeTag('${tag}')">×</button>`;
  container.appendChild(tagEl);
}

function removeTag(tag) {
  formState.tags = formState.tags.filter(t => t !== tag);
  const tagEl = document.querySelector(`[onclick*="${tag}"]`)?.closest('.tag-pill');
  if (tagEl) tagEl.remove();
}

// Date picker (simple HTML5 date input wrapper)
function initDatePicker(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.type = 'date';
  }
}

// Rich text editor (simple contenteditable wrapper)
function initRichTextEditor(textareaId) {
  const textarea = document.getElementById(textareaId);
  if (!textarea) return;
  
  // Add toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'rich-text-toolbar';
  toolbar.innerHTML = `
    <button type="button" onclick="formatText('bold')" title="Bold"><b>B</b></button>
    <button type="button" onclick="formatText('italic')" title="Italic"><i>I</i></button>
    <button type="button" onclick="formatText('underline')" title="Underline"><u>U</u></button>
  `;
  textarea.parentNode.insertBefore(toolbar, textarea);
}

function formatText(command) {
  document.execCommand(command, false, null);
}

// Open modal by type
function openAddModal(type) {
  const user = CosmicAPI?.utils?.getCurrentUser();
  if (!user) {
    showNotification('Please login to add items', 'error');
    window.location.href = 'login.html';
    return;
  }
  
  formState.currentType = type;
  formState.currentEditId = null;
  formState.uploadedImages = [];
  formState.tags = [];
  
  const modal = document.getElementById('portfolioModal');
  const container = document.getElementById('formContainer');
  
  // Generate form HTML based on type
  if (type === 'project') {
    container.innerHTML = generateProjectForm();
  } else if (type === 'certification') {
    container.innerHTML = generateCertificationForm();
  } else if (type === 'achievement') {
    container.innerHTML = generateAchievementForm();
  }
  
  // Load draft if exists
  const draft = loadDraft(type);
  if (draft && !confirm('Load saved draft?')) {
    clearDraft(type);
  } else if (draft) {
    fillFormFromDraft(draft);
  }
  
  // Initialize form features
  initializeFormFeatures(type);
  
  // Setup drag-drop and browse handlers for all forms
  setTimeout(() => {
    if (type === 'certification') {
      setupCertDragDrop();
      // Setup browse link
      const certBrowseLink = document.getElementById('certBrowseLink');
      const certFileInput = document.getElementById('certificateImage');
      if (certBrowseLink && certFileInput) {
        certBrowseLink.addEventListener('click', (e) => {
          e.preventDefault();
          certFileInput.click();
        });
        certFileInput.addEventListener('change', handleCertImageSelect);
      }
    } else if (type === 'project') {
      setupProjectDragDrop();
      // Setup browse link
      const projectBrowseLink = document.getElementById('projectBrowseLink');
      const projectUploadBox = document.getElementById('projectUploadBox');
      const projectFileInput = document.getElementById('imageInput');
      if (projectBrowseLink && projectFileInput) {
        projectBrowseLink.addEventListener('click', (e) => {
          e.preventDefault();
          projectFileInput.click();
        });
        if (projectUploadBox) {
          projectUploadBox.addEventListener('click', () => {
            projectFileInput.click();
          });
        }
        projectFileInput.addEventListener('change', handleFileSelect);
      }
    } else if (type === 'achievement') {
      setupAchievementDragDrop();
      // Setup browse link
      const achievementBrowseLink = document.getElementById('achievementBrowseLink');
      const achievementUploadBox = document.getElementById('achievementUploadBox');
      const achievementFileInput = document.getElementById('achievementImageInput');
      if (achievementBrowseLink && achievementFileInput) {
        achievementBrowseLink.addEventListener('click', (e) => {
          e.preventDefault();
          achievementFileInput.click();
        });
        if (achievementUploadBox) {
          achievementUploadBox.addEventListener('click', () => {
            achievementFileInput.click();
          });
        }
        achievementFileInput.addEventListener('change', handleFileSelect);
      }
    }
  }, 100);
  
  // Show modal
  modal.classList.remove('hidden');
  modal.classList.add('active');
  document.body.classList.add('modal-open');
  
  // Scroll to top when modal opens - ensure heading is visible
  setTimeout(() => {
    if (modal) {
      modal.scrollTop = 0;
      // Force scroll to top
      modal.scrollTo({ top: 0, behavior: 'auto' });
    }
    // Also ensure the modal-card starts at top
    const modalCard = modal.querySelector('.modal-card');
    if (modalCard) {
      modalCard.scrollTop = 0;
    }
  }, 100);
  
  // Auto-save on input
  setupAutoSave(type);
}

// Generate Project Form HTML
function generateProjectForm() {
  return `
    <div class="modal-header">
      <h2 id="modalTitle">📝 Add Project</h2>
      <button class="close-btn" onclick="closePortfolioModal()">&times;</button>
    </div>
    
    <form id="portfolioForm" onsubmit="submitPortfolioForm(event)">
      <div class="form-group">
        <label for="title">📝 Project Title <span class="required">*</span></label>
        <input type="text" id="title" name="title" required maxlength="100" placeholder="e.g., Cosmic E-Commerce Platform">
        <span class="char-counter"><span id="titleCounter">0</span>/100</span>
      </div>
      
      <div class="form-group">
        <label for="description">📄 Description <span class="required">*</span></label>
        <textarea id="description" name="description" rows="6" maxlength="500" placeholder="Describe your project..." required></textarea>
        <span class="char-counter"><span id="descCounter">0</span>/500</span>
      </div>
      
      <div class="field-group-separator"></div>
      
      <div class="section-header">📸 Project Images</div>
      
      <div class="form-group">
        <label>📸 Image Upload <span class="required">*</span> <small>(Max 5MB per image)</small></label>
        <div class="upload-area">
          <div class="upload-box" id="projectUploadBox">
            <p>📁 Drag & drop image here, or</p>
            <a href="#" class="browse-link" id="projectBrowseLink">click to browse</a>
          </div>
          <input type="file" id="imageInput" accept="image/*" multiple style="display: none;">
          <div id="imagePreview" class="image-preview-grid"></div>
        </div>
      </div>
      
      <div class="form-group">
        <label for="category">🏷️ Category <span class="required">*</span></label>
        <select id="category" name="category" required>
          <option value="">Select category</option>
          <option value="web">Web Development</option>
          <option value="mobile">Mobile Apps</option>
          <option value="ai">AI & ML</option>
          <option value="design">UI/UX Design</option>
          <option value="backend">Backend</option>
          <option value="frontend">Frontend</option>
          <option value="fullstack">Full Stack</option>
          <option value="game">Game Dev</option>
          <option value="blockchain">Blockchain</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="technologies">⚙️ Technologies <small>(Multi-select tags, Max 10, press Enter to add)</small></label>
        <input type="text" id="technologies" placeholder="e.g., React, Node.js, MongoDB, TypeScript" onkeypress="if(event.key==='Enter'){event.preventDefault();addTagFromInput()}">
        <div id="tagsContainer" class="tags-container"></div>
      </div>
      
      <div class="field-group-separator"></div>
      
      <div class="section-header">🔗 Links & Resources</div>
      
      <div class="form-group">
        <label for="githubLink">🔗 GitHub Link <small>(Optional)</small></label>
        <input type="url" id="githubLink" name="githubLink" placeholder="https://github.com/username/repo">
      </div>
      
      <div class="form-group">
        <label for="demoLink">🌐 Live Demo Link <small>(Optional)</small></label>
        <input type="url" id="demoLink" name="demoLink" placeholder="https://your-project.com">
      </div>
      
      <div class="field-group-separator"></div>
      
      <div class="section-header">📅 Timeline & Status</div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="startDate">📅 Start Date <small>(Optional)</small></label>
          <input type="date" id="startDate" name="startDate">
        </div>
        
        <div class="form-group">
          <label for="endDate">📅 End Date <small>(Optional)</small></label>
          <input type="date" id="endDate" name="endDate">
        </div>
      </div>
      
      <div class="form-group">
        <label for="status">📊 Status <span class="required">*</span></label>
        <select id="status" name="status" required>
          <option value="active">🟢 Active</option>
          <option value="completed" selected>🔵 Completed</option>
          <option value="archived">⚪ Archived</option>
        </select>
      </div>
      
      <div class="form-actions">
        <button type="button" class="btn cancel-btn" onclick="closePortfolioModal()">Cancel</button>
        <button type="button" class="btn btn-secondary" onclick="saveDraft()">💾 Save Draft</button>
        <button type="submit" class="btn save-btn">🚀 Publish</button>
      </div>
    </form>
  `;
}

// Generate Certification Form HTML
function generateCertificationForm() {
  return `
    <div class="modal-header">
      <h2 id="modalTitle">🎓 Add Certification</h2>
      <button class="close-btn" onclick="closePortfolioModal()">&times;</button>
    </div>
    
    <form id="portfolioForm" onsubmit="submitPortfolioForm(event)">
      <div class="form-row">
        <div class="form-group">
          <label for="certName">🎓 Certificate Name <span class="required">*</span></label>
          <input type="text" id="certName" name="certName" required maxlength="100" placeholder="e.g., AWS Certified Solutions Architect" value="">
          <span class="char-counter"><span id="certNameCounter">0</span>/100</span>
        </div>
        
        <div class="form-group">
          <label for="issuingOrg">🏢 Issuing Organization <span class="required">*</span></label>
          <input type="text" id="issuingOrg" name="issuingOrganization" required maxlength="200" placeholder="e.g., Amazon Web Services">
          <span class="char-counter"><span id="orgCounter">0</span>/200</span>
        </div>
      </div>
      
      <div class="field-group-separator"></div>
      
      <div class="section-header">📅 Date Information</div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="issueDate">📅 Issue Date <span class="required">*</span></label>
          <input type="date" id="issueDate" name="issueDate" required>
        </div>
        
        <div class="form-group">
          <label for="expiryDate">📅 Expiry Date <small>(Optional)</small></label>
          <input type="date" id="expiryDate" name="expiryDate">
        </div>
      </div>
      
      <div class="field-group-separator"></div>
      
      <div class="section-header">🔗 Credential Details</div>
      
      <div class="form-group">
        <label for="credentialId">🆔 Credential ID <small>(Optional)</small></label>
        <input type="text" id="credentialId" name="credentialId" maxlength="100" placeholder="e.g., ABC123XYZ">
      </div>
      
      <div class="form-group">
        <label for="credentialUrl">🔗 Credential URL <small>(Optional - Verify Link)</small></label>
        <input type="url" id="credentialUrl" name="credentialUrl" placeholder="https://verify.certification.com/credential/ABC123">
      </div>
      
      <div class="field-group-separator"></div>
      
      <div class="section-header">📋 Certificate Image</div>
      
      <div class="form-group">
        <label>📋 Certificate Image/Badge <span class="required">*</span> <small>(Max 5MB)</small></label>
        <div class="upload-area">
          <div class="upload-box" id="uploadBox">
            <p>📁 Drag & drop image here, or</p>
            <a href="#" class="browse-link" id="certBrowseLink">click to browse</a>
          </div>
          <input type="file" id="certificateImage" accept="image/*" style="display: none;">
          <div id="previewContainer" style="display: none;">
            <img id="preview" src="" alt="Preview">
            <p id="fileName"></p>
            <button type="button" class="remove-image" onclick="removeCertImage()" style="position: relative; margin-top: 10px;">Remove Image</button>
          </div>
        </div>
      </div>
      
      <div class="field-group-separator"></div>
      
      <div class="section-header">💡 Skills & Description</div>
      
      <div class="form-group">
        <label for="skillsGained">🏷️ Skills Gained <small>(Multi-select tags, press Enter to add)</small></label>
        <input type="text" id="skillsGained" placeholder="e.g., AWS, Cloud Architecture, DevOps" onkeypress="if(event.key==='Enter'){event.preventDefault();addTagFromInput()}">
        <div id="tagsContainer" class="tags-container"></div>
      </div>
      
      <div class="form-group">
        <label for="certDescription">📝 Description <small>(Optional)</small></label>
        <textarea id="certDescription" name="certDescription" rows="4" maxlength="500" placeholder="Additional details about this certification..."></textarea>
        <span class="char-counter"><span id="certDescCounter">0</span>/500</span>
      </div>
      
      <div class="form-actions">
        <button type="button" class="btn cancel-btn" onclick="closePortfolioModal()">Cancel</button>
        <button type="submit" class="btn save-btn">💾 Save</button>
      </div>
    </form>
  `;
}

// Generate Achievement Form HTML
function generateAchievementForm() {
  return `
    <div class="modal-header">
      <h2 id="modalTitle">🏆 Add Achievement</h2>
      <button class="close-btn" onclick="closePortfolioModal()">&times;</button>
    </div>
    
    <form id="portfolioForm" onsubmit="submitPortfolioForm(event)">
      <div class="form-group">
        <label for="achievementTitle">🏆 Achievement Title <span class="required">*</span></label>
        <input type="text" id="achievementTitle" name="title" required maxlength="100" placeholder="e.g., Best Developer Award 2024">
        <span class="char-counter"><span id="achievementTitleCounter">0</span>/100</span>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="achievementCategory">🏷️ Category <span class="required">*</span></label>
          <select id="achievementCategory" name="achievementCategory" required>
            <option value="">Select category</option>
            <option value="Award">🏆 Award</option>
            <option value="Recognition">⭐ Recognition</option>
            <option value="Milestone">🎯 Milestone</option>
            <option value="Competition">🏅 Competition</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="achievementDate">📅 Date <span class="required">*</span></label>
          <input type="date" id="achievementDate" name="achievementDate" required>
        </div>
      </div>
      
      <div class="field-group-separator"></div>
      
      <div class="section-header">📄 Description</div>
      
      <div class="form-group">
        <label for="achievementDescription">📝 Description <span class="required">*</span></label>
        <textarea id="achievementDescription" name="achievementDescription" rows="6" maxlength="500" placeholder="Describe your achievement..." required></textarea>
        <span class="char-counter"><span id="achievementDescCounter">0</span>/500</span>
      </div>
      
      <div class="field-group-separator"></div>
      
      <div class="section-header">🖼️ Media & Details</div>
      
      <div class="form-group">
        <label>🖼️ Icon/Image <small>(Max 5MB)</small></label>
        <div class="upload-area">
          <div class="upload-box" id="achievementUploadBox">
            <p>📁 Drag & drop image here, or</p>
            <a href="#" class="browse-link" id="achievementBrowseLink">click to browse</a>
          </div>
          <input type="file" id="achievementImageInput" accept="image/*" style="display: none;">
          <div id="imagePreview" class="image-preview-grid"></div>
        </div>
      </div>
      
      <div class="form-group">
        <label for="organization">🏢 Organization <small>(Optional)</small></label>
        <input type="text" id="organization" name="organization" maxlength="200" placeholder="e.g., Tech Conference 2024">
        <span class="char-counter"><span id="orgCounter">0</span>/200</span>
      </div>
      
      <div class="form-group">
        <label for="achievementDetails">📋 Achievement Details <small>(Optional, Long Text)</small></label>
        <textarea id="achievementDetails" name="achievementDetails" rows="6" maxlength="2000" placeholder="Detailed information about this achievement..."></textarea>
        <span class="char-counter"><span id="achievementDetailsCounter">0</span>/2000</span>
      </div>
      
      <div class="form-actions">
        <button type="button" class="btn cancel-btn" onclick="closePortfolioModal()">Cancel</button>
        <button type="submit" class="btn save-btn">💾 Save</button>
      </div>
    </form>
  `;
}

// Initialize form features
function initializeFormFeatures(type) {
  // Character counters
  setupCharacterCounters();
  
  // Date pickers
  if (type === 'project') {
    initDatePicker('startDate');
    initDatePicker('endDate');
  } else if (type === 'certification') {
    initDatePicker('issueDate');
    initDatePicker('expiryDate');
  } else if (type === 'achievement') {
    initDatePicker('achievementDate');
  }
  
  // Rich text editors are no longer used - all forms now use textarea
}

// Setup character counters
function setupCharacterCounters() {
  // Wait a bit for form to be fully rendered
  setTimeout(() => {
    const counters = {
      'title': 'titleCounter',
      'description': 'descCounter',
      'certName': 'certNameCounter',
      'issuingOrg': 'orgCounter',
      'certDescription': 'certDescCounter',
      'achievementTitle': 'achievementTitleCounter',
      'achievementDescription': 'achievementDescCounter',
      'achievementDetails': 'achievementDetailsCounter',
      'organization': 'orgCounter'
    };
    
    Object.keys(counters).forEach(inputId => {
      const input = document.getElementById(inputId);
      const counterId = counters[inputId];
      if (input && document.getElementById(counterId)) {
        // Setup listener for textarea/input
        const updateCounter = () => {
          const length = input.value?.length || input.textContent?.length || 0;
          updateCharCounter(counterId, length);
        };
        
        input.addEventListener('input', updateCounter);
        input.addEventListener('paste', () => setTimeout(updateCounter, 10));
        
        // Update counter on initial load
        const initialLength = input.value?.length || input.textContent?.length || 0;
        updateCharCounter(counterId, initialLength);
      }
    });
    
    // Also handle rich text editors
    const richTextEditors = document.querySelectorAll('[contenteditable="true"]');
    richTextEditors.forEach(editor => {
      const descCounter = document.getElementById('descCounter');
      const certDescCounter = document.getElementById('certDescCounter');
      const achievementDescCounter = document.getElementById('achievementDescCounter');
      
      // Contenteditable editors are no longer used - all descriptions use textarea now
    });
  }, 100);
}

function updateCharCounter(counterId, length) {
  const counter = document.getElementById(counterId);
  if (counter) counter.textContent = length;
}

// Auto-save setup
function setupAutoSave(type) {
  const form = document.getElementById('portfolioForm');
  if (!form) return;
  
  const inputs = form.querySelectorAll('input, textarea, select, [contenteditable]');
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      const formData = getFormData(type);
      autoSaveDraft(type, formData);
    });
  });
}

// Get form data
function getFormData(type) {
  const form = document.getElementById('portfolioForm');
  if (!form) {
    console.error('Form not found');
    return {};
  }
  
  const data = {
    type: type,
    tags: formState.tags || [],
    images: (formState.uploadedImages || []).map(img => ({ name: img.name, url: img.url }))
  };
  
  // Get all form fields
  const inputs = form.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    if (input.type === 'checkbox') {
      data[input.name || input.id] = input.checked;
    } else if (input.type === 'file') {
      // Skip file inputs
    } else if (input.type !== 'submit' && input.type !== 'button') {
      const value = input.value?.trim();
      if (value) {
        data[input.name || input.id] = value;
      }
    }
  });
  
  // Get rich text content (check all rich text editors)
  const richTextEditors = form.querySelectorAll('[contenteditable="true"]');
  richTextEditors.forEach(editor => {
    const content = editor.textContent?.trim() || editor.innerHTML?.replace(/<[^>]*>/g, '').trim();
    if (content) {
      // Use the editor's ID or name to determine which field it is
      const fieldName = editor.id || editor.name || 'description';
      data[fieldName] = editor.innerHTML || editor.textContent;
    }
  });
  
  // Debug: Log the form data
  console.log('Form data collected:', data);
  
  return data;
}

// Fill form from draft
function fillFormFromDraft(draft) {
  if (!draft) return;
  
  const form = document.getElementById('portfolioForm');
  if (!form) return;
  
  // Fill regular inputs
  Object.keys(draft).forEach(key => {
    if (key === 'type' || key === 'tags' || key === 'images') return;
    
    const input = form.querySelector(`[name="${key}"], #${key}`);
    if (input) {
      if (input.type === 'checkbox') {
        input.checked = draft[key];
      } else {
        input.value = draft[key];
      }
    }
  });
  
  // Fill rich text
  const richText = form.querySelector('[contenteditable="true"]');
  if (richText && draft.description) {
    richText.innerHTML = draft.description;
  }
  
  // Restore tags
  if (draft.tags) {
    formState.tags = draft.tags;
    const container = document.getElementById('tagsContainer');
    if (container) {
      draft.tags.forEach(tag => renderTag(tag, container));
    }
  }
  
  // Restore images
  if (draft.images) {
    formState.uploadedImages = draft.images;
    const container = document.getElementById('imagePreview');
    if (container) {
      draft.images.forEach(img => {
        const preview = document.createElement('div');
        preview.className = 'image-preview-item';
        preview.innerHTML = `
          <img src="${img.url}" alt="Preview">
          <button type="button" class="remove-image" onclick="removeImage('${img.url}')">×</button>
        `;
        container.appendChild(preview);
      });
    }
  }
}

// Save draft
function saveDraft() {
  const type = formState.currentType;
  if (!type) return;
  
  const formData = getFormData(type);
  autoSaveDraft(type, formData);
  showNotification('💾 Draft saved!', 'success');
}

// Submit form
async function submitPortfolioForm(event) {
  event.preventDefault();
  
  const type = formState.currentType;
  if (!type) {
    console.error('❌ No type specified');
    showNotification('❌ Error: Form type not specified', 'error');
    return;
  }
  
  const submitBtn = event.target.querySelector('button[type="submit"]');
  if (!submitBtn) {
    console.error('❌ Submit button not found');
    return;
  }
  
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Saving...';
  submitBtn.disabled = true;
  
  try {
    // Check if user is logged in first
    const user = CosmicAPI?.utils?.getCurrentUser();
    if (!user) {
      throw new Error('Please login to add items');
    }
    
    // Check if CosmicAPI is loaded
    if (!window.CosmicAPI || !CosmicAPI.projects) {
      throw new Error('API client not loaded. Please refresh the page.');
    }
    
    const formData = getFormData(type);
    console.log('📋 Form data for type', type, ':', formData);
    
    // Validate required fields
    if (type === 'certification') {
      if (!formData.title && !formData.certName) {
        throw new Error('Certificate name is required');
      }
      if (!formData.issuingOrganization) {
        throw new Error('Issuing organization is required');
      }
      if (!formData.issueDate) {
        throw new Error('Issue date is required');
      }
    } else if (type === 'achievement') {
      if (!formData.title && !formData.achievementTitle) {
        throw new Error('Achievement title is required');
      }
      if (!formData.achievementCategory) {
        throw new Error('Achievement category is required');
      }
      if (!formData.achievementDate) {
        throw new Error('Achievement date is required');
      }
    } else if (type === 'project') {
      if (!formData.title) {
        throw new Error('Project title is required');
      }
      if (!formData.description) {
        throw new Error('Project description is required');
      }
    }
    
    // Build request body based on type
    const requestBody = buildRequestBody(type, formData);
    console.log('📦 Request body:', requestBody);
    
    let response;
    try {
      if (formState.currentEditId) {
        // Update existing item
        console.log('Updating item:', formState.currentEditId);
        response = await CosmicAPI.projects.update(formState.currentEditId, requestBody);
      } else {
        // Add new item using the add endpoint
        console.log('Adding new item of type:', type);
        console.log('Request body:', JSON.stringify(requestBody, null, 2));
        response = await CosmicAPI.projects.add(type, requestBody);
      }
      
      console.log('API Response:', response);
      
      // Handle response (apiRequest already returns parsed JSON)
      if (response && response.success) {
        // Clear draft
        clearDraft(type);
        
        // Show success message
        const itemTypeName = type === 'certification' ? 'Certification' : type === 'achievement' ? 'Achievement' : 'Project';
        showNotification(`🎉 ${itemTypeName} saved successfully! Reloading...`, 'success');
        
        // Close modal
        closePortfolioModal();
        
        // ALWAYS reload the page to show new items - most reliable method
        setTimeout(() => {
          console.log('✅ Item saved successfully, reloading page...');
          window.location.reload();
        }, 800);
      } else {
        throw new Error(response?.message || response?.error || 'Failed to save item');
      }
    } catch (error) {
      console.error('❌ Form submission error:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Error details:', error.response || 'No response details');
      console.error('❌ Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      throw error;
    }
    
  } catch (error) {
    console.error('Form submission error:', error);
    const errorMessage = error.message || error.response?.data?.message || error.response?.data?.error || 'Failed to save item';
    showNotification('❌ Error: ' + errorMessage, 'error');
    
    // Re-enable button
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

// Build request body based on type
function buildRequestBody(type, formData) {
  console.log('Building request body for type:', type);
  console.log('Form data received:', formData);
  console.log('Form state tags:', formState.tags);
  console.log('Form state images:', formState.uploadedImages);
  
  const body = {
    type: type,
    title: formData.title || formData.certName || formData.achievementTitle || ''
  };
  
  if (!body.title) {
    throw new Error('Title is required');
  }
  
  if (type === 'project') {
    body.description = formData.description || formData.desc || '';
    body.category = formData.category || 'other';
    body.status = formData.status || 'completed';
    body.technologies = (formState.tags || []).map(tag => ({ name: tag }));
    body.links = {};
    if (formData.githubLink) body.links.github = formData.githubLink;
    if (formData.demoLink) body.links.live = formData.demoLink;
    if (formData.startDate) body.timeline = { startDate: formData.startDate };
    if (formData.endDate && body.timeline) body.timeline.endDate = formData.endDate;
  } else if (type === 'certification') {
    body.description = formData.certDescription || formData.description || 'Professional certification';
    body.certification = {
      issuingOrganization: formData.issuingOrganization || '',
      issueDate: formData.issueDate || '',
      expiryDate: formData.expiryDate || undefined,
      credentialId: formData.credentialId || undefined,
      credentialUrl: formData.credentialUrl || undefined,
      skillsGained: formState.tags || []
    };
    
    // Validate required fields
    if (!body.certification.issuingOrganization) {
      throw new Error('Issuing organization is required');
    }
    if (!body.certification.issueDate) {
      throw new Error('Issue date is required');
    }
    if (!body.description || body.description.trim() === '') {
      body.description = 'Professional certification';
    }
    
    // Ensure category is set
    body.category = 'certification';
    body.status = 'completed';
  } else if (type === 'achievement') {
    body.description = formData.achievementDescription || formData.description || 'Achievement earned';
    body.achievement = {
      achievementCategory: formData.achievementCategory || '',
      achievementDate: formData.achievementDate || '',
      organization: formData.organization || undefined,
      achievementDetails: formData.achievementDetails || undefined
    };
    
    // Validate required fields
    if (!body.achievement.achievementCategory) {
      throw new Error('Achievement category is required');
    }
    if (!body.achievement.achievementDate) {
      throw new Error('Achievement date is required');
    }
    if (!body.description || body.description.trim() === '') {
      body.description = 'Achievement earned';
    }
    
    // Ensure category is set - CRITICAL FIX
    body.category = 'achievement';
    body.status = 'completed';
  }
  
  // Handle images (for now, we'll use placeholder - in production, upload to server first)
  if (formState.uploadedImages && formState.uploadedImages.length > 0) {
    body.images = formState.uploadedImages.map(img => ({
      url: img.url, // In production, this should be server URL after upload
      isPrimary: img === formState.uploadedImages[0]
    }));
  }
  
  // Ensure visibility is set
  body.visibility = formData.visibility || 'public';
  
  console.log('Built request body:', body);
  return body;
}

// Close modal
function closePortfolioModal() {
  const modal = document.getElementById('portfolioModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
  }
  
  // Reset form state
  formState.currentType = null;
  formState.currentEditId = null;
  formState.uploadedImages = [];
  formState.tags = [];
}

// Certification Image Upload Handler
function handleCertImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (!file.type.startsWith('image/')) {
    showNotification('❌ Please upload only image files', 'error');
    return;
  }
  
  if (file.size > 5 * 1024 * 1024) {
    showNotification('❌ Image must be less than 5MB', 'error');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const previewContainer = document.getElementById('previewContainer');
    const preview = document.getElementById('preview');
    const fileName = document.getElementById('fileName');
    
    if (previewContainer && preview && fileName) {
      preview.src = e.target.result;
      fileName.textContent = file.name;
      previewContainer.style.display = 'block';
      
      // Store image data
      formState.uploadedImages = [{
        file: file,
        url: e.target.result,
        name: file.name
      }];
    }
  };
  reader.readAsDataURL(file);
}

function removeCertImage() {
  const previewContainer = document.getElementById('previewContainer');
  const fileInput = document.getElementById('certificateImage');
  
  if (previewContainer) previewContainer.style.display = 'none';
  if (fileInput) fileInput.value = '';
  formState.uploadedImages = [];
}

// Drag and drop handlers for certification
function setupCertDragDrop() {
  const uploadBox = document.getElementById('uploadBox');
  if (!uploadBox) return;
  
  uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadBox.classList.add('dragover');
  });
  
  uploadBox.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadBox.classList.remove('dragover');
  });
  
  uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadBox.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const fileInput = document.getElementById('certificateImage');
      if (fileInput) {
        // Create a new FileList and assign
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(files[0]);
        fileInput.files = dataTransfer.files;
        handleCertImageSelect({ target: fileInput });
      }
    }
  });
}

// Setup drag-drop for Project form
function setupProjectDragDrop() {
  const uploadBox = document.getElementById('projectUploadBox');
  if (!uploadBox) return;
  
  uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadBox.classList.add('dragover');
  });
  
  uploadBox.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadBox.classList.remove('dragover');
  });
  
  uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadBox.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const fileInput = document.getElementById('imageInput');
      if (fileInput) {
        const dataTransfer = new DataTransfer();
        Array.from(files).forEach(file => {
          if (file.type.startsWith('image/')) {
            dataTransfer.items.add(file);
          }
        });
        fileInput.files = dataTransfer.files;
        handleFileSelect({ target: fileInput });
      }
    }
  });
}

// Setup drag-drop for Achievement form
function setupAchievementDragDrop() {
  const uploadBox = document.getElementById('achievementUploadBox');
  if (!uploadBox) return;
  
  uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadBox.classList.add('dragover');
  });
  
  uploadBox.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadBox.classList.remove('dragover');
  });
  
  uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadBox.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const fileInput = document.getElementById('achievementImageInput');
      if (fileInput) {
        const dataTransfer = new DataTransfer();
        Array.from(files).forEach(file => {
          if (file.type.startsWith('image/')) {
            dataTransfer.items.add(file);
          }
        });
        fileInput.files = dataTransfer.files;
        handleFileSelect({ target: fileInput });
      }
    }
  });
}

// Legacy drag-drop handlers (kept for backward compatibility)
function handleDragOver(event) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.add('dragover');
}

function handleDragLeave(event) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.remove('dragover');
}

function handleDrop(event) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.remove('dragover');
  
  const files = event.dataTransfer.files;
  if (!files || files.length === 0) return;
  
  const container = document.getElementById('imagePreview');
  if (!container) {
    console.error('Image preview container not found');
    return;
  }
  
  // Create a file input event-like object
  const fakeEvent = {
    target: {
      files: files,
      multiple: true
    },
    dataTransfer: event.dataTransfer
  };
  
  handleImageUpload(fakeEvent, container);
}

function handleFileSelect(event) {
  if (!event || !event.target) {
    console.error('Invalid event in handleFileSelect');
    return;
  }
  
  const container = document.getElementById('imagePreview');
  if (!container) {
    console.error('Image preview container not found');
    return;
  }
  
  // Clear existing previews if single image mode
  const fileInput = event.target;
  if (!fileInput.multiple) {
    container.innerHTML = '';
    formState.uploadedImages = [];
  }
  
  handleImageUpload(event, container);
}

function addTagFromInput() {
  const input = document.getElementById('technologies') || document.getElementById('skillsGained');
  const container = document.getElementById('tagsContainer');
  if (input && container) {
    addTag(input, container);
  }
}

// Notification function (reuse from portfolio-new.html if exists)
function showNotification(message, type = 'info') {
  // Create notification directly - avoid recursion
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? 'rgba(46, 213, 115, 0.95)' : 'rgba(255, 86, 143, 0.95)'};
    color: white;
    padding: 15px 25px;
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    z-index: 10001;
    animation: slideIn 0.3s ease-out;
    font-weight: 500;
  `;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Make functions globally available
window.openAddModal = openAddModal;
window.closePortfolioModal = closePortfolioModal;
window.submitPortfolioForm = submitPortfolioForm;
window.saveDraft = saveDraft;
window.addTagFromInput = addTagFromInput;
window.handleDrop = handleDrop;
window.handleDragOver = handleDragOver;
window.handleDragLeave = handleDragLeave;
window.handleFileSelect = handleFileSelect;
window.handleCertImageSelect = handleCertImageSelect;
window.removeCertImage = removeCertImage;
window.removeImage = removeImage;
window.removeTag = removeTag;
window.formatText = formatText;

