'use strict';
const prepareResults = require('../results/prepare');
const getProjectConfig = require('../util/getProjectConfig');
const log = require('npmlog-ts');

module.exports.builder = (yargs) => {
    return yargs
    .usage('Prepare CSV from JSON data.\n\nUsage: ./$0 results <name> <repo-path>')
    .demand(3, 3);
};

module.exports.handler = (argv) => {
    process.title = 'master-thesis-results';
    log.level = argv.logLevel;

    const projectName = argv._[1];
    const repoPath = argv._[2];
    const projectConfig = getProjectConfig(projectName, argv.projectConfig);
    const classificationLabel = argv.classificationLabel;
    const estimators = argv.estimators;

    return prepareResults(projectConfig, projectName, repoPath, classificationLabel, estimators)
    .then(() => process.exit(0));
};
