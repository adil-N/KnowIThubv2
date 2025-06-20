// frontend/src/js/code/codeDetails.js
import { api } from '../utils/api.js';
import { ui } from '../utils/ui.js';

export const codeDetails = {
    currentSnippet: null,
    editedCode: null,
    dateRanges: [],

    async initialize(id) {
        try {
            ui.showLoading();
            const response = await api.get(`/api/code-snippets/${id}`);
            
            if (!response.success) {
                ui.showError('Failed to load snippet');
                return;
            }

            this.currentSnippet = response.data;
            this.editedCode = this.currentSnippet.code;
            this.renderSnippetDetails();
            this.setupEventListeners();
            this.detectDates(this.currentSnippet.code);

        } catch (error) {
            console.error('Error loading snippet:', error);
            ui.showError('Error loading snippet details');
        } finally {
            ui.hideLoading();
        }
    },

    renderSnippetDetails() {
        const container = document.getElementById('selectedSnippetContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="p-6">
                <div class="flex justify-between items-start mb-4">
                    <h2 class="text-xl font-semibold text-gray-800">${this.escapeHtml(this.currentSnippet.title)}</h2>
                    <div class="flex gap-2">
                        <button id="toggleEditBtn" class="p-2 rounded hover:bg-gray-100" title="Toggle Edit Mode">
                            <span class="material-icons-outlined text-gray-600">edit</span>
                        </button>
                        <button id="copySnippetBtn" class="p-2 rounded hover:bg-gray-100" title="Copy to clipboard">
                            <span class="material-icons-outlined text-gray-600">content_copy</span>
                        </button>
                    </div>
                </div>

                <!-- Code editing area -->
                <div class="relative mb-4">
                    <textarea id="snippetCodeEditor" class="w-full h-64 font-mono p-4 bg-gray-900 text-white rounded-lg hidden"></textarea>
                    <pre id="snippetCodeViewer" class="w-full h-64 font-mono p-4 bg-gray-900 text-white rounded-lg overflow-x-auto"><code class="language-sql">${this.highlightCode(this.currentSnippet.code)}</code></pre>
                </div>

                <!-- Date management section -->
                <div id="dateManagement" class="mb-4 hidden">
                    <h3 class="text-lg font-semibold mb-2">Date Management</h3>
                    <div id="datesList" class="space-y-2"></div>
                </div>

                <div class="flex flex-wrap gap-2 mb-4">
                    ${(this.currentSnippet.tags || []).map(tag => `
                        <span class="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full">
                            ${this.escapeHtml(tag)}
                        </span>
                    `).join('')}
                </div>
            </div>
        `;
    },

    setupEventListeners() {
        const toggleEditBtn = document.getElementById('toggleEditBtn');
        const copySnippetBtn = document.getElementById('copySnippetBtn');
        const codeEditor = document.getElementById('snippetCodeEditor');
        const codeViewer = document.getElementById('snippetCodeViewer');

        if (toggleEditBtn) {
            toggleEditBtn.addEventListener('click', () => {
                const isEditing = codeEditor.classList.contains('hidden');
                if (isEditing) {
                    // Switch to edit mode
                    codeEditor.value = this.editedCode || this.currentSnippet.code;
                    codeEditor.classList.remove('hidden');
                    codeViewer.classList.add('hidden');
                    document.getElementById('dateManagement').classList.remove('hidden');
                } else {
                    // Switch to view mode
                    this.editedCode = codeEditor.value;
                    codeViewer.innerHTML = `<code class="language-sql">${this.highlightCode(this.editedCode)}</code>`;
                    codeEditor.classList.add('hidden');
                    codeViewer.classList.remove('hidden');
                }
            });
        }

        if (copySnippetBtn) {
            copySnippetBtn.addEventListener('click', () => {
                const textToCopy = this.editedCode || this.currentSnippet.code;
                navigator.clipboard.writeText(textToCopy)
                    .then(() => {
                        ui.showSuccess('Code copied to clipboard!');
                    })
                    .catch(() => {
                        ui.showError('Failed to copy code');
                    });
            });
        }

        if (codeEditor) {
            codeEditor.addEventListener('input', (e) => {
                this.editedCode = e.target.value;
                this.detectDates(this.editedCode);
            });
        }
    },

    detectDates(text) {
        // Match common date formats
        const dateRegex = /\b\d{4}[-/.]\d{2}[-/.]\d{2}\b|\b\d{2}[-/.]\d{2}[-/.]\d{4}\b/g;
        this.dateRanges = [...new Set(text.match(dateRegex) || [])];
        this.renderDateManagement();
    },

    renderDateManagement() {
        const container = document.getElementById('datesList');
        if (!container) return;

        container.innerHTML = this.dateRanges.map(date => `
            <div class="flex items-center gap-2">
                <span class="font-mono">${date}</span>
                <input type="date" 
                       class="date-input border rounded px-2 py-1" 
                       data-original-date="${date}"
                       value="${this.formatDateForInput(date)}">
            </div>
        `).join('');

        // Add event listeners to date inputs
        container.querySelectorAll('.date-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const oldDate = e.target.dataset.originalDate;
                const newDate = e.target.value;
                if (newDate) {
                    this.updateDate(oldDate, newDate);
                }
            });
        });
    },

    // Update the updateDate method in codeDetails.js
updateDate(oldDate, newDate) {
    const formatted = newDate.replace(/\-/g, '/');
    const editor = document.getElementById('snippetCodeEditor');
    const viewer = document.getElementById('snippetCodeViewer');
    
    if (editor && !editor.classList.contains('hidden')) {
        // Get all date inputs with the same original value
        const similarInputs = document.querySelectorAll(`.date-input[data-original-date="${oldDate}"]`);
        
        // Update each input
        similarInputs.forEach(input => {
            input.dataset.originalDate = formatted;
        });
        
        // Replace all instances in the code
        this.editedCode = this.editedCode.replaceAll(oldDate, formatted);
        editor.value = this.editedCode;
    }
    
    viewer.innerHTML = `<code class="language-sql">${this.highlightCode(this.editedCode)}</code>`;
    this.detectDates(this.editedCode);
},

    formatDateForInput(dateStr) {
        // Convert date string to YYYY-MM-DD format for input
        const parts = dateStr.split(/[-/.]/);
        if (parts.length !== 3) return '';

        if (parts[0].length === 4) {
            // YYYY-MM-DD format
            return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        } else {
            // DD/MM/YYYY or MM/DD/YYYY format
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
    },

    highlightCode(code) {
        try {
            return Prism.highlight(
                code,
                Prism.languages.sql,
                'sql'
            );
        } catch (error) {
            console.warn('SQL highlighting failed:', error);
            return this.escapeHtml(code);
        }
    },

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
};