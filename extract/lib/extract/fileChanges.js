'use strict';
const uniqid = require('uniqid');
const Git = require('nodegit');
const cache = require('./cache');
const isFix = require('../util/isFix');

const useCache = true;

const getDiffPatch = (commit, filename) => {
    return Promise.resolve(commit.getDiff())
    .map(diff => { return diff.patches(); })
    .reduce((p, c) => p.concat(c), [])
    .filter(patch => patch.newFile().path() == filename)
    .then(patches => patches[0] || null);
};

const compute = (projectConfig, commit, filename) => {
    const id = uniqid();
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
    // Fix Commit given (bug from nodegit)
    .map(commitInfo => {
        return Promise.resolve(repo.getCommit(commitInfo.commit))
        .then(commit => Object.assign(commitInfo, {commit}));
    }, {concurrency: 5})
    .map(commitInfo => {
        const commit = commitInfo.commit;

        // Blob + Diff
        return Promise.resolve(commitInfo.commit.getEntry(commitInfo.filename))
        .call('getBlob')
        .tap(blob => commitInfo.blobId = blob.id().toString())
        .catchReturn(undefined)
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
            const result = {
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

            if (blob && blob.free) blob.free();

            return result;
        })
        .then((result) => { return {result, info: commitInfo}; });
    }, {concurrency: 5})
    .tap(data => {
        if (!useCache) return;

        return cache.saveChanges(data.map(change => [
            id,
            change.info.commit,
            change.info.blobId,
            change.info.filename,
            change.result,
        ]));
    })

    .each(data => {
        data.info.commit.free();
    })

    .map(_ => _.result);
};

module.exports = (projectConfig, commit, parents, filename) => {
    const promise = useCache
        ? Promise.resolve(commit.getEntry(filename))
          .then(treeEntry => cache.getChangesData(commit, parents, treeEntry.sha(), filename), () => {})
        : Promise.resolve(undefined);

    return promise.then(data => {
        if (data) return data;
        return compute(projectConfig, commit, filename);
    });
};
