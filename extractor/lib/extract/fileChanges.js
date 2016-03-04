"use strict";
const Git = require('nodegit');
const Promise = require('bluebird');
const config = require('../../config.js').fileChanges;

module.exports = (repo, commit, filename) => {
    let walker = Git.Revwalk.create(repo);
    walker.push(commit);
    walker.sorting(Git.Revwalk.SORT.TIME);

    return Promise.resolve(walker.fileHistoryWalk(filename, config.maxWalk))
    .then((commits) => {
        return commits.slice(0, config.maxChanges);
    })
    .map((commitInfo) => {
        const commit = commitInfo.commit;

        return {
            id: commit.id().toString(),
            date: commit.time(),
            author: commit.author().email(),
            parentCount: commit.parentcount(),
        }
    });
};
