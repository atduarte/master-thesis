'use strict';
const Promise = require('bluebird');
const Git = require('nodegit');
const isFix = require('./util/isFix');


/**
 * Identifies the commits that were fixes.
 * Walk starts with the given commit.
 *
 * @param regex
 * @param startCommit
 * @return {Promise}
 */
module.exports = (regex, startCommit) => new Promise(resolve => {
    const walker = Git.Revwalk.create(startCommit.owner());
    const fixCommits = [];

    walker.sorting(Git.Revwalk.SORT.TIME);

    walker.walk(startCommit, (err, commit) => {
        if (err || !commit) return resolve(fixCommits);
        if (isFix(regex, commit)) fixCommits.push(commit);
    });
});
