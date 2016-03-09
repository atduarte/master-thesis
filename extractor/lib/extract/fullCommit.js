"use strict";
const Git = require('nodegit');
const log = require('npmlog-ts');
const cache = require('./cache');
const extractBaseInfo = require('./baseInfo');
const extractFileChanges = require('./fileChanges');

const logPrefix = 'extract/fullCommit';

module.exports = (commit) => {
    log.info(logPrefix, `Extracting ${commit.id()}`);

    const walker = Git.Revwalk.create(commit.owner());
    walker.push(commit.id());
    walker.sorting(Git.Revwalk.SORT.TOPOLOGICAL | Git.Revwalk.SORT.TIME);

    return Promise.props({
        info: extractBaseInfo(commit),
        parents: walker.getCommits(5000), // TODO: config
    })
    .then(data => {
        const info = data.info;

        log.verbose(logPrefix, `Will extract infos about ${Object.keys(info.components).length} components`);

        return Promise.map(Object.keys(info.components), componentPath => {
            return extractFileChanges(commit, data.parents, componentPath)
            .then(changes => info.components[componentPath].changes = changes);
        }, {concurrency: 25})
        .then(() => info)
    })
    .tap(() => log.info(logPrefix, `Finished ${commit.id()}`))
};
