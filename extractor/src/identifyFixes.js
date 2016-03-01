"use strict";
import Promise from 'bluebird';

const regex = new RegExp('(\b|)fix(|\b|ed|ing)|bug( | \#|\-|)[0-9]+', 'i');
const isFix = (commit) => {
    // Merge is not a fix
    if (commit.parentcount() > 1) return false;

    const message = commit.message().trim().split('\n', 1)[0];
    return regex.test(message);
};

/**
 * Identifies the commits that were fixes.
 * Walk starts with the given commit.
 *
 * @param startCommit
 * @return {Promise}
 */
export default (startCommit) => {
    let walker = startCommit.history();
    let fixCommits = [];

    walker.on('commit', (commit) => {
        if (isFix(commit)) fixCommits.push(commit);
    });

    // Do nothing, on error, just inform me
    walker.on('error', console.error);

    return new Promise((resolve) => {
        walker.on('end', () => { resolve(fixCommits); });
        walker.start();
    });
}