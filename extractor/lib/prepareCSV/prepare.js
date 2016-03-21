'use strict';

const fs = Promise.promisifyAll(require('fs'));
const log = require('npmlog-ts');
const path = require('path');
const document = require('../document');
const createCSV = require('./create');

const logPrefix = 'prepareCSV/prepare';

function getLabelFromFilename(path) {
    const pathArray = path.split('/');

    return pathArray[pathArray.length - 1];
};

function getJsonFilesList(projectName) {
    const files = [];

    return document.results.iterate(projectName, filename => files.push(filename))
        .then(() => files);
};

module.exports = (projectName) => {
    let i = 0;

    log.info(logPrefix, 'Setting up');
    document.setup(projectName);

    return getJsonFilesList(projectName)

    // TODO Get columns & assure that file exists
        // Try to get CSV
            // If doesn't exist create (+ columns)

    .each(filename => {
        return fs.readFileAsync(path.join(process.cwd(), filename), 'utf-8')
        .then(JSON.parse)
        .then(createCSV)
        // TODO Append to CSV
            .tap(() => {
                i += 1;
                if (i % 10 === 0) log.info(logPrefix, `Prepared ${i} files`);
            });
    }, {concurrency: 10})
    .tap(() => log.info(logPrefix, 'Preparation finished'));
};
