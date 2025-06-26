// frontend/src/js/code/codeList.js
import { api } from '../utils/api.js';
import { ui } from '../utils/ui.js';
import { auth } from '../utils/auth.js';
import { events } from '../utils/events.js';



// frontend/src/js/code/codeList.js - Add these helper functions at the top
const detectDateFormat = (dateStr) => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;

    return {
        day: parts[0],
        month: parts[1],
        year: parts[2],
        monthFormat: {
            isUpperCase: parts[1] === parts[1].toUpperCase(),
            isLowerCase: parts[1] === parts[1].toLowerCase(),
            isFullName: parts[1].length > 3,
            originalValue: parts[1]
        }
    };
};

const formatToOriginalStyle = (dateStr, originalFormat) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);

    // Get the month in the original format
    const monthMappings = {
        short: {
            upper: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
            lower: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
        },
        full: {
            upper: ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'],
            lower: ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
        }
    };

    const monthIndex = date.getMonth();
    let month;

    if (originalFormat.monthFormat.isFullName) {
        month = originalFormat.monthFormat.isUpperCase ?
            monthMappings.full.upper[monthIndex] :
            monthMappings.full.lower[monthIndex];
    } else {
        month = originalFormat.monthFormat.isUpperCase ?
            monthMappings.short.upper[monthIndex] :
            monthMappings.short.lower[monthIndex];
    }

    return `${day}-${month}-${year}`;
};
export const codeList = {

    // Helper to escape HTML entities
    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') {
            console.warn('escapeHtml called with non-string value:', unsafe);
            // Attempt to convert non-strings, or return as is
            try {
                return String(unsafe)
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;");
            } catch (e) {
                console.error("Could not convert value to string for escaping:", unsafe);
                return unsafe; // Return original value if conversion fails
            }
        }
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    },
    currentPage: 1,
    snippetsPerPage: 50,
    initialized: false,
    snippets: [],
    selectedSnippetId: null,

    async initialize() {
        if (this.initialized) return;

        const container = document.getElementById('codeSnippetsSection');
        if (!container) {
            console.error('Code snippets section not found');
            return;
        }

        // Clear any existing content
        container.innerHTML = `
         
        <div class="bg-gray-900 rounded-xl shadow-2xl border border-gray-700 p-6 mb-8">
        <!-- Centered Header -->
        <div class="text-center mb-4">
            <h1 class="text-3xl font-bold text-white">❮Code Snippets❯</h1>
            <p class="text-gray-300 mt-2">Manage and execute your SQL code snippets</p>
        </div>
        
        <!-- Button Row -->
        <div class="flex justify-end">
            <button id="addSnippetBtn" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300 flex items-center shadow-lg hover:shadow-xl">
                <span class="material-icons-outlined mr-2">add</span>
                Add Snippet
            </button>
        </div>
    </div>
    
                <!-- Two-column layout -->
                <div class="flex gap-6">
                    <!-- Snippets List Sidebar -->
                    <div class="w-64 flex-shrink-0">
                        <div class="bg-white rounded-lg shadow-md p-4">
                            <div class="mb-4">
                                <input type="text"
                                       id="snippetSearch"
                                       placeholder="Search snippets..."
                                       class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div id="snippetsList" class="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
                                <!-- Snippets list will be dynamically inserted here -->
                            </div>
                        </div>
                    </div>

                    <!-- Main Content Area -->
                    <div class="flex-1">
                        <div id="selectedSnippetContainer" class="bg-white rounded-lg shadow-md">
                            <!-- Selected snippet will be displayed here -->
                            <div class="p-8 text-center text-gray-500">
                                Select a snippet to view its contents
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();
        await this.loadSnippets();
        this.initialized = true;

    },

    setupEventListeners() {
        // Add snippet button
        const addBtn = document.getElementById('addSnippetBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                window.location.hash = '#create-snippet';
            });
        }

        // Search functionality
        const searchInput = document.getElementById('snippetSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        // Global click handlers for actions
        document.addEventListener('click', (e) => {
            // Copy button handler
            const copyBtn = e.target.closest('.copy-btn');
if (copyBtn) {
    const editor = document.getElementById('snippetCodeEditor');
    const currentCode = editor?.value || '';
    navigator.clipboard.writeText(currentCode).then(() => {
        ui.showSuccess('Code copied to clipboard!');
        const icon = copyBtn.querySelector('.material-icons-outlined');
        if (icon) {
            const originalText = icon.textContent;
            icon.textContent = 'check';
            setTimeout(() => { icon.textContent = originalText; }, 2000);
        }
    }).catch(() => ui.showError('Failed to copy code'));
}


           // Execute POFM button handler
            const executePofmBtn = e.target.closest('.execute-pofm-btn');
            if (executePofmBtn) {
                this.executePOFM();
            }
// Execute Mercury button handler
const executeMercuryBtn = e.target.closest('.execute-mercury-btn');
if (executeMercuryBtn) {
    this.executeMercury();
}
            // Delete button handler
            const deleteBtn = e.target.closest('.delete-btn');
            if (deleteBtn) {
                const snippetId = deleteBtn.dataset.snippetId;
                if (snippetId && confirm('Are you sure you want to delete this snippet?')) {
                    this.deleteSnippet(snippetId);
                }
            }
        });
    },
// Enhanced parameter update handler
setupParameterEventListeners() {
    const pm = document.getElementById('parameterManagement');
    if(!pm) return;
    pm.querySelectorAll('.param-input').forEach(input=>{
      input.addEventListener('input',()=>{
        const idx = parseInt(input.dataset.index,10);
        const editor = document.getElementById('snippetCodeEditor');
        if(!editor) return;
        let code = editor.value;

       
        // A more robust solution might re-parse `params` here.
        const params = this.detectSQLParameters(code); // Or use stored params if guaranteed up-to-date
        const param = params[idx]; // Find the param corresponding to the input index
        if(!param) {
            console.error("Could not find parameter for index:", idx);
            return;
        }

        let replacementVal = input.value;

        // Preserve date style!
        if(param.isDate){
          const originalDateValue = input.dataset.original || param.value; // Use original value for format detection
          const fmt = detectDateFormat(originalDateValue);
          if (fmt) { // Check if format detection was successful
            replacementVal = formatToOriginalStyle(input.value, fmt);
          } else {
            console.warn("Could not detect original date format for:", originalDateValue, "Using input value directly:", input.value);
            // Fallback: use the raw input value if format detection fails
            // replacementVal = input.value; // Already set, just for clarity
          }
        }

        let updatedCode=code;

        // --- More Robust Parameter Replacement Logic ---
        // Escape special regex characters in the value to be replaced
        const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const originalValueEscaped = escapeRegex(param.value); // Use the param's tracked value

        try {
            if(param.isInClause){
              const newVals = replacementVal.split(',').map(v=>`'${v.trim().replace(/'/g,"''")}'`).join(', '); // Escape single quotes for SQL
              // Find the specific IN clause using start/end indices
              const clauseRegex = new RegExp(escapeRegex(param.field) + `\\s+in\\s*\\([^)]*\\)`, 'i');
              const match = code.substring(param.clauseStart).match(clauseRegex); // Search within the expected area
              if (match && code.substring(param.clauseStart).indexOf(match[0]) === 0) { // Ensure it matches at the start index
                  const oldClause = match[0];
                  const newClause = oldClause.replace(/\([^)]+\)/, `(${newVals})`);
                  updatedCode = code.substring(0, param.clauseStart) + newClause + code.substring(param.clauseStart + oldClause.length);
              } else {
                  console.warn("Could not reliably replace IN clause, falling back to simple replace:", param.field);
                  // Fallback (less safe)
                  updatedCode = code.replace(param.clause, param.clause.replace(/\([^)]+\)/, `(${newVals})`));
              }
            } else if(param.isBetweenStart){
              const re = new RegExp(`(between\\s+)'${originalValueEscaped}'`,'i');
              // Replace only the first match after the parameter's start index if possible
              updatedCode = code.substring(0, param.start) + code.substring(param.start).replace(re, `$1'${replacementVal}'`);
            } else if(param.isBetweenEnd){
              const re = new RegExp(`(and\\s+)'${originalValueEscaped}'`,'i');
               // Replace only the first match after the parameter's start index if possible
              updatedCode = code.substring(0, param.start) + code.substring(param.start).replace(re, `$1'${replacementVal}'`);
            } else {
               // Replace simple 'value' - try to be specific using start index
               const prefix = code.substring(0, param.start);
               const suffix = code.substring(param.start);
               const valueRegex = new RegExp(`'${originalValueEscaped}'`);
               updatedCode = prefix + suffix.replace(valueRegex, `'${replacementVal}'`);
            }
        } catch (e) {
            console.error("Error during parameter replacement:", e);
            // Fallback to less safe global replace if specific logic fails
            updatedCode = code.replace(new RegExp(`'${originalValueEscaped}'`, 'g'), `'${replacementVal}'`);
        }
        // --- End Robust Replacement Logic ---


        editor.value=updatedCode;
        // Update the parameter object's value in memory IF you are reusing the params array
        // This requires params to be stored/accessible, e.g., this.currentParams
        // param.value = replacementVal; // Be careful with modifying detected params directly

        input.dataset.original = replacementVal; // Update original value tracking for date formatting

        // --- Trigger Line Number Update ---
        if (editor.updateLineNumbers) {
            editor.updateLineNumbers();
        }
        // --- End Trigger ---

        // --- Trigger Syntax Highlighting Update ---
        if (this.applySimpleSyntaxHighlighting) {
             this.applySimpleSyntaxHighlighting(editor);
        }
         // --- End Trigger ---
      });
    });
  },
  
  
  
  
    async loadSnippets() {
        try {
            ui.showLoading();
            const response = await api.get(`/api/code-snippets?page=${this.currentPage}&limit=${this.snippetsPerPage}`);

            if (response.success) {
                this.snippets = response.data;
                this.renderSnippetsList(response.data);

                if (this.selectedSnippetId) {
                    const selectedSnippet = this.snippets.find(s => s.snippetId === this.selectedSnippetId);
                    if (selectedSnippet) {
                        this.showSnippet(selectedSnippet);
                    } else {
                        // If selected snippet is no longer in the list (e.g., deleted), clear selection
                        this.selectedSnippetId = null;
                        document.getElementById('selectedSnippetContainer').innerHTML = `
                            <div class="p-8 text-center text-gray-500">
                                Select a snippet to view its contents
                            </div>`;
                    }
                }
            } else {
                ui.showError('Failed to load code snippets');
            }
        } catch (error) {
            console.error('Error loading snippets:', error);
            ui.showError('Error loading code snippets');
        } finally {
            ui.hideLoading();
        }
    },

    renderSnippetsList(snippets) {
        const container = document.getElementById('snippetsList');
        if (!container) return;

        container.innerHTML = '';

        if (snippets.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4 text-gray-500">
                    No code snippets found
                </div>
            `;
            return;
        }

        snippets.forEach(snippet => {
            const div = document.createElement('div');
            div.className = `p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors
                           ${this.selectedSnippetId === snippet.snippetId ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`;

            div.innerHTML = `
                <h3 class="font-medium text-gray-800 mb-1">${this.escapeHtml(snippet.title)}</h3>
                <div class="flex flex-wrap gap-1 mt-2">
                    ${(snippet.tags || []).map(tag => `
                        <span class="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                            ${this.escapeHtml(tag)}
                        </span>
                    `).join('')}
                </div>
            `;

            div.addEventListener('click', () => {
                this.selectedSnippetId = snippet.snippetId;
                this.showSnippet(snippet);
                // Update active state visually
                document.querySelectorAll('#snippetsList > div').forEach(el => {
                    el.classList.remove('bg-blue-50', 'border-l-4', 'border-blue-500');
                });
                div.classList.add('bg-blue-50', 'border-l-4', 'border-blue-500');
            });

            container.appendChild(div);
        });
    },
// Method to detect SQL parameters

detectSQLParameters(code) {
    const params = [];
    const ranges = [];
  
    const overlaps = (s, e) => ranges.some(r => s < r.end && e > r.start);
  
    const addParam = (start, end, param) => {
      ranges.push({start, end});
      params.push(param);
    };
  
    const makeCommentedCheck = (start) => {
      const lineStart = code.lastIndexOf('\n', start) + 1;
      const commentPos = code.indexOf('--', lineStart);
      return {lineStart, isCommented: (commentPos !== -1 && commentPos < start)};
    };
  
    // --- BETWEEN ---
    const betweenRegex = /((?:\b\w+\.)?\w+)\s+between\s+'([^']+)'\s+and\s+'([^']+)'/gi;
    for(const m of code.matchAll(betweenRegex)) {
      const s = m.index, e = s + m[0].length;
      const {lineStart, isCommented} = makeCommentedCheck(s);
      addParam(s,e, {
        clause: m[0], start:s, end:e, clauseLineStart: lineStart,
        field: m[1].split('.').pop()+' (From)', value:m[2], isBetweenStart:true, betweenEndValue:m[3], isDate:true, isCommented
      });
      addParam(s,e, {
        clause: m[0], start:s, end:e, clauseLineStart: lineStart,
        field: m[1].split('.').pop()+' (To)', value:m[3], isBetweenEnd:true, betweenStartValue:m[2], isDate:true, isCommented
      });
    }
  
    // --- IN ---
    const inRegex = /((?:\b\w+\.)?\w+)\s+in\s*\(([^)]+)\)/gi;
    for(const m of code.matchAll(inRegex)){
      const s = m.index, e = s + m[0].length;
      if(overlaps(s,e)) continue;
      const {lineStart, isCommented } = makeCommentedCheck(s);
      const vs = m[2].split(',').map(v=>v.trim().replace(/^'(.*)'$/, '$1'));
      addParam(s,e, {
        clause: m[0], start:s, end:e, clauseLineStart: lineStart,
        field: m[1].split('.').pop(), value: vs.join(', '),
        isInClause:true, originalValues: vs, isCommented,
        clauseStart: s, clauseEnd: e
      });
    }
  
    // --- EQ or LIKE ---
    const eqLike = /((?:\b\w+\.)?\w+)\s*(=|like)\s*\(?\s*'([^']*)'\s*\)?/gi;
    for(const m of code.matchAll(eqLike)){
      const s = m.index, e = s + m[0].length;
      if(overlaps(s,e)) continue;
      const {lineStart, isCommented } = makeCommentedCheck(s);
      addParam(s,e,{
        clause: m[0], start:s, end:e, clauseLineStart: lineStart,
        field: m[1].split('.').pop(), value:m[3], isCommented
      });
    }
  
    return params;
  },
  
  
  toggleCommentForParameter(param, editor) {
    let code = editor.value;
    const { start, end } = param;
    const before = code.slice(0, start);
    const clause = code.slice(start, end);
    const after  = code.slice(end);
  
    // Figure out if line is commented
    const lineStart = code.lastIndexOf('\n', start) + 1;
    const commentPos = code.indexOf('--', lineStart);
    const isCommented = commentPos !== -1 && commentPos < start;
  
    if (isCommented) {
      // Uncomment
      const uncommentedLine = code.slice(lineStart).replace(/^\s*--\s?/, '');
      code = code.slice(0, lineStart) + uncommentedLine;
    } else {
      // Comment
      const commentedLine = '-- ' + code.slice(lineStart);
      code = code.slice(0, lineStart) + commentedLine;
    }
  
    editor.value = code;
  },
    



// Corrected renderParameterEditors method
renderParameterEditors(params){
    if(!params?.length) return '<div class="p-3 text-gray-500">No parameters found</div>';
    return `
    <div class="grid gap-3">
      ${params.map((p,i)=>{
        let val = p.value;
        let dateVal = '';
        let isDate = !!p.isDate;
        if(isDate){
          try{
            const dparts = val.split('-');
            let day=parseInt(dparts[0]); let y = dparts[2]; let monthStr=dparts[1].toLowerCase();
            let fullYear = y.length===2?('20'+y):y;
            const months = {'jan':0,'feb':1,'mar':2,'apr':3,'may':4,'jun':5,
                            'jul':6,'aug':7,'sep':8,'oct':9,'nov':10,'dec':11,
                            'january':0,'february':1,'march':2,'april':3,'may':4,'june':5,
                            'july':6,'august':7,'september':8,'october':9,'november':10,'december':11};
            const m=months[monthStr];
            const dt = new Date(Date.UTC(fullYear,m,day));
            dateVal = dt.toISOString().split('T')[0];
          } catch{}
        }
  
        const inputHtml = isDate
        ? `<input type="date" data-index="${i}" class="param-input flex-1 border rounded px-2 py-1" value="${dateVal}" data-original="${p.value}">`
        : `<input type="text" data-index="${i}" class="param-input flex-1 border rounded px-2 py-1" value="${this.escapeHtml(p.value)}" data-original="${this.escapeHtml(p.value)}">`;
  
        return `<div class="flex items-center gap-2 ${p.isCommented ? 'opacity-50' : ''}">
          <label class="min-w-[180px] truncate">${this.escapeHtml(p.field)}</label>
          ${inputHtml}
          <button type="button" onclick="codeList.toggleCommentLine(${p.clauseLineStart})" class="px-2 py-1 text-xs rounded font-semibold ${p.isCommented ? 'bg-green-500 text-white border border-green-600 hover:bg-green-600' : 'bg-red-500 text-white border border-red-600 hover:bg-red-600'}">${p.isCommented ? 'Uncomment' : 'Comment'}</button>
        </div>`;
      }).join('')}
    </div>`;
  },
  
  
  
  

  toggleCommentLine(lineStart){
    const ed = document.getElementById('snippetCodeEditor');
    if(!ed) return;
    const c = ed.value;
    // Ensure lineStart is a valid index
    if (lineStart < 0 || lineStart >= c.length) {
        console.error("Invalid lineStart index for toggleCommentLine:", lineStart);
        return;
    }
    const lineEnd = c.indexOf('\n', lineStart);
    const end = lineEnd === -1 ? c.length : lineEnd;

    const line = c.slice(lineStart,end);
    const trimmedLine = line.trimStart();
    const commented = trimmedLine.startsWith('--');
    let newLine;

    if (commented) {
        // Find the position of '--' and remove it and potentially one space after it
        const commentMarkerIndex = line.indexOf('--');
        if (line[commentMarkerIndex + 2] === ' ') {
            newLine = line.substring(0, commentMarkerIndex) + line.substring(commentMarkerIndex + 3);
        } else {
            newLine = line.substring(0, commentMarkerIndex) + line.substring(commentMarkerIndex + 2);
        }
    } else {
        // Add '-- ' preserving original indentation
        const indentation = line.match(/^\s*/)[0];
        newLine = indentation + '-- ' + trimmedLine;
    }


    ed.value = c.slice(0,lineStart)+newLine+c.slice(end);

    // --- Trigger Line Number Update ---
    if (ed.updateLineNumbers) {
        ed.updateLineNumbers();
    }
    // --- End Trigger ---

     // --- Trigger Syntax Highlighting Update ---
     if (this.applySimpleSyntaxHighlighting) {
        this.applySimpleSyntaxHighlighting(ed);
     }
    // --- End Trigger ---

    // Re-render parameters as commenting changes them
    const params = this.detectSQLParameters(ed.value);
    const pm = document.getElementById('parameterManagement');
    if (pm) { // Check if parameter management exists
        pm.innerHTML = this.renderParameterEditors(params);
        this.setupParameterEventListeners(); // Re-attach listeners to new inputs
    } else {
        console.warn("Parameter management container not found after toggling comment.");
    }
  },
  
  
  
  
showSnippet(snippet) {
    const container = document.getElementById('selectedSnippetContainer');
    if (!container || !snippet) {
        container.innerHTML = `<div class="p-8 text-center text-gray-500">Snippet not found or invalid.</div>`;
        return;
    }

    // Detect parameters before rendering
    const parameters = this.detectSQLParameters(snippet.code || '');
    const parameterEditorsHtml = this.renderParameterEditors(parameters);

    // Initialize the content
    container.innerHTML = `
    <div class="p-6">
        <!-- Header with title -->
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold text-gray-800">${this.escapeHtml(snippet.title)}</h2>
        </div>

        <!-- Description -->
        <p class="text-sm text-gray-600 mb-4">${this.escapeHtml(snippet.description || 'No description')}</p>

        <!-- First control copy -->
        <div class="snippet-actions flex items-center space-x-2 mb-4">
            <button class="copy-btn flex items-center px-3 py-1.5 rounded bg-gray-50 text-gray-600 hover:bg-gray-100"
                    title="Copy Code">
                <span class="material-icons-outlined text-lg mr-1">content_copy</span>
                Copy
            </button>
            <button class="export-sql-btn flex items-center px-3 py-1.5 rounded bg-gray-50 text-gray-600 hover:bg-gray-100"
                    data-snippet-id="${snippet.snippetId}" title="Export as SQL">
                <span class="material-icons-outlined text-lg mr-1">download</span>
                Export
            </button>
            <button class="delete-btn flex items-center px-3 py-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100"
                    data-snippet-id="${snippet.snippetId}" title="Delete Snippet">
                <span class="material-icons-outlined text-lg mr-1">delete</span>
                Delete
            </button>
        </div>

        <!-- Code display block with Line Numbers -->
        <div class="relative mb-6">
            <h3 class="text-md font-semibold mb-3 border-b pb-2">Code</h3>
            <div id="codeEditorContainer" class="flex border border-gray-700 rounded-lg overflow-hidden h-64 resize-y bg-gray-900 focus-within:ring-1 focus-within:ring-blue-400">
                <textarea id="lineNumbers"
                          class="w-12 p-4 font-mono text-m text-right text-gray-500 bg-gray-800 border-r border-gray-700 resize-none select-none outline-none overflow-hidden"
                          readonly aria-hidden="true" tabindex="-1"></textarea>
                <textarea id="snippetCodeEditor"
                          spellcheck="false"
                          autocorrect="off"
                          autocapitalize="off"
                          class="flex-1 p-4 font-mono text-m bg-gray-900 text-gray-100 border-none rounded-none focus:ring-0 resize-none outline-none">${this.escapeHtml(snippet.code || '')}</textarea>
            </div>
        </div>

        

       


            <!-- Parameter Management Section - Moved below code -->
            <div id="parameterManagement" class="mb-4 ${parameters.length > 0 ? '' : 'hidden'}">
                <h3 class="text-md font-semibold mb-3 border-b pb-2">Parameters</h3>
                ${parameterEditorsHtml}
            </div>

         
           <!-- Second control copy under textarea -->
        <div class="flex justify-center items-center mb-6">
    <div class="snippet-actions flex items-center gap-3 p-4 bg-gray-50 rounded-xl shadow-sm border border-gray-200">
        
        <!-- Copy Updated Code Button -->
        <button class="copy-btn group flex items-center px-4 py-2.5 rounded-lg bg-white text-gray-700 hover:text-gray-900 hover:bg-gray-100 border border-gray-300 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
                title="Copy Updated SQL Code with Applied Parameters">
            <span class="material-icons-outlined text-lg mr-2 group-hover:scale-110 transition-transform duration-200">integration_instructions</span>
            <span class="font-medium">Copy SQL Code</span>
        </button>
        
        <!-- Execute POFM Button - Dark Oracle Theme -->
        <button class="execute-pofm-btn group flex items-center px-4 py-2.5 rounded-lg bg-gradient-to-r from-gray-800 to-gray-900 text-white hover:from-gray-900 hover:to-black border border-gray-900 hover:border-black transition-all duration-200 shadow-sm hover:shadow-lg transform hover:-translate-y-0.5"
                title="Execute POFM Oracle Database Query">
            <span class="material-icons-outlined text-lg mr-2 group-hover:scale-110 transition-transform duration-200">dns</span>
            <span class="font-medium">Execute POFM</span>
        </button>
        
        <!-- Execute Mercury Button - Dark Oracle Theme -->
        <button class="execute-mercury-btn group flex items-center px-4 py-2.5 rounded-lg bg-gradient-to-r from-gray-800 to-gray-900 text-white hover:from-gray-900 hover:to-black border border-gray-900 hover:border-black transition-all duration-200 shadow-sm hover:shadow-lg transform hover:-translate-y-0.5"
                title="Execute Mercury Oracle Database Query">
            <span class="material-icons-outlined text-lg mr-2 group-hover:scale-110 transition-transform duration-200">dns</span>
            <span class="font-medium">Execute Mercury</span>
        </button>
    </div>
</div>
            
    `;
    

    // Setup line numbers and syntax highlighting
    const codeEditor = document.getElementById('snippetCodeEditor');
    const lineNumbers = document.getElementById('lineNumbers');
    if (codeEditor && lineNumbers) {
        // Apply basic styling needed for alignment
        const editorStyles = window.getComputedStyle(codeEditor);
        const lineHeight = editorStyles.lineHeight;
        const paddingTop = editorStyles.paddingTop;
        const paddingBottom = editorStyles.paddingBottom;
        const fontFamily = editorStyles.fontFamily;
        const fontSize = editorStyles.fontSize;

        // Apply consistent styles to both textareas
        const commonStyles = {
            lineHeight: lineHeight,
            fontFamily: fontFamily,
            fontSize: fontSize,
            tabSize: "4", // Explicitly set tab size
            paddingTop: paddingTop, // Match padding
            paddingBottom: paddingBottom,
        };

        Object.assign(codeEditor.style, commonStyles);
        Object.assign(lineNumbers.style, commonStyles);
        // Specific styles for line numbers
        lineNumbers.style.paddingRight = '8px'; // Adjust as needed
        lineNumbers.style.paddingLeft = '8px'; // Adjust as needed
        lineNumbers.style.width = 'auto'; // Let width adjust to content initially
        lineNumbers.style.minWidth = '3em'; // Ensure minimum width


        // Apply syntax highlighting (if function exists)
        if (this.applySimpleSyntaxHighlighting) {
            this.applySimpleSyntaxHighlighting(codeEditor);
        } else {
            console.warn("applySimpleSyntaxHighlighting function not found.");
        }

        // Setup line number functionality
        this.setupLineNumberSync(codeEditor, lineNumbers);
    } else {
        console.error("Could not find codeEditor or lineNumbers element.");
    }

    // Re-attach parameter event listeners after rendering new content
    this.setupParameterEventListeners();
    // Attach specific listeners for this snippet view if needed (e.g., export button)
    this.setupSnippetEventListeners(container, snippet);
},

// --- ADD NEW METHOD ---
setupLineNumberSync(codeEditor, lineNumbers) {
    const updateLines = () => {
        try {
            // Ensure elements still exist
            if (!document.body.contains(codeEditor) || !document.body.contains(lineNumbers)) {
                console.log("Line number sync elements no longer in DOM, skipping update.");
                return; // Stop if elements are removed
            }

            const lines = codeEditor.value.split('\n');
            const lineCount = lines.length;
            const lineNumbersText = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');

            // Only update if the text actually changes to prevent unnecessary redraws/reflows
            if (lineNumbers.value !== lineNumbersText) {
                 lineNumbers.value = lineNumbersText;
                 // Adjust width dynamically based on the number of digits
                 const maxDigits = String(lineCount).length;
                 const approxCharWidth = parseFloat(window.getComputedStyle(lineNumbers).fontSize) * 0.6; // Estimate character width
                 const newWidth = Math.max(3, maxDigits + 1) * approxCharWidth + 16; // Add padding (16px = 8px left + 8px right)
                 lineNumbers.style.width = `${Math.max(40, newWidth)}px`; // Ensure minimum width (e.g., 40px)
            }

            // Synchronize scroll position immediately after updating lines
            // Use requestAnimationFrame for smoother scroll syncing potentially
            requestAnimationFrame(() => {
                 if (document.body.contains(lineNumbers) && document.body.contains(codeEditor)) {
                    lineNumbers.scrollTop = codeEditor.scrollTop;
                 }
            });
        } catch (error) {
            console.error("Error updating line numbers:", error);
            if (document.body.contains(lineNumbers)) {
                lineNumbers.value = "Err"; // Indicate an issue briefly
            }
        }
    };

    // Initial update
    updateLines();

    // --- Event Listeners ---
    const syncScroll = () => {
        if (document.body.contains(lineNumbers)) { // Check element exists
             lineNumbers.scrollTop = codeEditor.scrollTop;
        }
    };

    const handleInput = () => {
        updateLines();
        // Also trigger syntax highlighting update if needed
        if (this.applySimpleSyntaxHighlighting) {
            this.applySimpleSyntaxHighlighting(codeEditor);
        }
    };

    const handleKeyDown = (e) => {
        // Update on keys that change line count or structure significantly
        if (['Enter', 'Backspace', 'Delete'].includes(e.key) || (e.ctrlKey && ['x', 'v', 'z', 'y'].includes(e.key.toLowerCase()))) {
             // Small delay allows the textarea value to update before recalculating
             setTimeout(updateLines, 0);
        }
        // Handle Tab key for indentation (optional, basic version)
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = codeEditor.selectionStart;
            const end = codeEditor.selectionEnd;
            const tabChar = '    '; // 4 spaces for tab
            codeEditor.value = codeEditor.value.substring(0, start) + tabChar + codeEditor.value.substring(end);
            codeEditor.selectionStart = codeEditor.selectionEnd = start + tabChar.length;
            updateLines(); // Update lines after tab insertion
        }
    };

    // Attach listeners
    codeEditor.addEventListener('scroll', syncScroll);
    codeEditor.addEventListener('input', handleInput);
    codeEditor.addEventListener('keydown', handleKeyDown);

    // Store the update function reference and cleanup logic
    codeEditor.updateLineNumbers = updateLines;
    codeEditor.cleanupLineNumbers = () => {
        console.log("Cleaning up line number listeners for", codeEditor.id);
        codeEditor.removeEventListener('scroll', syncScroll);
        codeEditor.removeEventListener('input', handleInput);
        codeEditor.removeEventListener('keydown', handleKeyDown);
        // Clear references if needed
        delete codeEditor.updateLineNumbers;
        delete codeEditor.cleanupLineNumbers;
    };

  
},
// --- END NEW METHOD ---

// Add this new method for basic syntax coloring
applySimpleSyntaxHighlighting(textarea) {
    // Listen for changes to update syntax coloring
    textarea.addEventListener('input', function() {
        const value = this.value;
        // Apply syntax highlighting logic here if needed
    });
    
    textarea.classList.add('sql-editor');
    
    const style = document.createElement('style');
    style.textContent = `
        .sql-editor {
            color: #f8f8f2; /* Base text color */
            caret-color: white; /* Cursor color */
        }
        /* These styles are just for visual reference - they won't actually apply syntax highlighting */
        /* For real syntax highlighting, you'll need to implement a proper editor like CodeMirror */
    `;
    document.head.appendChild(style);
},



    // Setup listeners specific to the displayed snippet view
    setupSnippetEventListeners(container, snippet) {
        const exportBtn = container.querySelector('.export-sql-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', (e) => {
                const snippetId = e.currentTarget.dataset.snippetId;
                if (snippetId) {
                    this.exportSQL(snippetId);
                }
            });
        }
        
    },


    async deleteSnippet(snippetId) {
        try {
            ui.showLoading('Deleting snippet...');
            const response = await api.delete(`/api/code-snippets/${snippetId}`);
            if (response.success) {
                ui.showSuccess('Snippet deleted successfully');
                this.selectedSnippetId = null; // Clear selection
                document.getElementById('selectedSnippetContainer').innerHTML = `
                    <div class="p-8 text-center text-gray-500">
                        Select a snippet to view its contents
                    </div>`;
                await this.loadSnippets(); // Reload the list
            } else {
                ui.showError(response.message || 'Failed to delete snippet');
                 console.error('Detailed delete error:', {
                    status: response.status,
                    message: response.message,
                    data: response.data
                });
            }
        } catch (error) {
            console.error('Error deleting snippet:', error);
            ui.showError('An error occurred while deleting the snippet.');
        } finally {
            ui.hideLoading();
        }
    },


    formatDateForSQL(dateStr) {
        // Placeholder - implement actual date formatting if needed
        return dateStr;
    },

    formatDateForInput(dateStr) {
        try {
            // Assuming dateStr is in 'DD-Mon-YY' or similar SQL format
            // Convert to 'YYYY-MM-DD' for the date input
            const date = new Date(dateStr); // This might be unreliable; needs better parsing
            if (isNaN(date.getTime())) return '';
            return date.toISOString().split('T')[0];
        } catch (e) {
            console.error("Error formatting date for input:", e);
            return '';
        }
    },

    handleSearch(query) {
        const lowerQuery = query.toLowerCase().trim();
        if (!this.snippets) return;

        const filteredSnippets = this.snippets.filter(snippet => {
            const titleMatch = snippet.title?.toLowerCase().includes(lowerQuery);
            const descriptionMatch = snippet.description?.toLowerCase().includes(lowerQuery);
            const tagsMatch = snippet.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));
            const codeMatch = snippet.code?.toLowerCase().includes(lowerQuery); // Search in code too
            return titleMatch || descriptionMatch || tagsMatch || codeMatch;
        });

        this.renderSnippetsList(filteredSnippets);

        // If the selected snippet is no longer in the filtered list, clear the view
        if (this.selectedSnippetId && !filteredSnippets.some(s => s.snippetId === this.selectedSnippetId)) {
             document.getElementById('selectedSnippetContainer').innerHTML = `
                <div class="p-8 text-center text-gray-500">
                    Select a snippet to view its contents
                </div>`;
        }
    },
// Simple executePOFM method
async executePOFM() {
    try {
        if (!confirm('Download POFM launcher?')) {
            return;
        }

        const executePofmBtn = document.querySelector('.execute-pofm-btn');
        
        if (executePofmBtn) {
            executePofmBtn.disabled = true;
            executePofmBtn.innerHTML = `
                <span class="material-icons-outlined text-lg mr-2 animate-spin">download</span>
                Downloading...
            `;
        }

        // Download the POFM launcher
        const token = localStorage.getItem('token');
        const downloadUrl = `/api/batch/download/pofm-file`;
        
        const response = await fetch(downloadUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            // Create download link
            const link = document.createElement('a');
            link.href = url;
            link.download = 'POFM_Launcher.bat';
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            // Show simple success message
            this.showSimplePofmInstructions();
            
        } else {
            throw new Error('Download failed');
        }

    } catch (error) {
        console.error('Error downloading POFM launcher:', error);
        ui.showError('Error downloading POFM launcher');
    } finally {
        const executePofmBtn = document.querySelector('.execute-pofm-btn');
        if (executePofmBtn) {
            executePofmBtn.disabled = false;
            executePofmBtn.innerHTML = `
                <span class="material-icons-outlined text-lg mr-2">download</span>
                Download POFM
            `;
        }
    }
},

// Simple instructions popup
showSimplePofmInstructions() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div class="flex items-center mb-4">
                <span class="material-icons-outlined text-green-600 text-2xl mr-3">check_circle</span>
                <h3 class="text-lg font-semibold">POFM Launcher Downloaded!</h3>
            </div>
            
            <div class="mb-6 text-sm text-gray-700">
                <strong>How to use:</strong><br><br>
                1. Find <code>POFM_Launcher.bat</code> in your Downloads folder<br>
                2. Double-click the file to run it<br>
                3. If Windows shows a security warning, click "Run anyway"<br>
                4. The application will launch automatically<br><br>
                
                <strong>Tip:</strong> You can move this file to your Desktop for easy access.
            </div>
            
            <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div class="flex items-start">
                    <span class="material-icons-outlined text-amber-600 text-lg mr-2">info</span>
                    <div class="text-sm text-amber-800">
                        <strong>Security Note:</strong> Windows may show a warning when running batch files. 
                        This is normal - just click "Run anyway" to proceed.
                    </div>
                </div>
            </div>
            
            <button id="closePofmInstructions" class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Got it!
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    // Handle close
    const closeBtn = modal.querySelector('#closePofmInstructions');
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
},

async executeMercury() {
    try {
        // Show confirmation dialog
        if (!confirm('Are you sure you want to execute the Mercury batch file?')) {
            return;
        }

        const executeMercuryBtn = document.querySelector('.execute-mercury-btn');
        const originalContent = executeMercuryBtn?.innerHTML;
        
        // Show loading state
        if (executeMercuryBtn) {
            executeMercuryBtn.disabled = true;
            executeMercuryBtn.innerHTML = `
                <span class="material-icons-outlined text-lg mr-1 animate-spin">refresh</span>
                Executing...
            `;
        }

        ui.showLoading('Executing Mercury batch file...');

        const response = await api.post('/api/batch/execute/mercury', {});

        if (response.success) {
            ui.showSuccess('Mercury batch file executed successfully!');
            console.log('Mercury Execution Output:', response.data.output);
            
            // Optionally show output in a modal or alert
            if (response.data.output && response.data.output.trim()) {
                setTimeout(() => {
                    alert(`Mercury Execution Output:\n\n${response.data.output}`);
                }, 1000);
            }
        } else {
            ui.showError(response.message || 'Failed to execute Mercury batch file');
        }

    } catch (error) {
        console.error('Error executing Mercury batch file:', error);
        ui.showError('Error executing Mercury batch file');
    } finally {
        ui.hideLoading();
        
        // Restore button state
        const executeMercuryBtn = document.querySelector('.execute-mercury-btn');
        if (executeMercuryBtn) {
            executeMercuryBtn.disabled = false;
            executeMercuryBtn.innerHTML = `
                <span class="material-icons-outlined text-lg mr-1">rocket_launch</span>
                Execute Mercury
            `;
        }
    }
},
// end of executeMercury method
    cleanup() {
        const codeEditor = document.getElementById('snippetCodeEditor');
        if (codeEditor && typeof codeEditor.cleanupLineNumbers === 'function') {
            codeEditor.cleanupLineNumbers();
        }
        // --- END CLEANUP ---
        this.initialized = false;
        this.snippets = [];
        this.selectedSnippetId = null;
        const container = document.getElementById('codeSnippetsSection');
        if (container) container.innerHTML = '';
        // Remove global listeners added by this module if necessary
        // document.removeEventListener('click', ...); // Be careful with removing shared listeners
        console.log('Code List module cleaned up.');
    },

    escapeHtml(unsafe) {
        if (unsafe === null || unsafe === undefined) {
            return '';
        }
        return String(unsafe)
             .replace(/&/g, "&amp;")
             .replace(/</g, "<")
             .replace(/>/g, ">")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
     },

    async exportSQL(snippetId) {
        const snippet = this.snippets.find(s => s.snippetId === snippetId);
        if (!snippet) {
            ui.showError("Snippet not found for export.");
            return;
        }

        // Use the current code from the editor if available, otherwise use original
        const editor = document.getElementById('snippetCodeEditor');
        const codeToExport = editor ? editor.value : snippet.code;

        if (!codeToExport) {
             ui.showError("No code found to export.");
            return;
        }

        try {
            const blob = new Blob([codeToExport], { type: 'application/sql' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            // Sanitize title for filename
            const filename = (snippet.title || 'snippet').replace(/[^a-z0-9_\-\s]/gi, '_').replace(/\s+/g, '_') + '.sql';
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            ui.showSuccess(`Exported as ${filename}`);
        } catch (error) {
            console.error("Error exporting SQL:", error);
            ui.showError("Failed to export SQL file.");
        }
    }

    
};

function highlightSQL(code) {
    return code
        .replace(/\b(SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|JOIN|ON|AS|ORDER BY|GROUP BY|HAVING|LIMIT|OFFSET|DISTINCT)\b/gi,
            '<span class="text-blue-600 font-semibold">$1</span>')
        .replace(/\b(AND|OR|NOT|NULL|IS|IN|LIKE|BETWEEN|EXISTS|CASE|WHEN|THEN|ELSE|END)\b/gi,
            '<span class="text-purple-600 font-semibold">$1</span>')
        .replace(/('[^']*')/g,
            '<span class="text-green-600">$1</span>')
        .replace(/\b\d+\b/g,
            '<span class="text-yellow-400">$&</span>')
        .replace(/([=<>!]+)/g,
            '<span class="text-red-400">$1</span>');
}

// after `import { codeList } from ...` or after defining it:
window.codeList = codeList;
