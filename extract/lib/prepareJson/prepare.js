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

module.exports = (projectConfig, projectName) => {
    let i = 0;

    log.info(logPrefix, 'Setting up');
    document.setup(projectName);

    return document.raw.getAll(projectName).map(file => document.raw.path(projectName) + file)

    .tap(files => log.info(logPrefix, `Will prepare ${files.length} files`))

    .each(filename => {
        return fs.readFileAsync(path.join(process.cwd(), filename), 'utf-8')
        .then(JSON.parse)
        .then(rawJson => createJson(projectConfig, rawJson))
        .filter(jsonRow => jsonRow._added === false)
        .filter(jsonRow => projectConfig.fileFilter(jsonRow.__filename)) // Just to be sure
        .map(jsonRow => Object.assign(jsonRow, {_added: undefined}))
        .then(info => JSON.stringify(info, null, 2))
        .then(info => document.results.save(projectName, getLabelFromFilename(filename), info))
        .tap(() => {
            i += 1;
            if (i % 10 === 0) log.info(logPrefix, `Prepared ${i} files`);
        });
    }, {concurrency: 15})
    .tap(() => log.info(logPrefix, 'Preparation finished'));
};
