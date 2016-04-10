#!/usr/bin/env node

/* eslint global-require:0, no-unused-expressions:0 */

'use strict';

const Promise = require('bluebird');
const log = require('npmlog-ts');
const yargs = require('yargs');
const stats = require('./lib/util/stats');

global.Promise = Promise;
log.timestamp = true;
stats();

yargs
.strict()
.wrap(Math.min(120, yargs.terminalWidth()))
.version().alias('version', 'v')
.help('help').alias('help', 'h')
.usage('Git Extractor. Choose one of the available commands.\n\nUsage: ./$0 <command> .. [options]')
.demand(1, 'Please supply a valid command')

.option('log-level', {
    type: 'string',
    default: 'info',
    alias: 'll',
    describe: 'The log level to use (error, warn, info, verbose, etc.)',
    global: true,
})

.option('project-config', {
    type: 'string',
    alias: 'pc',
    describe: 'The path to the JS file with configs specific to the project',
    global: true,
})

.command('raw', 'Extract raw data from Git Repo.', require('./lib/cli/raw'))
.command('json', 'Prepare JSON from raw data.', require('./lib/cli/json'))
.command('results', 'Prepare results from JSON data.', require('./lib/cli/results'))
.command('all', 'Extract and prepare', require('./lib/cli/all'))

.argv;


