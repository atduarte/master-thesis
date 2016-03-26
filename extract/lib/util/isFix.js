'use strict';

const regex = new RegExp('(\b|)fix(|\b|ed|ing)|bug( | \#|\-|)[0-9]+', 'i');

module.exports = (commit) => {
    // Merge is not a fix
    if (commit.parentcount() > 1) return false;

    const message = commit.message().trim().split('\n', 1)[0];

    return regex.test(message);
};
