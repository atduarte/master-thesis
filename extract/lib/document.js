'use strict';
const fs = Promise.promisifyAll(require('fs'));
const mkdirp = require('mkdirp');
const walk = require('walk');
const iterateFiles = Promise.promisify(require('iterate-files'));
const _ = require('lodash');

const getLabel = (commit) => (!commit.id ? commit : commit.id()).toString();
const getBaseFolderPath = (projectName) => `./out/${projectName}/`;

const getRawFolderPath = (projectName) => getBaseFolderPath(projectName) + 'raw/';
const getRawPath = (projectName, label) => getRawFolderPath(projectName) + label;

const getResultsFolderPath = (projectName) => getBaseFolderPath(projectName) + 'json/';
const getResultsPath = (projectName, label) => getResultsFolderPath(projectName) + label;

module.exports.setup = (projectName) => {
    mkdirp.sync(getRawFolderPath(projectName));
    mkdirp.sync(getResultsFolderPath(projectName));
};

module.exports.raw = {
    path: getRawFolderPath,
    save: (projectName, commit, info) => {
        return fs.writeFileAsync(getRawPath(projectName, getLabel(commit)), JSON.stringify(info, null, 4));
    },
    getAll: (projectName) => new Promise(resolve => {
        const files = [];
        const walker = walk.walk(getRawFolderPath(projectName));

        walker.on('file', (root, stat, next) => {
            files.push(stat.name);
            next();
        });

        walker.on('end', () => resolve(files));
    }),
};

module.exports.results = {
    path: getResultsFolderPath,
    save: (projectName, commit, info) => {
        return fs.writeFileAsync(getResultsPath(projectName, getLabel(commit)), info);
    },
    exists: (projectName, commit) => {
        return fs.statAsync(getResultsPath(projectName, getLabel(commit))).return(true).catchReturn(false);
    },
    get: (projectName, commit) => {
        return fs.readFileAsync(getResultsPath(projectName, getLabel(commit)), 'utf-8')
        .catchReturn(null);
    },
};


