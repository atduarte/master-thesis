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
    log.info(logPrefix, 'JSON Preparation started');
    document.setup(projectName);

    return document.raw.getAll(projectName)

    // DRY
    .filter(filename => document.json.exists(projectName, filename).then(_ => !_))

    .tap(files => log.info(logPrefix, `Will prepare ${files.length} files`))

    .each((filename , i) => {
        filename = document.raw.path(projectName) + filename;

        return fs.readFileAsync(path.join(process.cwd(), filename), 'utf-8')
        .then(JSON.parse)
        .then(rawJson => createJson(projectConfig, rawJson))
        .filter(jsonRow => jsonRow._added === false)
        .filter(jsonRow => projectConfig.fileFilter(jsonRow.__filename)) // Just to be sure
        .map(jsonRow => Object.assign(jsonRow, {_added: undefined}))
        .then(info => JSON.stringify(info, null, 2))
        .then(info => document.json.save(projectName, getLabelFromFilename(filename), info))
        .tap(() => {
            if (i % 10 === 0) log.verbose(logPrefix, `Prepared ${i} files`);
        });
    }, {concurrency: 15})
    .tap(() => log.verbose(logPrefix, 'JSON Preparation finished'));
};
