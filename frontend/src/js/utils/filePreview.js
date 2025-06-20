// frontend/src/js/utils/filePreview.js

import { ExcelViewer } from './excelViewer.js';

class FilePreview {
    constructor() {
        this.excelViewer = new ExcelViewer();
        this.supportedTypes = {
            pdf: ['application/pdf'],
            excel: [
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel',
                'application/x-excel',
                'application/excel'
            ],
            image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            text: ['text/plain', 'text/csv'],
            word: [
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/msword'
            ],
            powerpoint: [
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'application/vnd.ms-powerpoint'
            ]
        };
    }

    async previewFile(filename, container, options = {}) {
        try {
            // First get file metadata from your preview API
            const response = await fetch(`/api/preview/${filename}`);
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Failed to get file information');
            }

            const fileData = result.data;
            const fileType = this.detectFileType(fileData.type, filename);
            
            // Clear container
            container.innerHTML = '';
            
            switch (fileType) {
                case 'pdf':
                    this.previewPDF(fileData, container, options);
                    break;
                case 'excel':
                    await this.previewExcel(fileData, container, options);
                    break;
                case 'image':
                    this.previewImage(fileData, container, options);
                    break;
                case 'text':
                    await this.previewText(fileData, container, options);
                    break;
                case 'word':
                case 'powerpoint':
                    this.previewOfficeFile(fileData, fileType, container, options);
                    break;
                default:
                    this.showUnsupportedFile(fileData, container, options);
            }
        } catch (error) {
            console.error('Error previewing file:', error);
            this.showError(container, error.message);
        }
    }

    detectFileType(mimeType, filename) {
        // Check by MIME type first
        for (const [type, mimeTypes] of Object.entries(this.supportedTypes)) {
            if (mimeTypes.includes(mimeType)) {
                return type;
            }
        }
        
        // Fallback to file extension
        const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        switch (extension) {
            case '.pdf':
                return 'pdf';
            case '.xlsx':
            case '.xls':
            case '.xlsm':
            case '.xlsb':
                return 'excel';
            case '.jpg':
            case '.jpeg':
            case '.png':
            case '.gif':
            case '.webp':
                return 'image';
            case '.txt':
            case '.csv':
                return 'text';
            case '.docx':
            case '.doc':
                return 'word';
            case '.pptx':
            case '.ppt':
                return 'powerpoint';
            default:
                return 'unknown';
        }
    }

    previewPDF(fileData, container, options) {
        const height = options.height || '600px';
        container.innerHTML = `
            <div class="pdf-preview bg-white rounded-lg shadow-lg">
                <div class="border-b border-gray-200 p-4 flex justify-between items-center">
                    <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                        <svg class="w-6 h-6 mr-2 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                        </svg>
                        PDF Viewer
                    </h3>
                    <div class="flex space-x-2">
                        <a href="${fileData.previewUrl}" target="_blank" 
                           class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                            <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                            </svg>
                            Open in New Tab
                        </a>
                        <a href="${fileData.downloadUrl}" 
                           class="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
                            <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            Download
                        </a>
                    </div>
                </div>
                <div class="p-4">
                    <iframe 
                        src="${fileData.previewUrl}#toolbar=1&navpanes=1&scrollbar=1" 
                        style="width: 100%; height: ${height}; border: none; border-radius: 8px;"
                        title="PDF Preview">
                    </iframe>
                </div>
                <div class="border-t border-gray-200 px-4 py-2 bg-gray-50 text-sm text-gray-600">
                    <span>File: ${fileData.filename} | Size: ${this.formatFileSize(fileData.size)}</span>
                </div>
            </div>
        `;
    }

    async previewExcel(fileData, container, options) {
        // Use the Excel viewer component
        await this.excelViewer.viewExcelFile(fileData.previewUrl, container);
    }

    previewImage(fileData, container, options) {
        container.innerHTML = `
            <div class="image-preview bg-white rounded-lg shadow-lg">
                <div class="border-b border-gray-200 p-4 flex justify-between items-center">
                    <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                        <svg class="w-6 h-6 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        Image Preview
                    </h3>
                    <div class="flex space-x-2">
                        <a href="${fileData.previewUrl}" target="_blank" 
                           class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                            <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                            </svg>
                            Open Full Size
                        </a>
                        <a href="${fileData.downloadUrl}" 
                           class="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
                            <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            Download
                        </a>
                    </div>
                </div>
                <div class="p-4 flex justify-center">
                    <img src="${fileData.previewUrl}" 
                         alt="${fileData.filename}"
                         class="max-w-full max-h-96 object-contain rounded-lg shadow-md"
                         onerror="this.parentElement.innerHTML='<div class=&quot;text-red-500 p-4&quot;>Error loading image</div>'">
                </div>
                <div class="border-t border-gray-200 px-4 py-2 bg-gray-50 text-sm text-gray-600">
                    <span>File: ${fileData.filename} | Size: ${this.formatFileSize(fileData.size)}</span>
                </div>
            </div>
        `;
    }

    async previewText(fileData, container, options) {
        try {
            const response = await fetch(fileData.previewUrl);
            const textContent = await response.text();
            
            container.innerHTML = `
                <div class="text-preview bg-white rounded-lg shadow-lg">
                    <div class="border-b border-gray-200 p-4 flex justify-between items-center">
                        <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                            <svg class="w-6 h-6 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            Text File Preview
                        </h3>
                        <div class="flex space-x-2">
                            <a href="${fileData.downloadUrl}" 
                               class="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
                                <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                                Download
                            </a>
                        </div>
                    </div>
                    <div class="p-4">
                        <pre class="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 text-sm font-mono border">${this.escapeHtml(textContent)}</pre>
                    </div>
                    <div class="border-t border-gray-200 px-4 py-2 bg-gray-50 text-sm text-gray-600">
                        <span>File: ${fileData.filename} | Size: ${this.formatFileSize(fileData.size)} | Lines: ${textContent.split('\n').length}</span>
                    </div>
                </div>
            `;
        } catch (error) {
            this.showError(container, 'Failed to load text content');
        }
    }

    previewOfficeFile(fileData, fileType, container, options) {
        const typeConfig = {
            word: {
                icon: 'text-blue-600',
                name: 'Word Document',
                iconPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
            },
            powerpoint: {
                icon: 'text-orange-600',
                name: 'PowerPoint Presentation',
                iconPath: 'M7 4v16l7-4 7 4V4H7z'
            }
        };

        const config = typeConfig[fileType];
        
        container.innerHTML = `
            <div class="office-preview bg-white rounded-lg shadow-lg">
                <div class="border-b border-gray-200 p-4 flex justify-between items-center">
                    <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                        <svg class="w-6 h-6 mr-2 ${config.icon}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${config.iconPath}"></path>
                        </svg>
                        ${config.name} Preview
                    </h3>
                    <div class="flex space-x-2">
                        <a href="${fileData.downloadUrl}" 
                           class="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
                            <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            Download to View
                        </a>
                    </div>
                </div>
                <div class="p-8 text-center">
                    <svg class="w-16 h-16 mx-auto mb-4 ${config.icon}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${config.iconPath}"></path>
                    </svg>
                    <h4 class="text-xl font-semibold text-gray-700 mb-2">${config.name}</h4>
                    <p class="text-gray-500 mb-4">This file type requires download to view content.</p>
                    <p class="text-sm text-gray-400">Click "Download to View" to open in your default application.</p>
                </div>
                <div class="border-t border-gray-200 px-4 py-2 bg-gray-50 text-sm text-gray-600">
                    <span>File: ${fileData.filename} | Size: ${this.formatFileSize(fileData.size)}</span>
                </div>
            </div>
        `;
    }

    showUnsupportedFile(fileData, container, options) {
        container.innerHTML = `
            <div class="unsupported-preview bg-white rounded-lg shadow-lg">
                <div class="border-b border-gray-200 p-4 flex justify-between items-center">
                    <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                        <svg class="w-6 h-6 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        File Preview
                    </h3>
                    <div class="flex space-x-2">
                        <a href="${fileData.downloadUrl}" 
                           class="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
                            <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            Download
                        </a>
                    </div>
                </div>
                <div class="p-8 text-center">
                    <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <h4 class="text-xl font-semibold text-gray-700 mb-2">Preview Not Available</h4>
                    <p class="text-gray-500 mb-4">This file type cannot be previewed in the browser.</p>
                    <p class="text-sm text-gray-400">Click "Download" to save the file to your device.</p>
                </div>
                <div class="border-t border-gray-200 px-4 py-2 bg-gray-50 text-sm text-gray-600">
                    <span>File: ${fileData.filename} | Type: ${fileData.type} | Size: ${this.formatFileSize(fileData.size)}</span>
                </div>
            </div>
        `;
    }

    showError(container, message) {
        container.innerHTML = `
            <div class="error-preview bg-white rounded-lg shadow-lg">
                <div class="p-8 text-center">
                    <svg class="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                    <h4 class="text-xl font-semibold text-red-700 mb-2">Preview Error</h4>
                    <p class="text-red-500 mb-4">${message}</p>
                    <p class="text-sm text-gray-400">Please try refreshing the page or contact support if the problem persists.</p>
                </div>
            </div>
        `;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export for use in other modules
export { FilePreview };