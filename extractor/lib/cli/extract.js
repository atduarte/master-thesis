'use strict';
const Git = require('nodegit');
const log = require('npmlog-ts');
const document = require('../extract/document');
const cache = require('../extract/cache');
const identifyFixes = require('../identifyFixes');
const extract = require('../extract/fullCommit');

const logPrefix = 'cli/extract';

module.exports = (repoPath, projectName) => {
    // Setup
    return cache.setup(projectName)
    .tap(() => document.setup(projectName))

    // Get repo and commit
    .then(() => Git.Repository.open(repoPath))
    .call('getMasterCommit')
    .tap(commit => log.verbose(logPrefix, `Base Commit: ${commit.id()}`))

    // Identify fixes
    .then(masterCommit => identifyFixes(masterCommit).then(fixes => [masterCommit].concat(fixes)))
    .tap(commits => log.info(logPrefix, `${commits.length - 1} fix commits found`))

    // Ignore the ones already completed
    .filter(commit => document.exists(projectName, commit).then(_ => !_))
    .tap(commits => log.info(logPrefix, `${commits.length} commits to analyze`))

    // Now do the thing!
    .each((commit) => {
        return extract(commit) // TODO: Add Start Date!
        .then(info => { delete info.commit; return info; })
        .tap(info => document.save(projectName, commit, info));
    }, {concurrency: 1})

    .tap(() => log.info(logPrefix, 'Extraction concluded'))
    .done();
};
