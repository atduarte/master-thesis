'use strict';
const uniqid = require('uniqid');
const Git = require('nodegit');
const cache = require('./cache');
const config = require('../../config.js').fileChanges;
const isFix = require('../util/isFix');

const useCache = true;

const getDiffPatch = (commit, filename) => {
    return Promise.resolve(commit.getDiff())
    .map(diff => { return diff.patches(); })
    .reduce((p, c) => p.concat(c), [])
    .filter(patch => patch.newFile().path() == filename)
    .then(patches => patches[0] || null);
};

const compute = (commit, filename) => {
    process.stdin.write('0');
    const id = uniqid();
    const repo = commit.owner();
    const walker = Git.Revwalk.create(repo);

    walker.push(commit);
    walker.sorting(Git.Revwalk.SORT.TOPOLOGICAL | Git.Revwalk.SORT.TIME);

    return Promise.resolve(walker.fileHistoryWalk(filename, config.maxWalk))
    .mapSeries(commitInfo => {
        commitInfo.filename = filename;
        filename = commitInfo.oldName || filename;
        return commitInfo;
    })
    // Fix Commit given (bug from nodegit)
    .map(commitInfo => {
        return Promise.resolve(repo.getCommit(commitInfo.commit))
        .then(commit => Object.assign(commitInfo, {commit}));
    })
    // Get Blob
    .map(commitInfo => {
        return Promise.resolve(commitInfo.commit.getEntry(commitInfo.filename))
        .call('getBlob')
        .then(blob => Object.assign(commitInfo, {blob}))
        .catchReturn(commitInfo);
    })
    .map(commitInfo => {
        const commit = commitInfo.commit;
        const blob = commitInfo.blob;

        return getDiffPatch(commit, commitInfo.filename)
        .then(diffPatch => {
            return {
                id: commit.id().toString(),
                date: commit.time(),
                author: commit.author().email(),
                parentCount: commit.parentcount(),
                isFix: isFix(commit),
                filename: commitInfo.filename,
                lines: blob ? blob.toString('utf8').split(/\r\n|[\n\r\u0085\u2028\u2029]/g).length - 1 : 0,
                byteSize: blob ? blob.rawsize() : 0,
                linesAdded: diffPatch ? diffPatch.lineStats().total_additions : 0,
                linesRemoved: diffPatch ? diffPatch.lineStats().total_deletions : 0,
            };
        })
        .then((result) => { return {result, info: commitInfo}; });
    })
    .tap(data => {
        if (!useCache) return;

        cache.saveChanges(data.map(_ => [
            id,
            _.info.commit,
            _.info.blob ? _.info.blob.id().toString() : undefined,
            _.info.filename,
            _.result,
        ]));
    })
    .map(_ => _.result);
};

module.exports = (commit, parents, filename) => {
    const promise = useCache
        ? Promise.resolve(commit.getEntry(filename))
          .then(treeEntry => cache.getChangesData(commit, parents, treeEntry.sha(), filename), () => {})
        : Promise.resolve(undefined);

    return promise.then(data => {
        if (data) return data;
        return compute(commit, filename);
    });
};
