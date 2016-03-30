'use strict';
const Git = require('nodegit');
const log = require('npmlog-ts');
const extractBaseInfo = require('./baseInfo');
const extractFileChanges = require('./fileChanges');

const logPrefix = 'extract/fullCommit';

module.exports = (projectConfig, commit) => {
    const walker = Git.Revwalk.create(commit.owner());

    log.info(logPrefix, `Extracting ${commit.id()}`);

    walker.push(commit.id());
    walker.sorting(Git.Revwalk.SORT.TOPOLOGICAL | Git.Revwalk.SORT.TIME);

    return extractBaseInfo(projectConfig, commit)
    .then(info => {
        // Filter
        return Promise.resolve(Object.keys(info.components))
        .tap(files => log.info(logPrefix, `Will extract infos about ${files.length} components`)).delay(1000)

        // Extract each
        .each(componentPath => {
            return extractFileChanges(projectConfig, commit, componentPath)
            .tap(changes => { info.components[componentPath].changes = changes; });
        }, {concurrency: 20})

        .then(() => info);
    })
    .tap(() => log.info(logPrefix, `Finished ${commit.id()}`));
};
