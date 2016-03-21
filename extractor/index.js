#!/usr/bin/env node

/* eslint global-require:0, no-unused-expressions:0 */

'use strict';

const Promise = require('bluebird');
const log = require('npmlog-ts');
const yargs = require('yargs');

global.Promise = Promise;
log.timestamp = true;

yargs
.strict()
.wrap(Math.min(120, yargs.terminalWidth()))
.version().alias('version', 'v')
.help('help').alias('help', 'h')
.usage('Git Extractor. Choose one of the available commands.\n\nUsage: ./$0 <command> .. [options]')
.demand(1, 'Please supply a valid command')

.option('log-level', {
    type: 'string',
    default: 'warn',
    alias: 'll',
    describe: 'The log level to use (error, warn, info, verbose, etc.)',
    global: true,
})

.command('raw', 'Extract data from Git Repo', require('./lib/cli/raw'))
.command('json', 'Prepare extracted data for ML', require('./lib/cli/json'))

.argv;

//require('./lib/cli/extract')('/mnt/ramdisk/repos/junit', 'junit2');


//const fs = require('fs');
//const prepare = require('./lib/prepare');
//
//const rawData = JSON.parse(fs.readFileSync('./example/junit/raw/04c3f9955266bbb47542a17c486354b80cfe77e6'));
//
//console.log(JSON.stringify(prepare(rawData), null, 2));

//log.level = 'verbose';

