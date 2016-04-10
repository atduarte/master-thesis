'use strict';

const fs = Promise.promisifyAll(require('fs'));
const log = require('npmlog-ts');
const path = require('path');
const Git = require('nodegit');
const document = require('../document');
const createCSV = require('./create');
const _ = require('lodash');

const logPrefix = 'prepareCSV/prepare';

function createStream(projectName, commit, name) {
    const path = `out/${projectName}/results/${commit.id().toString()}/${name}.csv`;

    return Promise.promisifyAll(fs.createWriteStream(path, { defaultEncoding: 'utf8' }));
}

function getColumns(jsonFilenames) {
    let columns = [];

    return Promise.each(jsonFilenames, (filename) => {
        return fs.readFileAsync(path.join(process.cwd(), filename), 'utf-8')
        .then(JSON.parse)
        .each(data => {
            columns = columns.concat(_.difference(Object.keys(data), columns));
        }, {concurrency: 50});
    }, {concurrency: 10})
    .then(() => columns.sort());
}

module.exports = (projectConfig, projectName, repoPath) => {
    const csv = {};

    log.info(logPrefix, 'CSV Preparation started');

    return Promise.resolve(Git.Repository.open(repoPath))
    .call('getHeadCommit')
    .tap(commit => log.info(logPrefix, `Head Commit: ${commit.id()}`))

    // Create Folders
    .tap(masterCommit => document.setup(projectName, masterCommit))

    // Create CSVs
    .tap(masterCommit => {
          csv.master = createStream(projectName, masterCommit, 'master');
          csv.history = createStream(projectName, masterCommit, 'history');
    })

    // Get the files

    .then(masterCommit => {
        let oids = [];
        const walker = Git.Revwalk.create(masterCommit.owner());
        const walk = () => {
            return walker.next()
            .then(oid => oid.toString())
            .then(oid => Promise.props({
                oid,
                exists: document.json.exists(projectName, oid),
            }))
            .then(data => { if (data.exists) oids.push(data.oid); })
            .then(walk)
            .catch(error => { if (error.errno !== Git.Error.CODE.ITEROVER) throw error; });
        };

        walker.push(masterCommit);

        return walk().then(() => oids);
    })
    .map(oid => document.json.path(projectName) + oid)
    .tap(files => log.info(logPrefix, `Got ${files.length} files`))

    // Get the columns

    .then(files => Promise.props({
        files: files,
        columns: getColumns(files),
    }))
    .tap(data => log.info(logPrefix, `Got ${data.columns.length} columns`))

    // Write Columns
    .tap(data => Object.keys(csv).forEach(name => {
        csv[name].writeAsync(`${data.columns.join(',')}\n`)
    }))

    // Write Rows

    .then(data => Promise.each(data.files, (filename, i) => {
        return fs.readFileAsync(path.join(process.cwd(), filename), 'utf-8')

        .then(JSON.parse)
        .map(jsonRow => createCSV(data.columns, jsonRow))
        .then(rows => rows.concat('').join('\n'))

        .tap(rows => (i === 0 ? csv.master : csv.history).writeAsync(rows))

        .tap(() => {
            if (i % 10 === 0) log.info(logPrefix, `Wrote ${i} rows`);
        });
    }, { concurrency: 3 }))

    .tap(() => log.info(logPrefix, 'CSV Preparation finished'));
};
