"use strict";
import Git from 'nodegit';
import Promise from 'bluebird';
import {fileChanges as config} from '../config.js';

export default (repo, commit, filename) => {
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
}
