'use strict';

const fs = Promise.promisifyAll(require('fs'));
const log = require('npmlog-ts');
const path = require('path');
const document = require('../document');
const createCSV = require('./create');
const _ = require('lodash');

const logPrefix = 'prepareCSV/prepare';

function getJsonFilesList(projectName) {
    const files = [];

    return document.results.iterate(projectName, filename => files.push(filename))
        .then(() => files);
}

function getColumns(jsonFilenames) {
    let columns = [];

    return Promise.each(jsonFilenames.splice(0, 5), (filename) => {
        return fs.readFileAsync(path.join(process.cwd(), filename), 'utf-8')
        .then(JSON.parse)
        .each(data => {
            columns = columns.concat(_.difference(Object.keys(data), columns));
        }, {concurrency: 50});
    }, {concurrency: 10})
    .then(() => columns.sort());
}

module.exports = (projectConfig, projectName) => {
    let i = 0;

    log.info(logPrefix, 'Setting up');
    document.setup(projectName);

    const csv = Promise.promisifyAll(fs.createWriteStream(`out/${projectName}/result.csv`, {defaultEncoding: 'utf8'}));

    return getJsonFilesList(projectName)

    .then(files => Promise.props({
        files,
        columns: getColumns(files),
    }))
    .tap(data => log.info(logPrefix, `Got ${data.columns.length} columns`))

    // Write Columns
    .tap(data => csv.writeAsync(`${data.columns.join(',')}\n`))

    .then(data => {
        return Promise.each(data.files, filename => {
            return fs.readFileAsync(path.join(process.cwd(), filename), 'utf-8')
                .then(JSON.parse)
                .map(jsonRow => createCSV(data.columns, jsonRow))
                .then(rows => rows.concat('').join('\n'))
                .tap(rows => csv.writeAsync(rows))
                .tap(() => {
                    i += 1;
                    if (i % 10 === 0) log.info(logPrefix, `Wrote ${i} rows`);
                })
                .delay(10)
                .return(null);
        }, {concurrency: 5});
    })

    .tap(() => log.info(logPrefix, 'Preparation finished'));
};
