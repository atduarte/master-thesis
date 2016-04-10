'use strict';

module.exports = {
    fileFilter: (filename) => {
        filename = filename.toLowerCase();

        return filename.endsWith('.php')
            && filename.indexOf('doctrinemigrations') === -1
            && !filename.startsWith('app/');
    },
    emailNormalizer: (email) => {
        const emails = {
            'alvesventureoak@alvesventureoak.(none)': 'jalves@ventureoak.com',
            'jalves.mdl@gmail.com': 'jalves@ventureoak.com',
            'joaoalves89@alves-laptop.(none)': 'jalves@ventureoak.com',
            'joaoalvescosta@gmail.com': 'jcosta@ventureoak.com',
        };

        return emails[email] || email;
    },
};
