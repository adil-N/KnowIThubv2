// middleware/filePreview.js
const path = require('path');
const fs = require('fs').promises;
const mime = require('mime-types');

const filePreview = {
    fileTypeCache: new Map(),

    mimeTypeMap: {
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'txt': 'text/plain',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    },

    getFileType(filename) {
        if (this.fileTypeCache.has(filename)) {
            return this.fileTypeCache.get(filename);
        }

        const ext = filename.split('.').pop().toLowerCase();
        const mimeType = this.mimeTypeMap[ext] || mime.lookup(filename) || 'application/octet-stream';
        this.fileTypeCache.set(filename, mimeType);
        return mimeType;
    },

    setupPreviewRoutes(app) {
        // Preview metadata endpoint
        app.get('/api/preview/:filename', async (req, res) => {
            try {
                const filename = req.params.filename;
                // Updated path to include 'files' subdirectory
                const uploadsDir = path.join(process.cwd(), 'uploads', 'files');
                const filePath = path.join(uploadsDir, filename);
                
                console.log('Attempting to access file:', {
                    filename,
                    filePath,
                    uploadsDir
                });

                const exists = await fs.access(filePath)
                    .then(() => true)
                    .catch(() => false);

                if (!exists) {
                    console.log('File not found:', filePath);
                    return res.status(404).json({
                        success: false,
                        message: 'File not found'
                    });
                }

                const mimeType = this.getFileType(filename);
                const stats = await fs.stat(filePath);

                res.json({
                    success: true,
                    data: {
                        filename,
                        type: mimeType,
                        size: stats.size,
                        previewUrl: `/uploads/files/${filename}`,
                        downloadUrl: `/uploads/files/${filename}?download=true`
                    }
                });
            } catch (error) {
                console.error('Preview error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Error generating preview'
                });
            }
        });

        // Serve files with proper headers
        app.get('/uploads/files/:filename', async (req, res) => {
            try {
                const filename = req.params.filename;
                const uploadsDir = path.join(process.cwd(), 'uploads', 'files');
                const filePath = path.join(uploadsDir, filename);

                console.log('Serving file:', {
                    filename,
                    filePath,
                    uploadsDir
                });

                const exists = await fs.access(filePath)
                    .then(() => true)
                    .catch(() => false);

                if (!exists) {
                    console.log('File not found:', filePath);
                    return res.status(404).send('File not found');
                }

                const mimeType = this.getFileType(filename);

                // Set appropriate headers
                res.set({
                    'Content-Type': mimeType,
                    'Cache-Control': 'public, max-age=3600',
                    'X-Content-Type-Options': 'nosniff'
                });

                // Determine if this is a preview or download request based on query param
                const isDownload = req.query.download === 'true';
                if (isDownload) {
                    res.set('Content-Disposition', `attachment; filename="${filename}"`);
                } else {
                    res.set('Content-Disposition', `inline; filename="${filename}"`);
                }

                // Stream the file
                res.sendFile(filePath);
            } catch (error) {
                console.error('File serving error:', error);
                res.status(500).send('Error serving file');
            }
        });
    }
};

module.exports = filePreview;