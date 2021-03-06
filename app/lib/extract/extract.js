'use strict';
const Git = require('nodegit');
const log = require('npmlog-ts');
const document = require('../document');
const cache = require('../extract/cache');
const identifyFixes = require('../identifyFixes');
const extract = require('../extract/fullCommit');
const getStartDate = require('../extract/startDate');
const _ = require('lodash');

const logPrefix = 'extract/extract';

module.exports = (projectConfig, projectName, repoPath) => {
    let startDate = 0;
    let done = [];

    log.info(logPrefix, 'Raw Extraction started');

    // Setup
    return cache.setup(projectName)
    .tap(() => document.setup(projectName))

    // Get repo and commit
    .then(() => Git.Repository.open(repoPath))
    .tap(repo => getStartDate(repo).then(date => startDate = date))
    .call('getHeadCommit')
    .tap(commit => log.verbose(logPrefix, `Head Commit: ${commit.id()}`))

    // Identify fixes
    .then(masterCommit => {
        return identifyFixes(projectConfig.fixRegex, masterCommit)
        .then(fixes => [masterCommit].concat(fixes)); // Also analyze current commit
    })
    .tap(commits => log.info(logPrefix, `${commits.length - 1} fix commits found`))

    // Get the ones already completed
    .tap(() => document.raw.getAll(projectName).then(_ => done = _))

    // Now do the thing!
    .each((commit, i) => {
        if (done.indexOf(commit.id().toString()) !== -1) return;

        return extract(projectConfig, commit, i)
        .then(info => {
            if (!info) return;

            delete info.commit;
            info = Object.assign(info, {startDate});
            return document.raw.save(projectName, commit, info);
        });
    }, {concurrency: 1})

    .tap(() => log.verbose(logPrefix, 'Raw Extraction concluded'));
};
