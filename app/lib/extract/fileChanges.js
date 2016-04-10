'use strict';
const Git = require('nodegit');
const cache = require('./cache');
const isFix = require('../util/isFix');

const useCache = true; // TODO

const getDiffPatch = (commit, filename) => {
    return Promise.resolve(commit.getDiff())
    .map(diff => { return diff.patches(); })
    .reduce((p, c) => p.concat(c), [])
    .filter(patch => patch.newFile().path() == filename)
    .then(patches => patches[0] || null);
};

module.exports = (projectConfig, commit, filename) => {
    const repo = commit.owner();
    const walker = Git.Revwalk.create(repo);

    walker.push(commit);
    walker.sorting(Git.Revwalk.SORT.TOPOLOGICAL | Git.Revwalk.SORT.TIME);

    return Promise.resolve(walker.fileHistoryWalk(filename, Math.pow(10, 6)))
    .mapSeries(commitInfo => {
        commitInfo.filename = filename;
        filename = commitInfo.oldName || filename;
        return commitInfo;
    })

    .map(commitInfo => {
        // Blob + Diff
        return cache.getChangeData(commitInfo.commit, commitInfo.filename)
        .then(data => {
            if (data) {
                return data;
            }

            // No cache...

            let commit;

            // Blob
            return Promise.resolve(repo.getCommit(commitInfo.commit))
            .tap(_ => commit = _)
            .then(commit => commit.getEntry(commitInfo.filename))
            .call('getBlob')
            .catchReturn(undefined)

            // Diff (+ Blob)
            .then(blob => {
                return Promise.props({
                    blob,
                    diff: getDiffPatch(commit, commitInfo.filename),
                });
            })

            // Crunch it
            .then(data => {
                const blob = data.blob;
                const diff = data.diff;

                return {
                    id: commit.id().toString(),
                    date: commit.time(),
                    author: commit.author().email(),
                    parentCount: commit.parentcount(),
                    isFix: isFix(projectConfig.fixRegex, commit),
                    filename: commitInfo.filename,
                    lines: blob ? blob.toString('utf8').split(/\r\n|[\n\r\u0085\u2028\u2029]/g).length - 1 : 0,
                    byteSize: blob ? blob.rawsize() : 0,
                    linesAdded: diff ? diff.lineStats().total_additions : 0,
                    linesRemoved: diff ? diff.lineStats().total_deletions : 0,
                };
            })

            // Save it
            .tap(result => cache.saveChange(commitInfo.commit, commitInfo.filename, result));
        });
    }, {concurrency: 20});
};
