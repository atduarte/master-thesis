'use strict';
const log = require('npmlog-ts');
const uniqid = require('uniqid');
const Git = require('nodegit');
const cache = require('./cache');
const config = require('../../config.js').fileChanges;

const logPrefix = 'extract/fileChanges';
const useCache = true;

const getDiff = (commit, filename) => {
    return Promise.resolve(commit.getDiff())
    .map(diff => { return diff.patches() })
    .reduce((p, c) => p.concat(c), [])
    .filter(patch => patch.newFile().path() == filename)
    .then(patches => patches[0] || null)
};

const compute = (commit, filename) => {
    const id = uniqid();
    const repo = commit.owner();
    const walker = Git.Revwalk.create(repo);
    //const blobs = [];

    walker.push(commit);
    walker.sorting(Git.Revwalk.SORT.TOPOLOGICAL | Git.Revwalk.SORT.TIME);

    return Promise.resolve(walker.fileHistoryWalk(filename, config.maxWalk))
    .then(commitsInfo => [{commit}].concat(commitsInfo))
    .mapSeries(commitInfo => {
        commitInfo.filename = filename;
        filename = commitInfo.oldName || filename;
        return commitInfo;
    })
    // Get BlobId
    .map(commitInfo => {
        return Promise.resolve(repo.getCommit(commitInfo.commit)) // getEntry fails sometimes with ...
        .then(commit => commit.getEntry(commitInfo.filename))
        .then(treeEntry => commitInfo.blobId = treeEntry.sha(), () => {})
        .then(() => commitInfo)
    })
    // TODO: Yes or no?
    // Remove duplicated blobs
    //.reduce((all, current) => {
    //    if (current.blobId && blobs.indexOf(current.blobId) == -1) {
    //        blobs.push(current.blobId);
    //        all.push(current);
    //    }
    //    return all;
    //},  [])
    .map(commitInfo => {
        const commit = commitInfo.commit;

        // TODO: Remove repeated repo.getCommit()
        return Promise.resolve(repo.getCommit(commit))
        .then(commit => getDiff(commit, commitInfo.filename))
        .then(diff => {
            // Diff can be unexistent, since we add the base commit
            return {
                id: commit.id().toString(),
                date: commit.time(),
                author: commit.author().email(),
                parentCount: commit.parentcount(),
                filename: commitInfo.filename,
                // TODO: This + Changes
                //lines: blob ? blob.toString('utf8').split(/\r\n|[\n\r\u0085\u2028\u2029]/g).length - 1 : 0,
                //byteSize: blob ? blob.rawsize() : 0,
                //blob: blob ? blob.content() : "",
            }
        })
        .then((result) => { return {result, info: commitInfo} });
    })
    .tap(data => {
        if (!useCache) return;
        return cache.saveChanges(data.map(_ => [id, _.info.commit, _.info.blobId, _.result]));
    })
    .then(data => { data.shift(); return data.map(_ => _.result); })
};

module.exports = (commit, parents, filename) => {
    const promise = useCache
        ? Promise.resolve(commit.getEntry(filename))
          .then(treeEntry => cache.getChangesData(commit, parents, treeEntry.sha()), () => {})
        : Promise.resolve(undefined);

    return promise.then(data => {
        if (data) return data;
        return compute(commit, filename);
    });
};
