'use strict';

module.exports = {
    fixRegex: new RegExp('(\b|)fix(|\b|ed|ing)|bug( | \#|\-|)[0-9]+', 'i'),
    fileFilter: () => true,
    emailNormalizer: (email) => email,
};
