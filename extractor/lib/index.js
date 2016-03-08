'use strict';
const fs = require('filendir');
const Git = require('nodegit');
const yargs = require('yargs');
const Promise = require('bluebird');
const identifyFixes = require('./identifyFixes');
const extract = require('./extract/all');
const prepare = require('./prepare');

const repoPath = yargs.argv._[0];
const outPath = yargs.argv._[1];

Promise.resolve(Git.Repository.open(repoPath))
.catch(console.error)
.tap(() => { console.log('Repo open'); console.time('Complete execution'); })

.then((repo) => { return repo.getMasterCommit() })
.tap((commit) => { console.log('Base Commit: ' + commit.id()); })

// Identify

.then(identifyFixes)
.tap((fixes) => { console.log(fixes.length + ' fix commits identified'); })

// Extract

.each((commit) => {
    let label = commit.id().toString();
    console.time(label);

    return extract(commit)
    // TODO: Extract startDate
    .then((info) => { delete info.commit; return info; })
    .tap((info) => fs.writeFile(outPath + '/raw/' + label, JSON.stringify(info, null, 4), () => {}))
    .tap(() => { console.timeEnd(label) })
    .tap(() => { console.log((process.memoryUsage().heapUsed/(1024 * 1024)).toFixed(2) + 'mb') });
}, {concurrency: 1})

// Report

.tap(() => { console.timeEnd('Complete execution'); });