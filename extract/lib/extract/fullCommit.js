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

    return Promise.props({
        info: extractBaseInfo(commit),
        parents: walker.getCommits(Math.pow(10, 9)),
    })
    .then(data => {
        const info = data.info;

        log.verbose(logPrefix, `Will extract infos about ${Object.keys(info.components).length} components`);

        // Filter
        return Promise.resolve(Object.keys(info.components))
        .filter(projectConfig.fileFilter)

        // Extract each
        .each(componentPath => {
            return extractFileChanges(projectConfig, commit, data.parents, componentPath)
            .tap(changes => { info.components[componentPath].changes = changes; });
        }, {concurrency: 4})

        .then(() => info);
    })
    .tap(() => log.info(logPrefix, `Finished ${commit.id()}`));
};
