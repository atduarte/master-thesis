'use strict';

const createJson = require('./create');
const log = require('npmlog-ts');
const path = require('path');
const document = require('../document');
const fs = Promise.promisifyAll(require('fs'));

const logPrefix = 'prepareJson/prepare';

function getLabelFromFilename(path) {
    const pathArray = path.split('/');

    return pathArray[pathArray.length - 1];
}

function getFilesList(projectName) {
    const files = [];

    return document.raw.iterate(projectName, filename => files.push(filename))
    .then(() => files);
}

module.exports = (projectConfig, projectName) => {
    let i = 0;

    log.info(logPrefix, 'Setting up');
    document.setup(projectName);

    return getFilesList(projectName)

    // Dont repeat the work
    //.filter(filename => document.results.exists(projectName, getLabelFromFilename(filename)).then(_ => !_))
    .tap(files => log.info(logPrefix, `Will prepare ${files.length} files`))

    .each(filename => {
        return fs.readFileAsync(path.join(process.cwd(), filename), 'utf-8')
        .then(JSON.parse)
        .filter(jsonRow => jsonRow._added === '0')
        .then(createJson)
        .then(info => JSON.stringify(info, null, 2))
        .then(info => document.results.save(projectName, getLabelFromFilename(filename), info))
        .tap(() => {
            i += 1;
            if (i % 10 === 0) log.info(logPrefix, `Prepared ${i} files`);
        });
    }, {concurrency: 10})
    .tap(() => log.info(logPrefix, 'Preparation finished'));
};
