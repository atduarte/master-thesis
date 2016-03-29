'use strict';
const Git = require('nodegit');
const log = require('npmlog-ts');
const document = require('../document');
const cache = require('../extract/cache');
const identifyFixes = require('../identifyFixes');
const extract = require('../extract/fullCommit');
const getStartDate = require('../extract/startDate');

const logPrefix = 'extract/extract';

module.exports = (projectConfig, projectName, repoPath) => {
    let startDate = 0;

    log.info(logPrefix, 'Setting up');

    // Setup
    return cache.setup(projectName)
    .tap(() => document.setup(projectName))

    // Get repo and commit
    .then(() => Git.Repository.open(repoPath))
    .tap(repo => getStartDate(repo).then(date => startDate = date))
    .call('getMasterCommit')
    .tap(commit => log.verbose(logPrefix, `Base Commit: ${commit.id()}`))

    // Identify fixes
    .then(masterCommit => {
        return identifyFixes(projectConfig.fixRegex, masterCommit)
        .then(fixes => [masterCommit].concat(fixes)); // Also analyze current commit
    })
    .tap(commits => log.info(logPrefix, `${commits.length - 1} fix commits found`))

    // Ignore the ones already completed
    .filter(commit => document.raw.exists(projectName, commit).then(_ => !_))
    .tap(commits => log.info(logPrefix, `${commits.length} commits to analyze`))

    // Now do the thing!
    .each((commit) => {
        return extract(projectConfig, commit)
        .then(info => { delete info.commit; return info; })
        .then(info => Object.assign(info, {startDate}))
        .then(info => document.raw.save(projectName, commit, info));
    }, {concurrency: 1})

    .tap(() => log.info(logPrefix, 'Extraction concluded'))
    .done();
};
