'use strict';
const Promise = require('bluebird');
const isFix = require('./util/isFix');


/**
 * Identifies the commits that were fixes.
 * Walk starts with the given commit.
 *
 * @param startCommit
 * @return {Promise}
 */
module.exports = (startCommit) => {
    const walker = startCommit.history();
    const fixCommits = [];

    walker.on('commit', commit => {
        if (isFix(commit)) fixCommits.push(commit);
    });

    // Do nothing, on error, just inform me
    walker.on('error', console.error);

    return new Promise(resolve => {
        walker.on('end', () => resolve(fixCommits));
        walker.start();
    });
};
