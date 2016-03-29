'use strict';
const fs = Promise.promisifyAll(require('fs'));
const mkdirp = require('mkdirp');
const iterateFiles = Promise.promisify(require('iterate-files'));

// TODO: config
const getBaseFolderPath = (projectName) => `./out/${projectName}/`;

const getRawFolderPath = (projectName) => getBaseFolderPath(projectName) + 'raw/';
const getRawPath = (projectName, commit) => getRawFolderPath(projectName) + commit.id();

const getResultsFolderPath = (projectName) => getBaseFolderPath(projectName) + 'json/';
const getResultsPath = (projectName, label) => getResultsFolderPath(projectName) + label;

module.exports.setup = (projectName) => {
    mkdirp.sync(getRawFolderPath(projectName));
    mkdirp.sync(getResultsFolderPath(projectName));
};

module.exports.raw = {
    exists: (projectName, commit) => {
        return fs.statAsync(getRawPath(projectName, commit)).return(true).catchReturn(false);
    },
    save: (projectName, commit, info) => {
        return fs.writeFileAsync(getRawPath(projectName, commit), JSON.stringify(info, null, 4));
    },
    iterate: (projectName, callback) => iterateFiles(getRawFolderPath(projectName), callback),
};

module.exports.results = {
    exists: (projectName, label) => {
        return fs.statAsync(getResultsPath(projectName, label)).catchReturn(false).return(true);
    },
    save: (projectName, label, info) => {
        return fs.writeFileAsync(getResultsPath(projectName, label), info);
    },
    iterate: (projectName, callback) => iterateFiles(getResultsFolderPath(projectName), callback),
};
