'use strict';
const Promise = require('bluebird');
const isFix = require('./util/isFix');


/**
 * Identifies the commits that were fixes.
 * Walk starts with the given commit.
 *
 * @param regex
 * @param startCommit
 * @return {Promise}
 */
module.exports = (regex, startCommit) => {
    const walker = startCommit.history();
    const fixCommits = [];

    walker.on('commit', commit => {
        if (isFix(regex, commit)) fixCommits.push(commit);
    });

    // Do nothing, on error, just inform me
    walker.on('error', console.error);

    return new Promise(resolve => {
        walker.on('end', () => resolve(fixCommits));
        walker.start();
    });
};
