'use strict';

module.exports = {
    fileFilter: (filename) => {
        filename = filename.toLowerCase();

        return filename.endsWith('.php'); // Is Java
    },
};
