'use strict';

module.exports = {
    fileFilter: (filename) => {
        filename = filename.toLowerCase();

        return filename.endsWith('.java') // Is Java
            && !filename.startsWith('src/test'); // Aren't tests
    },
};
