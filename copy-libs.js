const fs = require('fs-extra'); 
const path = require('path');

const libraries = {
    'chart.js': 'dist/Chart.min.js',
    'lodash': 'lodash.js',
    'tinymce': 'tinymce',
    'xlsx': 'dist/xlsx.full.min.js',
    'prismjs': 'prism.js',
    'sortablejs': 'Sortable.min.js',
    'material-icons': 'iconfont/material-icons.css'
};

const destinationPath = path.join(__dirname, 'frontend', 'lib');

async function copyLibraries() {
    try {
        await fs.ensureDir(destinationPath); 

        for (const [lib, srcPath] of Object.entries(libraries)) {
            const src = path.join(__dirname, 'node_modules', lib, srcPath);
            const dest = path.join(destinationPath, path.basename(srcPath));

            try {
                // If it's a directory, copy recursively
                if (fs.lstatSync(src).isDirectory()) {
                    await fs.copy(src, path.join(destinationPath, lib));
                } else {
                    await fs.copy(src, dest);
                }
            } catch (copyError) {
                console.warn(`Warning: Could not copy ${src}. Error: ${copyError.message}`);
            }
        }

        console.log('Libraries copied successfully!');
    } catch (err) {
        console.error('Error copying libraries:', err);
    }
}

copyLibraries();
