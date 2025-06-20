// routes/phoneDirectoryRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const { errorLogger, errorHandler } = require('../middleware/errorMiddleware');
const phoneDirectoryController = require('../controllers/phoneDirectoryController');

// Configure multer for Excel file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
            file.mimetype === 'application/vnd.ms-excel') {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files are allowed!'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Apply error logger middleware
router.use(errorLogger);

// GET routes
router.get('/', auth, phoneDirectoryController.getAllEntries);
router.get('/:directoryId', auth, phoneDirectoryController.getEntry);

// POST routes
router.post('/', auth, async (req, res, next) => {
    try {
        await phoneDirectoryController.createEntry(req, res);
    } catch (error) {
        next(error);
    }
});

// Import/Export routes
// router.post('/import', auth, upload.single('file'), async (req, res, next) => {
//     try {
//         await phoneDirectoryController.importFromExcel(req, res);
//     } catch (error) {
//         if (error.message === 'Only Excel files are allowed!') {
//             res.status(400).json({
//                 success: false,
//                 message: error.message
//             });
//         } else {
//             next(error);
//         }
//     }
// });

// router.get('/export/excel', auth, async (req, res, next) => {
//     try {
//         await phoneDirectoryController.exportToExcel(req, res);
//     } catch (error) {
//         next(error);
//     }
// });

// PUT routes
router.put('/:directoryId', auth, async (req, res, next) => {
    try {
        await phoneDirectoryController.updateEntry(req, res);
    } catch (error) {
        next(error);
    }
});

// DELETE routes
router.delete('/:directoryId', auth, async (req, res, next) => {
    try {
        await phoneDirectoryController.deleteEntry(req, res);
    } catch (error) {
        next(error);
    }
});

// Error handling middleware
router.use(errorHandler);

module.exports = router;