// frontend/src/js/utils/excelViewer.js

class ExcelViewer {
    constructor() {
        this.currentWorkbook = null;
        this.currentSheetIndex = 0;
    }

    async viewExcelFile(fileUrl, container) {
        try {
            container.innerHTML = '<div class="flex items-center justify-center p-8"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div><span class="ml-2">Loading Excel file...</span></div>';

            console.log('Loading Excel file from:', fileUrl);

            const response = await fetch(fileUrl);
            if (!response.ok) {
                throw new Error('Failed to fetch Excel file: ' + response.status);
            }

            const contentLength = response.headers.get('content-length');
            if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024) {
                throw new Error('File too large (>50MB). Please download to view.');
            }

            const arrayBuffer = await response.arrayBuffer();
            console.log('File loaded, size:', arrayBuffer.byteLength, 'bytes');
            
            if (this.currentWorkbook) {
                this.currentWorkbook = null;
            }
            
            this.currentWorkbook = XLSX.read(arrayBuffer, {
                type: 'array',
                cellStyles: false,
                cellFormulas: false,
                cellDates: true,
                cellNF: false,
                sheetStubs: false
            });

            console.log('Excel parsed, sheets:', this.currentWorkbook.SheetNames);
            this.renderExcelViewer(container, fileUrl);
            
        } catch (error) {
            console.error('Error viewing Excel file:', error);
            container.innerHTML = '<div class="bg-red-50 border border-red-200 rounded-lg p-4"><div class="flex items-center"><svg class="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg><span class="text-red-700">Error: ' + error.message + '</span></div></div>';
        }
    }

    renderExcelViewer(container, fileUrl) {
        const sheetNames = this.currentWorkbook.SheetNames;
        
        let tabsHTML = '';
        for (let i = 0; i < sheetNames.length; i++) {
            const isActive = i === this.currentSheetIndex;
            const activeClass = isActive ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700';
            tabsHTML += '<button class="sheet-tab px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ' + activeClass + '" data-sheet-index="' + i + '">' + this.escapeHtml(sheetNames[i]) + '</button>';
        }
        
        container.innerHTML = 
            '<div class="excel-viewer bg-white rounded-lg shadow-lg">' +
                '<div class="border-b border-gray-200 p-4">' +
                    '<div class="flex items-center justify-between mb-3">' +
                        '<h3 class="text-lg font-semibold text-gray-900 flex items-center">' +
                            '<svg class="w-6 h-6 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">' +
                                '<path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm0 2h12v10H4V5z"/>' +
                                '<path d="M6 7h2v2H6V7zM6 10h2v2H6v-2zM6 13h2v2H6v-2zM10 7h4v2h-4V7zM10 10h4v2h-4v-2zM10 13h4v2h-4v-2z"/>' +
                            '</svg>' +
                            'Excel Viewer' +
                        '</h3>' +
                        '<div class="flex items-center space-x-2">' +
                            '<button id="downloadExcelBtn" class="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700">Download</button>' +
                            '<button id="printExcelBtn" class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Print</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">' +
                        '<div class="flex items-start">' +
                            '<svg class="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                                '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>' +
                            '</svg>' +
                            '<div class="text-sm text-blue-800">' +
                                '<p class="font-medium">Viewing Excel data only</p>' +
                                '<p>Charts, images, and complex formatting are not displayed.</p>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="flex space-x-1 overflow-x-auto pb-2">' + tabsHTML + '</div>' +
                '</div>' +
                '<div class="excel-content" style="max-height: 70vh; overflow: auto;">' +
                    '<div id="sheetContent" class="p-4">' + this.renderSheet(this.currentSheetIndex) + '</div>' +
                '</div>' +
                '<div class="border-t border-gray-200 px-4 py-2 bg-gray-50 text-sm text-gray-600">' +
                    '<span>Sheet: ' + this.escapeHtml(sheetNames[this.currentSheetIndex]) + ' | Sheets: ' + sheetNames.length + '</span>' +
                '</div>' +
            '</div>';

        this.attachEventListeners(container, fileUrl);
    }

    renderSheet(sheetIndex) {
        const sheetName = this.currentWorkbook.SheetNames[sheetIndex];
        const worksheet = this.currentWorkbook.Sheets[sheetName];
        
        if (!worksheet || !worksheet['!ref']) {
            return '<div class="text-center py-8 text-gray-500"><p>This sheet appears to be empty</p></div>';
        }

        try {
            const htmlTable = XLSX.utils.sheet_to_html(worksheet, {
                table: true,
                header: 1,
                editable: false
            });

            // Create style element
            const styleElement = document.createElement('style');
            styleElement.textContent = 
                '.excel-table-container table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 13px; } ' +
                '.excel-table-container td, .excel-table-container th { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; vertical-align: top; word-wrap: break-word; max-width: 200px; } ' +
                '.excel-table-container th { background-color: #f8f9fa !important; font-weight: 600; color: #374151; } ' +
                '.excel-table-container tr:nth-child(even) { background-color: #f9fafb; }';
            
            // Add the style to head if not already there
            if (!document.getElementById('excel-viewer-styles')) {
                styleElement.id = 'excel-viewer-styles';
                document.head.appendChild(styleElement);
            }

            const styledTable = '<div class="excel-table-container">' + htmlTable + '</div>';
            return '<div class="overflow-auto">' + styledTable + '</div>';
            
        } catch (error) {
            console.error('Error rendering sheet:', error);
            return '<div class="text-center py-8 text-red-500">Error rendering sheet</div>';
        }
    }

    attachEventListeners(container, fileUrl) {
        const sheetTabs = container.querySelectorAll('.sheet-tab');
        for (let i = 0; i < sheetTabs.length; i++) {
            sheetTabs[i].addEventListener('click', (e) => {
                const sheetIndex = parseInt(e.target.dataset.sheetIndex);
                this.switchSheet(sheetIndex, container);
            });
        }

        const downloadBtn = container.querySelector('#downloadExcelBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                const link = document.createElement('a');
                link.href = fileUrl + '?download=true';
                link.download = '';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
        }

        const printBtn = container.querySelector('#printExcelBtn');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                window.print();
            });
        }
    }

    switchSheet(sheetIndex, container) {
        this.currentSheetIndex = sheetIndex;
        
        const tabs = container.querySelectorAll('.sheet-tab');
        for (let i = 0; i < tabs.length; i++) {
            if (i === sheetIndex) {
                tabs[i].className = 'sheet-tab px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors border-blue-500 text-blue-600 bg-blue-50';
            } else {
                tabs[i].className = 'sheet-tab px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors border-transparent text-gray-500 hover:text-gray-700';
            }
        }

        const contentDiv = container.querySelector('#sheetContent');
        contentDiv.innerHTML = this.renderSheet(sheetIndex);
        
        const footer = container.querySelector('.border-t');
        const sheetName = this.currentWorkbook.SheetNames[sheetIndex];
        footer.innerHTML = '<span>Sheet: ' + this.escapeHtml(sheetName) + ' | Sheets: ' + this.currentWorkbook.SheetNames.length + '</span>';
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    cleanup() {
        if (this.currentWorkbook) {
            this.currentWorkbook = null;
        }
        this.currentSheetIndex = 0;
    }
}

export { ExcelViewer };