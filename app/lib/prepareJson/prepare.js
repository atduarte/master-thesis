'use strict';

const createJson = require('./create');
const log = require('npmlog-ts');
const path = require('path');
const document = require('../document');
const fs = Promise.promisifyAll(require('fs'));
const Git = require('nodegit');

const logPrefix = 'prepareJson/prepare';

function getLabelFromFilename(path) {
    const pathArray = path.split('/');

    return pathArray[pathArray.length - 1];
}

module.exports = (projectConfig, projectName, repoPath) => {
    log.info(logPrefix, 'JSON Preparation started');
    document.setup(projectName);

    return Promise.resolve(Git.Repository.open(repoPath))
    .call('getHeadCommit')
    .then(commit => Promise.props({
        commit,
        filenames: document.raw.getAll(projectName)

    }))
    .then(data => {
        data.filenames = data.filenames.map(filename =>{
            return {raw: filename, json: filename, head: false};
        });

        const id = data.commit.id().toString();
        data.filenames = data.filenames.concat([{raw: id, json: `${id}-head`, head: true}]);

        return data.filenames;
    })

    // DRY
    .filter(file => document.json.exists(projectName, file.json).then(_ => !_))


    .tap(files => log.info(logPrefix, `Will prepare ${files.length} files`))

    .each((file, i) => {
        const rawFilename = document.raw.path(projectName) + file.raw;

        return fs.readFileAsync(path.join(process.cwd(), rawFilename), 'utf-8')
        .then(JSON.parse)
        .then(rawJson => createJson(projectConfig, rawJson, file.head))
        .filter(jsonRow => jsonRow._added === false)
        .filter(jsonRow => projectConfig.fileFilter(jsonRow.__filename)) // Just to be sure
        .map(jsonRow => Object.assign(jsonRow, {_added: undefined}))
        .then(info => JSON.stringify(info, null, 2))
        .then(info => document.json.save(projectName, file.json, info))
        .tap(() => {
            if (i % 10 === 0) log.verbose(logPrefix, `Prepared ${i} files`);
        });
    }, {concurrency: 15})
    .tap(() => log.verbose(logPrefix, 'JSON Preparation finished'));
};
