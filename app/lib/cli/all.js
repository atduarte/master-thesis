'use strict';
const extract = require('../extract/extract');
const prepareJSON = require('../prepareJson/prepare');
const prepareResults = require('../results/prepare');
const log = require('npmlog-ts');
const getProjectConfig = require('../util/getProjectConfig');

module.exports.builder = (yargs) => {
    return yargs
        .usage('Do it all.\n\nUsage: ./$0 csv <name> <repo-path> <analyze-count>')
        .demand(3, 4);
};

module.exports.handler = (argv) => {
    process.title = 'master-thesis';
    log.level = argv.logLevel;

    const projectName = argv._[1];
    const repoPath = argv._[2];
    const projectConfig = getProjectConfig(projectName, argv.projectConfig);
    const classificationLabel = argv.classificationLabel;
    const estimators = argv.estimators;

    return extract(projectConfig, projectName, repoPath)
    .then(() => prepareJSON(projectConfig, projectName))
    .then(() => prepareResults(projectConfig, projectName, repoPath, classificationLabel, estimators))
    .then(() => process.exit(0));
};
