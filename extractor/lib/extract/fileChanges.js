'use strict';
const Git = require('nodegit');
const Promise = require('bluebird');
const config = require('../../config.js').fileChanges;

const getDiff = (commit, filename) => {
    return Promise.resolve(commit.getDiff(() => {}))
    .map(diff => {  return diff.getPatches() })
    .catch(() => console.log(commit.id(), arguments))
    .then(patches => {
        console.log(patches);
        process.exit(0);
    })
};

module.exports = (repo, commit, filename) => {
    let walker = Git.Revwalk.create(repo);
    walker.push(commit);
    walker.sorting(Git.Revwalk.SORT.TIME);

    return Promise.resolve(walker.fileHistoryWalk(filename, config.maxWalk))
    //.then(commits => commits.slice(0, config.maxChanges))
    .mapSeries(commitInfo => {
        commitInfo.filename = filename;
        filename = commitInfo.oldName || filename;
        return commitInfo;
    })
    .map(commitInfo => {
        return {
            id: commit.id().toString(),
            date: commit.time(),
            author: commit.author().email(),
            parentCount: commit.parentcount(),
            //lines: blob ? blob.toString('utf8').split(/\r\n|[\n\r\u0085\u2028\u2029]/g).length - 1 : 0,
            //byteSize: blob ? blob.rawsize() : 0,
            //blob: blob ? blob.content() : "",
        }
        //return Promise.resolve(repo.getCommit(commitInfo.commit)) // getEntry fails sometimes with ...
        //.then(commit => commit.getEntry(commitInfo.filename, () => {}))
        //.then(treeEntry => treeEntry.getBlob(), () => {})
        //return  Promise.resolve(repo.getCommit(commitInfo.commit))
        //.then(commit => getDiff(commit, commitInfo.filename))
        //.then(blob => {
        //    const commit = commitInfo.commit;
        //    return {
        //        id: commit.id().toString(),
        //        date: commit.time(),
        //        author: commit.author().email(),
        //        parentCount: commit.parentcount(),
        //        lines: blob ? blob.toString('utf8').split(/\r\n|[\n\r\u0085\u2028\u2029]/g).length - 1 : 0,
        //        byteSize: blob ? blob.rawsize() : 0,
        //        //blob: blob ? blob.content() : "",
        //    }
        //})
    })
};
