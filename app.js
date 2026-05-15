// State
let state = {
  projects: [],
  activeProjectId: null
};

// Default ID Generator
const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

// DOM Elements
const els = {
  appContainer: document.getElementById('app-container'),
  projectList: document.getElementById('project-list'),
  newProjectBtn: document.getElementById('new-project-btn'),
  importBtn: document.getElementById('import-btn'),
  exportBtn: document.getElementById('export-btn'),
  noProjectView: document.getElementById('no-project-view'),
  projectView: document.getElementById('project-view'),
  currentProjectName: document.getElementById('current-project-name'),
  deleteProjectBtn: document.getElementById('delete-project-btn'),
  variablesContainer: document.getElementById('variables-container'),
  createVariableBtn: document.getElementById('create-variable-btn'),
  newTaskBtn: document.getElementById('new-task-btn'),
  templatesContainer: document.getElementById('templates-container'),
  createTemplateBtn: document.getElementById('create-template-btn'),
  varTemplate: document.getElementById('variable-template'),
  tplTemplate: document.getElementById('prompt-template-template'),
  openFullScreenBtn: document.getElementById('open-full-screen-btn'),
  openSidePanelBtn: document.getElementById('open-side-panel-btn'),
  mobileBackBtn: document.getElementById('mobile-back-btn'),
  mobileBackToProjectsBtn: document.getElementById('mobile-back-to-projects-btn')
};

// Initialize App
async function init() {
  const storedProjects = await Storage.get('projects');
  const storedActiveId = await Storage.get('activeProjectId');
  
  if (storedProjects) state.projects = storedProjects;
  if (storedActiveId) state.activeProjectId = storedActiveId;

  // Listen for storage changes from other views (Side Panel <-> Full Screen)
  Storage.onChange((changes) => {
    let changed = false;
    if (changes.projects) {
      if (JSON.stringify(state.projects) !== JSON.stringify(changes.projects.newValue)) {
        state.projects = changes.projects.newValue;
        changed = true;
      }
    }
    if (changes.activeProjectId) {
      if (state.activeProjectId !== changes.activeProjectId.newValue) {
        state.activeProjectId = changes.activeProjectId.newValue;
        changed = true;
      }
    }
    if (changed) render();
  });

  setupEventListeners();
  render();
  
  // Set initial mobile view state
  if (state.activeProjectId) {
    showMainContent();
  } else {
    showSidebar();
  }
}

// Mobile view togglers
function showSidebar() {
  els.appContainer.classList.remove('show-main');
  els.appContainer.classList.add('show-sidebar');
}

function showMainContent() {
  els.appContainer.classList.remove('show-sidebar');
  els.appContainer.classList.add('show-main');
}

// Event Listeners
function setupEventListeners() {
  els.newProjectBtn.addEventListener('click', () => {
    const newProject = {
      id: generateId(),
      name: 'New Project',
      variables: [],
      templates: []
    };
    state.projects.push(newProject);
    state.activeProjectId = newProject.id;
    saveState();
    showMainContent();
  });

  els.currentProjectName.addEventListener('blur', (e) => {
    const project = getActiveProject();
    if (project) {
      project.name = e.target.innerText;
      saveState();
    }
  });
  
  els.currentProjectName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.target.blur();
    }
  });

  els.deleteProjectBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete this project?')) {
      state.projects = state.projects.filter(p => p.id !== state.activeProjectId);
      state.activeProjectId = state.projects.length > 0 ? state.projects[0].id : null;
      saveState();
      if (!state.activeProjectId) showSidebar();
    }
  });

  els.createVariableBtn.addEventListener('click', () => {
    const project = getActiveProject();
    if (project) {
      project.variables.push({ id: generateId(), name: 'new_variable', value: '', isExpanded: false });
      saveState();
    }
  });

  els.newTaskBtn.addEventListener('click', () => {
    const project = getActiveProject();
    if (project) {
      project.variables.forEach(v => v.value = '');
      saveState();
    }
  });

  els.createTemplateBtn.addEventListener('click', () => {
    const project = getActiveProject();
    if (project) {
      project.templates.push({ id: generateId(), name: 'New Template', content: '', isExpanded: false });
      saveState();
    }
  });

  // Mobile Back Buttons
  els.mobileBackBtn.addEventListener('click', showSidebar);
  if (els.mobileBackToProjectsBtn) {
    els.mobileBackToProjectsBtn.addEventListener('click', showSidebar);
  }

  // Open Full Screen
  els.openFullScreenBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
  });

  // Open Side Panel (Only works if user interacts, requires Chrome 116+)
  els.openSidePanelBtn.addEventListener('click', () => {
    chrome.windows.getCurrent((window) => {
      chrome.sidePanel.open({ windowId: window.id });
    });
  });

  els.exportBtn.addEventListener('click', () => {
    const project = getActiveProject();
    if (!project) {
      alert('Please select a project to export.');
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify([project], null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    const safeName = project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'project';
    downloadAnchorNode.setAttribute("download", `${safeName}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  });

  els.importBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = e => { 
       const file = e.target.files[0]; 
       const reader = new FileReader();
       reader.readAsText(file,'UTF-8');
       reader.onload = readerEvent => {
          try {
            const content = readerEvent.target.result;
            let imported = JSON.parse(content);
            if (!Array.isArray(imported)) {
              imported = [imported];
            }
            
            imported.forEach(impProj => {
              if (!impProj.name || !impProj.variables || !impProj.templates) return;
              
              impProj.id = generateId(); // Prevent ID collisions
              
              let originalName = impProj.name;
              let newName = originalName;
              let counter = 1;
              while (state.projects.some(p => p.name === newName)) {
                newName = `${originalName} (${counter})`;
                counter++;
              }
              impProj.name = newName;
              
              state.projects.push(impProj);
            });
            
            if (imported.length > 0) {
              state.activeProjectId = imported[0].id; // Select the first imported project
              saveState();
              showMainContent();
            }
          } catch(err) {
            alert('Invalid file format or corrupt project file.');
          }
       }
    }
    input.click();
  });
}

// Helpers
function getActiveProject() {
  return state.projects.find(p => p.id === state.activeProjectId);
}

function saveState() {
  Storage.set('projects', state.projects);
  Storage.set('activeProjectId', state.activeProjectId);
  render(); // Local render
}

function silentSave() {
  Storage.set('projects', state.projects);
}

// Rendering
function render() {
  renderSidebar();
  renderMainArea();
}

function renderSidebar() {
  els.projectList.innerHTML = '';
  state.projects.forEach(project => {
    const li = document.createElement('li');
    li.className = `project-item ${project.id === state.activeProjectId ? 'active' : ''}`;
    
    const nameSpan = document.createElement('span');
    nameSpan.textContent = project.name;
    nameSpan.style.flex = '1';
    nameSpan.style.overflow = 'hidden';
    nameSpan.style.textOverflow = 'ellipsis';
    nameSpan.style.whiteSpace = 'nowrap';
    li.appendChild(nameSpan);

    const cloneBtn = document.createElement('button');
    cloneBtn.className = 'btn icon-btn';
    cloneBtn.textContent = '📄'; // Clone icon
    cloneBtn.title = 'Clone Project';
    cloneBtn.onclick = (e) => {
      e.stopPropagation();
      const cloned = JSON.parse(JSON.stringify(project));
      cloned.id = generateId();
      cloned.name += ' (Copy)';
      state.projects.push(cloned);
      state.activeProjectId = cloned.id;
      saveState();
      showMainContent();
    };
    li.appendChild(cloneBtn);

    li.onclick = () => {
      state.activeProjectId = project.id;
      saveState();
      showMainContent();
    };
    els.projectList.appendChild(li);
  });
}

function renderMainArea() {
  const project = getActiveProject();
  if (!project) {
    els.noProjectView.classList.remove('hidden');
    els.projectView.classList.add('hidden');
    return;
  }

  els.noProjectView.classList.add('hidden');
  els.projectView.classList.remove('hidden');

  if (document.activeElement !== els.currentProjectName) {
    els.currentProjectName.textContent = project.name;
  }

  renderVariables(project);
  renderTemplates(project);
}

function renderVariables(project) {
  els.variablesContainer.innerHTML = '';
  project.variables.forEach((v, index) => {
    const node = els.varTemplate.content.cloneNode(true);
    const item = node.querySelector('.variable-item');
    
    if (v.isExpanded) item.classList.add('expanded');

    const nameEl = item.querySelector('.variable-name');
    nameEl.textContent = v.name;
    nameEl.onblur = (e) => {
      v.name = e.target.textContent;
      saveState();
    };
    nameEl.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } };

    const quickInputEl = item.querySelector('.quick-input');
    const fullInputEl = item.querySelector('.variable-input');
    
    quickInputEl.value = v.value || '';
    fullInputEl.value = v.value || '';

    // Sync quick input and full input, and save silently
    quickInputEl.oninput = (e) => {
      v.value = e.target.value;
      fullInputEl.value = v.value;
      silentSave();
    };

    fullInputEl.oninput = (e) => {
      v.value = e.target.value;
      quickInputEl.value = v.value;
      silentSave();
    };

    const expandBtn = item.querySelector('.expand-btn');
    expandBtn.onclick = () => {
      v.isExpanded = !v.isExpanded;
      item.classList.toggle('expanded');
      silentSave();
    };

    item.querySelector('.clear-var-btn').onclick = () => {
      v.value = '';
      quickInputEl.value = '';
      fullInputEl.value = '';
      silentSave();
    };

    item.querySelector('.delete-var-btn').onclick = () => {
      project.variables.splice(index, 1);
      saveState();
    };

    const moveUpBtn = item.querySelector('.move-up-btn');
    const moveDownBtn = item.querySelector('.move-down-btn');
    
    if (index === 0) moveUpBtn.disabled = true;
    if (index === project.variables.length - 1) moveDownBtn.disabled = true;

    moveUpBtn.onclick = () => {
      if (index > 0) {
        const temp = project.variables[index];
        project.variables[index] = project.variables[index - 1];
        project.variables[index - 1] = temp;
        saveState();
      }
    };

    moveDownBtn.onclick = () => {
      if (index < project.variables.length - 1) {
        const temp = project.variables[index];
        project.variables[index] = project.variables[index + 1];
        project.variables[index + 1] = temp;
        saveState();
      }
    };

    els.variablesContainer.appendChild(node);
  });
}

function renderTemplates(project) {
  els.templatesContainer.innerHTML = '';
  project.templates.forEach((t, index) => {
    const node = els.tplTemplate.content.cloneNode(true);
    const item = node.querySelector('.template-item');
    
    if (t.isExpanded) item.classList.add('expanded');

    const nameEl = item.querySelector('.template-name');
    nameEl.textContent = t.name;
    nameEl.onblur = (e) => {
      t.name = e.target.textContent;
      saveState();
    };
    nameEl.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } };

    const contentEl = item.querySelector('.template-content');
    contentEl.value = t.content;
    contentEl.oninput = (e) => {
      t.content = e.target.value;
      silentSave();
    };

    const expandBtn = item.querySelector('.expand-btn');
    expandBtn.onclick = () => {
      t.isExpanded = !t.isExpanded;
      item.classList.toggle('expanded');
      silentSave();
    };

    // Variable insertion buttons
    const varInsertContainer = item.querySelector('.template-variables-insert');
    project.variables.forEach(v => {
      const btn = document.createElement('button');
      btn.className = 'var-insert-btn';
      btn.textContent = `[${v.name}]`;
      btn.onclick = () => {
        const cursor = contentEl.selectionStart;
        const textBefore = t.content.substring(0, cursor);
        const textAfter = t.content.substring(cursor);
        t.content = textBefore + `[${v.name}]` + textAfter;
        contentEl.value = t.content;
        silentSave();
        
        // Focus and set cursor after insertion
        setTimeout(() => {
          contentEl.focus();
          contentEl.selectionStart = contentEl.selectionEnd = cursor + v.name.length + 2;
        }, 0);
      };
      varInsertContainer.appendChild(btn);
    });

    item.querySelector('.delete-tpl-btn').onclick = () => {
      project.templates.splice(index, 1);
      saveState();
    };

    const moveUpBtn = item.querySelector('.move-up-btn');
    const moveDownBtn = item.querySelector('.move-down-btn');
    
    if (index === 0) moveUpBtn.disabled = true;
    if (index === project.templates.length - 1) moveDownBtn.disabled = true;

    moveUpBtn.onclick = () => {
      if (index > 0) {
        const temp = project.templates[index];
        project.templates[index] = project.templates[index - 1];
        project.templates[index - 1] = temp;
        saveState();
      }
    };

    moveDownBtn.onclick = () => {
      if (index < project.templates.length - 1) {
        const temp = project.templates[index];
        project.templates[index] = project.templates[index + 1];
        project.templates[index + 1] = temp;
        saveState();
      }
    };

    const copyBtn = item.querySelector('.copy-btn');
    copyBtn.onclick = () => {
      let finalPrompt = t.content;
      project.variables.forEach(v => {
        // Replace all occurrences of [variable_name] with its value (or empty string if no value)
        const regex = new RegExp(`\\[${v.name}\\]`, 'g');
        finalPrompt = finalPrompt.replace(regex, v.value || '');
      });
      
      navigator.clipboard.writeText(finalPrompt).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.remove('primary-btn');
        copyBtn.classList.add('secondary-btn');
        setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.classList.add('primary-btn');
          copyBtn.classList.remove('secondary-btn');
        }, 2000);
      });
    };

    els.templatesContainer.appendChild(node);
  });
}

// Start
document.addEventListener('DOMContentLoaded', init);
