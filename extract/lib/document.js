'use strict';
const fs = Promise.promisifyAll(require('fs'));
const mkdirp = require('mkdirp');
const walk = require('walk');
const _ = require('lodash');

const getLabel = (commit) => (!commit.id ? commit : commit.id()).toString();
const getBaseFolderPath = (projectName) => `./out/${projectName}/`;

const getRawFolderPath = (projectName) => getBaseFolderPath(projectName) + 'raw/';
const getRawPath = (projectName, label) => getRawFolderPath(projectName) + label;

const getJsonFolderPath = (projectName) => getBaseFolderPath(projectName) + 'json/';
const getJsonPath = (projectName, label) => getJsonFolderPath(projectName) + label;

module.exports.setup = (projectName, commit) => {
    mkdirp.sync(getRawFolderPath(projectName));
    mkdirp.sync(getJsonFolderPath(projectName));

    if (commit) {
        mkdirp.sync(getBaseFolderPath(projectName) + 'results/' + getLabel(commit) + '/');
    }
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

module.exports.json = {
    path: getJsonFolderPath,
    save: (projectName, commit, info) => {
        return fs.writeFileAsync(getJsonPath(projectName, getLabel(commit)), info);
    },
    exists: (projectName, commit) => {
        return fs.statAsync(getJsonPath(projectName, getLabel(commit))).return(true).catchReturn(false);
    },
    get: (projectName, commit) => {
        return fs.readFileAsync(getJsonPath(projectName, getLabel(commit)), 'utf-8')
        .catchReturn(null);
    },
};


