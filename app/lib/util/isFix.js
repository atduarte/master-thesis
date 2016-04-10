'use strict';

module.exports = (regex, commit) => {
    // Merge is not a fix
    if (commit.parentcount() > 1) return false;

    const message = commit.message().trim().split('\n', 1)[0];

    return regex.test(message);
};
