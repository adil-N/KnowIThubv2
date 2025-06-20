// frontend/src/js/utils/fileHandlers.js
import { ui } from './ui.js';

export const fileHandlers = {
    processFile(file, callback, editor) {
        const serverUrl = window.location.origin;
        try {
            if (file.type.startsWith('image/')) {
                return this.handleImageUpload(file, callback, serverUrl);
            } else if (file.name.match(/\.(xlsx|xls)$/)) {
                return this.handleExcelFile(file, callback, editor);
            } else if (file.name.match(/\.pdf$/)) {
                return this.handlePDFFile(file, callback, serverUrl);
            } else {
                return this.handleDocumentFile(file, callback, serverUrl);
            }
        } catch (error) {
            console.error('File processing error:', error);
            ui.showError('Failed to process file');
        }
    },

    handleImageUpload(file, callback, serverUrl) {
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                // Compress image
                const img = new Image();
                img.src = reader.result;
                
                await new Promise(resolve => {
                    img.onload = resolve;
                });
    
                // Create canvas to resize and compress
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Limit max width/height while maintaining aspect ratio
                const MAX_WIDTH = 1920;
                const MAX_HEIGHT = 1080;
                let width = img.width;
                let height = img.height;
    
                // Scale down if needed
                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
    
                canvas.width = width;
                canvas.height = height;
    
                // Draw compressed image
                ctx.drawImage(img, 0, 0, width, height);
    
                // Convert to compressed data URL (JPEG with reduced quality)
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
    
                const html = `
                    <div class="image-preview mb-4">
                        <img src="${compressedDataUrl}" 
                             alt="${file.name}"
                             class="max-w-full h-auto rounded-lg shadow-md">
                        <div class="mt-2 text-sm text-gray-500">
                            ${file.name} (Compressed: ${Math.round(compressedDataUrl.length / 1024)}KB)
                        </div>
                    </div>`;
                
                callback(html, {
                    title: file.name,
                    alt: file.name
                });
            } catch (error) {
                console.error('Image compression error:', error);
                ui.showError('Failed to compress image');
            }
        };
        reader.onerror = (error) => {
            console.error('Error reading image:', error);
            ui.showError('Failed to load image');
        };
        reader.readAsDataURL(file);
    },

    handleExcelFile(file, callback, editor) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { 
                    type: 'array',
                    cellDates: true,
                    cellStyles: true,
                    cellNF: true
                });

                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                    header: 1,
                    raw: false,
                    dateNF: 'yyyy-mm-dd'
                });

                const tableHtml = `
                    <div class="excel-container" data-filename="${file.name}">
                        <div class="excel-toolbar bg-gray-100 p-3 flex items-center justify-between">
                            <span class="excel-filename text-gray-600 font-medium">${file.name}</span>
                            <div class="flex space-x-3">
                                <button type="button" class="excel-edit px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                                    <span class="flex items-center">
                                        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                        </svg>
                                        Edit
                                    </span>
                                </button>
                                <button type="button" class="excel-download px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
                                    <span class="flex items-center">
                                        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                        </svg>
                                        Download
                                    </span>
                                </button>
                                <button type="button" class="excel-save px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors hidden">
                                    <span class="flex items-center">
                                        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                        </svg>
                                        Save Changes
                                    </span>
                                </button>
                            </div>
                        </div>
                        <div class="excel-table-wrapper overflow-x-auto max-h-[500px]">
                            <table class="excel-table min-w-full bg-white">
                                <thead class="bg-gray-50 sticky top-0">
                                    ${jsonData[0] ? `
                                        <tr>
                                            ${jsonData[0].map((header, index) => `
                                                <th class="px-4 py-2 text-left text-sm font-semibold text-gray-600 border border-gray-200"
                                                    data-col="${index}">
                                                    ${header || ''}
                                                </th>
                                            `).join('')}
                                        </tr>
                                    ` : ''}
                                </thead>
                                <tbody>
                                    ${jsonData.slice(1).map((row, rowIndex) => `
                                        <tr>
                                            ${row.map((cell, colIndex) => `
                                                <td class="px-4 py-2 text-sm text-gray-600 border border-gray-200"
                                                    data-row="${rowIndex + 1}"
                                                    data-col="${colIndex}">
                                                    ${cell || ''}
                                                </td>
                                            `).join('')}
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>`;

                if (callback) {
                    callback(tableHtml, { title: file.name });
                } else if (editor) {
                    editor.insertContent(tableHtml);
                    this.setupExcelEventListeners(editor);
                }
            } catch (error) {
                console.error('Excel processing error:', error);
                ui.showError('Failed to process Excel file');
            }
        };
        reader.readAsArrayBuffer(file);
    },

    handlePDFFile(file, callback, serverUrl) {
        const previewHtml = `
            <div class="pdf-preview border rounded-lg overflow-hidden mb-4">
                <div class="pdf-toolbar bg-gray-100 p-3 flex items-center justify-between">
                    <span class="pdf-filename text-gray-600 font-medium flex items-center">
                        <svg class="w-5 h-5 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                        </svg>
                        ${file.name}
                    </span>
                    <div class="flex space-x-3">
                        <button type="button" 
                                onclick="window.open('${serverUrl}/uploads/${file.name}', '_blank')"
                                class="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                            <span class="flex items-center">
                                <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                                </svg>
                                Open PDF
                            </span>
                        </button>
                        <a href="${serverUrl}/uploads/${file.name}" 
                           download="${file.name}"
                           class="px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
                            <span class="flex items-center">
                                <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                </svg>
                                Download
                            </span>
                        </a>
                    </div>
                </div>
                <div class="pdf-content bg-gray-50 p-4">
                    <div class="aspect-[8.5/11] rounded-lg overflow-hidden shadow-inner">
                        <iframe src="${serverUrl}/uploads/${file.name}#toolbar=0"
                                class="w-full h-full border-0"
                                type="application/pdf">
                            <object data="${serverUrl}/uploads/${file.name}" 
                                    type="application/pdf" 
                                    width="100%" 
                                    height="100%">
                                <iframe src="https://docs.google.com/viewer?url=${encodeURIComponent(serverUrl + '/uploads/' + file.name)}&embedded=true"
                                        width="100%" 
                                        height="100%" 
                                        frameborder="0">
                                    <p>This browser does not support PDF viewing. Please 
                                        <a href="${serverUrl}/uploads/${file.name}" target="_blank">download the PDF</a> 
                                        to view it.
                                    </p>
                                </iframe>
                            </object>
                        </iframe>
                    </div>
                </div>
            </div>`;
        callback(previewHtml, { title: file.name });
    },

    handleDocumentFile(file, callback, serverUrl) {
        const [icon, color] = this.getFileIconAndColor(file.name);
        const previewHtml = `
            <div class="file-preview flex items-center p-4 border rounded-lg mb-4 bg-white">
                <div class="file-icon text-4xl mr-4 ${color}">${icon}</div>
                <div class="file-info flex-1">
                    <div class="file-name font-medium text-gray-900">${file.name}</div>
                    <div class="file-size text-sm text-gray-500 mb-2">${this.formatFileSize(file.size)}</div>
                    <div class="file-actions flex space-x-3">
                        <a href="${serverUrl}/uploads/${file.name}" 
                           target="_blank"
                           class="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors inline-flex items-center">
                            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                            </svg>
                            Open
                        </a>
                        <a href="${serverUrl}/uploads/${file.name}" 
                           download="${file.name}"
                           class="px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition-colors inline-flex items-center">
                            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                            </svg>
                            Download
                        </a>
                    </div>
                </div>
            </div>`;
        callback(previewHtml, { title: file.name });
    },

    setupExcelEventListeners(editor) {
        const container = editor.getBody().querySelector('.excel-container:last-child');
        if (!container) return;

        const editBtn = container.querySelector('.excel-edit');
        const downloadBtn = container.querySelector('.excel-download');
        const saveBtn = container.querySelector('.excel-save');
        const table = container.querySelector('.excel-table');

        if (editBtn) {
            editBtn.onclick = () => {
                table.setAttribute('contenteditable', 'true');
                editBtn.classList.add('hidden');
                saveBtn.classList.remove('hidden');
                table.classList.add('editing');
            };
        }

        if (downloadBtn) {
            downloadBtn.onclick = () => this.downloadExcel(container);
        }

        if (saveBtn) {
            saveBtn.onclick = () => {
                table.setAttribute('contenteditable', 'false');
                saveBtn.classList.add('hidden');
                editBtn.classList.remove('hidden');
                table.classList.remove('editing');
                this.downloadExcel(container);
            };
        }
    },

    getFileIconAndColor(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            'pdf': ['📄', 'text-red-500'],
            'doc': ['📝', 'text-blue-500'],
            'docx': ['📝', 'text-blue-500'],
            'txt': ['📋', 'text-gray-500'],
            'xls': ['📊', 'text-green-500'],
            'xlsx': ['📊', 'text-green-500'],
            'ppt': ['📊', 'text-orange-500'],
            'pptx': ['📊', 'text-orange-500'],
            'default': ['📁', 'text-gray-500']
        };
        return icons[ext] || icons.default;
    },

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    downloadExcel(container) {
        try {
            const table = container.querySelector('.excel-table');
            const filename = container.dataset.filename;
            const data = [];

            table.querySelectorAll('tr').forEach(row => {
                const rowData = [];
                row.querySelectorAll('td, th').forEach(cell => {
                    rowData.push(cell.textContent.trim());
                });
                data.push(rowData);
            });

            const ws = XLSX.utils.aoa_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

            XLSX.writeFile(wb, filename);
            ui.showError('Excel file downloaded successfully', 'success');
            return true;
        } catch (error) {
            console.error('Error downloading Excel:', error);
            ui.showError('Failed to download Excel file');
            return false;
        }
    }
};

// Add necessary CSS styles
const style = document.createElement('style');
style.textContent = `
    .excel-container {
        margin: 1rem 0;
        border-radius: 0.5rem;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .excel-table-wrapper {
        max-height: 500px;
        overflow-y: auto;
        background: white;
    }

    .excel-table {
        width: 100%;
        border-collapse: collapse;
    }

    .excel-table.editing td {
        background: #fff;
        transition: background 0.2s;
    }

    .excel-table.editing td:hover {
        background: #f8fafc;
    }

    .pdf-preview {
        background: white;
    }

    .pdf-content {
        min-height: 600px;
    }

    .file-preview {
        transition: all 0.2s;
    }

    .file-preview:hover {
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
`;
document.head.appendChild(style);