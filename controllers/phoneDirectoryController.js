// controllers/phoneDirectoryController.js
const PhoneDirectory = require('../models/PhoneDirectory');
// const ExcelJS = require('exceljs');

const phoneDirectoryController = {
    // Get all entries with pagination and filtering
    async getAllEntries(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const search = req.query.search || '';
            const category = req.query.category;
            let query = {};

            // Add search functionality
            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { 'phoneNumbers.number': { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ];
            }
            
            // ✅ Add department filter (EXACT match)
            if (req.query.department) {
                query.department = req.query.department;
            }
            
            // ✅ Add category filter
            if (category) {
                query.category = category;
            }
            
            console.log("Applied Filters:", query); // Debugging
            

            const [entries, total] = await Promise.all([
                PhoneDirectory.find(query)
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .sort({ name: 1 })
                    .populate('author', 'firstName lastName')
                    .populate('lastModifiedBy', 'firstName lastName'),
                PhoneDirectory.countDocuments(query)
            ]);

            res.json({
                success: true,
                data: entries,
                pagination: {
                    total,
                    page,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            console.error('Error in getAllEntries:', error);
            res.status(500).json({
                success: false,
                message: 'Error retrieving phone directory entries',
                error: error.message
            });
        }
    },

    // Get single entry
    // In phoneDirectoryController.js, update the getEntry method:
async getEntry(req, res) {
    try {
        const entry = await PhoneDirectory.findOne({ directoryId: req.params.directoryId })
            .populate('author', 'firstName lastName')
            .populate('lastModifiedBy', 'firstName lastName');

        if (!entry) {
            return res.status(404).json({
                success: false,
                message: 'Phone directory entry not found'
            });
        }

        res.json({
            success: true,
            data: entry
        });
    } catch (error) {
        console.error('Error in getEntry:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving phone directory entry',
            error: error.message
        });
    }
},

    // Create new entry
    async createEntry(req, res) {
        try {
            const {
                name,
                department,
                position,
                phoneNumbers,
                email,
                category,
                notes
            } = req.body;

            const entry = new PhoneDirectory({
                name,
                department,
                position,
                phoneNumbers: phoneNumbers.map(phone => ({
                    type: phone.type || 'office',
                    number: phone.number,
                    extension: phone.extension
                })),
                email,
                category: category || 'Internal',
                notes,
                author: req.user._id
            });

            await entry.save();

            res.status(201).json({
                success: true,
                data: entry,
                message: 'Phone directory entry created successfully'
            });
        } catch (error) {
            console.error('Error in createEntry:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating phone directory entry',
                error: error.message
            });
        }
    },


// Also update the getEntry method to use directoryId
async getEntry(req, res) {
    try {
        const entry = await PhoneDirectory.findOne({ directoryId: req.params.directoryId })
            .populate('author', 'firstName lastName')
            .populate('lastModifiedBy', 'firstName lastName');

        if (!entry) {
            return res.status(404).json({
                success: false,
                message: 'Phone directory entry not found'
            });
        }

        res.json({
            success: true,
            data: entry
        });
    } catch (error) {
        console.error('Error in getEntry:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving phone directory entry',
            error: error.message
        });
    }
},

    // Delete entry
    async deleteEntry(req, res) {
        try {
            const entry = await PhoneDirectory.findOneAndDelete({ directoryId: req.params.directoryId });
    
            if (!entry) {
                return res.status(404).json({
                    success: false,
                    message: 'Phone directory entry not found'
                });
            }
    
            res.json({
                success: true,
                message: 'Phone directory entry deleted successfully'
            });
        } catch (error) {
            console.error('Error in deleteEntry:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting phone directory entry',
                error: error.message
            });
        }
    },
    
    async updateEntry(req, res) {
        try {
            const updateData = {
                ...req.body,
                lastModifiedBy: req.user._id
            };
    
            if (updateData.phoneNumbers) {
                updateData.phoneNumbers = updateData.phoneNumbers.map(phone => ({
                    type: phone.type || 'office',
                    number: phone.number,
                    extension: phone.extension
                }));
            }
    
            const entry = await PhoneDirectory.findOneAndUpdate(
                { directoryId: req.params.directoryId },
                updateData,  // Remove $set, use direct update
                { 
                    new: true, 
                    runValidators: true,
                    strict: 'throw'  // Enforce schema validation
                }
            );
    
            if (!entry) {
                return res.status(404).json({
                    success: false,
                    message: 'Phone directory entry not found'
                });
            }
    
            res.json({
                success: true,
                data: entry,
                message: 'Phone directory entry updated successfully'
            });
        } catch (error) {
            console.error('Error in updateEntry:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating phone directory entry',
                error: error.message
            });
        }
    },
    // Import from Excel
    async importFromExcel(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(req.file.buffer);

            const worksheet = workbook.worksheets[0];
            const results = {
                succeeded: 0,
                failed: 0,
                errors: []
            };

            const rows = worksheet.getRows(2, worksheet.rowCount - 1);
            
            for (const row of rows) {
                try {
                    const phoneNumbers = [{
                        type: 'office',
                        number: row.getCell('Phone').value,
                        extension: row.getCell('Extension')?.value || ''
                    }];

                    if (row.getCell('Mobile')?.value) {
                        phoneNumbers.push({
                            type: 'mobile',
                            number: row.getCell('Mobile').value
                        });
                    }

                    await PhoneDirectory.create({
                        name: row.getCell('Name').value,
                        department: row.getCell('Department').value,
                        position: row.getCell('Position').value,
                        phoneNumbers,
                        email: row.getCell('Email').value,
                        category: row.getCell('Category').value || 'Internal',
                        notes: row.getCell('Notes')?.value || '',
                        author: req.user._id
                    });

                    results.succeeded++;
                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        row: row.number,
                        error: error.message
                    });
                }
            }

            res.json({
                success: true,
                message: 'Import completed',
                results
            });
        } catch (error) {
            console.error('Error in importFromExcel:', error);
            res.status(500).json({
                success: false,
                message: 'Error importing from Excel',
                error: error.message
            });
        }
    },

    // Export to Excel
    async exportToExcel(req, res) {
        try {
            const entries = await PhoneDirectory.find()
                .sort({ name: 1 })
                .populate('author', 'firstName lastName')
                .lean();

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Phone Directory');

            // Define columns
            worksheet.columns = [
                { header: 'Directory ID', key: 'directoryId', width: 12 },
                { header: 'Name', key: 'name', width: 20 },
                { header: 'Department', key: 'department', width: 15 },
                { header: 'Position', key: 'position', width: 15 },
                { header: 'Office Phone', key: 'officePhone', width: 15 },
                { header: 'Extension', key: 'extension', width: 10 },
                { header: 'Mobile', key: 'mobile', width: 15 },
                { header: 'Email', key: 'email', width: 25 },
                { header: 'Category', key: 'category', width: 12 },
                { header: 'Notes', key: 'notes', width: 30 }
            ];

            // Style the header row
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };

            // Add data rows
            entries.forEach(entry => {
                const officePhone = entry.phoneNumbers.find(p => p.type === 'office');
                const mobilePhone = entry.phoneNumbers.find(p => p.type === 'mobile');
                
                worksheet.addRow({
                    directoryId: entry.directoryId,
                    name: entry.name,
                    department: entry.department,
                    position: entry.position,
                    officePhone: officePhone?.number || '',
                    extension: officePhone?.extension || '',
                    mobile: mobilePhone?.number || '',
                    email: entry.email,
                    category: entry.category,
                    notes: entry.notes
                });
            });

            // Auto-filter
            worksheet.autoFilter = {
                from: 'A1',
                to: 'J1'
            };

            // Generate buffer
            const buffer = await workbook.xlsx.writeBuffer();

            // Set headers for file download
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=phone_directory.xlsx');
            
            res.send(buffer);
        } catch (error) {
            console.error('Error in exportToExcel:', error);
            res.status(500).json({
                success: false,
                message: 'Error exporting to Excel',
                error: error.message
            });
        }
    }
};

module.exports = phoneDirectoryController;