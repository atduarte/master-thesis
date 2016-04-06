'use strict';

const fs = Promise.promisifyAll(require('fs'));
const log = require('npmlog-ts');
const path = require('path');
const document = require('../document');
const createCSV = require('./create');
const _ = require('lodash');

const logPrefix = 'prepareCSV/prepare';

function createStream(projectName, name) {
    return Promise.promisifyAll(fs.createWriteStream(`out/${projectName}/${name}.csv`, {defaultEncoding: 'utf8'}));
}

function getJsonFilesList(projectName) {
    const files = [];

    return document.results.iterate(projectName, filename => files.push(filename))
    .then(() => files);
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

module.exports = (projectConfig, projectName, analyzeCount) => {
    let i = 0;

    log.info(logPrefix, 'Setting up');
    document.setup(projectName);

    // Create CSVs
    const csv = {};
    ['history'].concat(_.range(0, analyzeCount)).forEach(name => {
        csv[name] = createStream(projectName, name);
    });

    return getJsonFilesList(projectName)

    .then(files => Promise.props({
        files: files.sort((a, b) => {
            const getLabel = (x) => Number(_.last(x.split('/')).split(':')[0]);

            return getLabel(a) - getLabel(b);
        }),
        columns: getColumns(files),
    }))
    .tap(data => log.info(logPrefix, `Got ${data.columns.length} columns`))

    // Write Columns
    .tap(data => Object.keys(csv).forEach(name => {
        csv[name].writeAsync(`${data.columns.join(',')}\n`)
    }))

    .tap(data => log.info(logPrefix, `Got ${data.files.length} files`))
    .then(data => Promise.each(data.files, (filename, i) => {
        return fs.readFileAsync(path.join(process.cwd(), filename), 'utf-8')
            .then(JSON.parse)
            .map(jsonRow => createCSV(data.columns, jsonRow))
            .then(rows => rows.concat('').join('\n'))
            .tap(rows => {
                if (csv[i]) return csv[i].writeAsync(rows);

                csv['history'].writeAsync(rows);
            })
            .tap(() => {
                i += 1;
                if (i % 10 === 0) log.info(logPrefix, `Wrote ${i} rows`);
            })
            .return(null);
    }, {concurrency: 3}))

    .tap(() => log.info(logPrefix, 'Preparation finished'));
};
