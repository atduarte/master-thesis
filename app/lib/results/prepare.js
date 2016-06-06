'use strict';

const fs = Promise.promisifyAll(require('fs'));
const log = require('npmlog-ts');
const path = require('path');
const Git = require('nodegit');
const document = require('../document');
const createCSV = require('./create');
const _ = require('lodash');
const spawn = require('spawn-promise');
const isFix = require('../util/isFix');

const logPrefix = 'results/prepare';

function createStream(projectName, commit, name) {
    const path = csvPath(projectName, commit, name);
    const stream = Promise.promisifyAll(fs.createWriteStream(path, { defaultEncoding: 'utf8' }));

    stream.path = path;
    return stream;
}

const csvPath = (projectName, commit, name) => `out/${projectName}/results/${commit.id().toString()}/${name}.csv`;

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

module.exports = (projectConfig, projectName, repoPath, classificationLabel, estimators) => {
    const csv = {};
    const uid = 'model-' + Math.ceil(Math.random()*100000);
    let masterCommit = null;

    log.info(logPrefix, 'CSV Preparation started');

    return Promise.resolve(Git.Repository.open(repoPath))
    .call('getHeadCommit')
    .tap(commit => log.verbose(logPrefix, `Head Commit: ${commit.id()}`))
    .then(commit => masterCommit = commit)

    // Create Folders
    .tap(masterCommit => document.setup(projectName, masterCommit))

    // Create CSVs
    .tap(masterCommit => {
          csv.master = createStream(projectName, masterCommit, 'master');
          csv.history = createStream(projectName, masterCommit, 'history');
    })

    // Get the files

    .then(masterCommit => {
        let oids = [masterCommit.id().toString()];
        const walker = Git.Revwalk.create(masterCommit.owner());
        const walk = () => {
            return walker.next()
            .then(oid => oid.toString())
            .then(oid => Promise.props({
                oid,
                exists: document.json.exists(projectName, oid),
                commit: masterCommit.owner().getCommit(oid),
            }))
            .then(data => {
              if (data.exists && isFix(projectConfig.fixRegex, data.commit)) {
                oids.push(data.oid);
              }
            })
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

    .tap(data => Promise.each(data.files, (filename, i) => {
        return fs.readFileAsync(path.join(process.cwd(), filename + (i == 0 ? '-head' : '')), 'utf-8')

        .then(JSON.parse)
        .map(jsonRow => createCSV(data.columns, jsonRow))
        .then(rows => rows.concat('').join('\n'))

        .tap(rows => (i === 0 ? csv.master : csv.history).writeAsync(rows))

        .tap(() => {
            if (i % 10 === 0) log.verbose(logPrefix, `Wrote ${i} rows`);
        });
    }, { concurrency: 3 }))

     //ML
    //
    //.tap(() => {
    //    log.info('results/ml', `Estimating Accuracy`);
    //    return spawn('./lib/ml/estimate.py', [
    //        csvPath(projectName, masterCommit, 'history'),
    //        estimators,
    //        classificationLabel,
    //        repoPath + `/prediction.e${estimators}.${classificationLabel}.balanced.meta.csv`
    //    ])
    //    .tap(stdout => log.info('results/ml', stdout.toString().trim()))
    //})

    .tap(() => log.info('results/ml', `Modeling`))
    .tap(() => spawn('./lib/ml/ml.py', [
        csvPath(projectName, masterCommit, 'history'),
        csvPath(projectName, masterCommit, 'master'),
        classificationLabel,
        repoPath + `/prediction.e${estimators}.${classificationLabel}.06.04.csv`
    ]))

    //
    //.tap(() => log.info('results/ml', `Predicting`))
    //.tap(() => spawn('./lib/ml/predict.py', [
    //    `/tmp/${uid}.pickle`,
    //    csvPath(projectName, masterCommit, 'master'),
    //    repoPath + `/prediction.e${estimators}.${classificationLabel}.7.csv`
    //]))

    .tap(() => log.verbose(logPrefix, 'CSV Preparation finished'));
};
