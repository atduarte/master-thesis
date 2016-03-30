'use strict';
const log = require('npmlog-ts');
const Promise = require('bluebird');

const logPrefix = 'extract/baseInfo';

const listComponents = (projectConfig, info) => {
    return Promise.resolve(info.commit.getTree())
    .then(tree => {
        const fileWalker = tree.walk();
        const waitables = [];

        fileWalker.on('error', log.error.bind(null, logPrefix));

        fileWalker.on('entry', entry => {
            if (!entry.isFile() || !projectConfig.fileFilter(entry.path())) return;

            const waitable = Promise.resolve(entry.getBlob())
                .then(blob => {
                    if (blob.isBinary()) return;
                    info.components[entry.path()] = {};
                });

            waitables.push(waitable);
        });

        return new Promise(resolve => {
            fileWalker.on('end', () => Promise.all(waitables).then(() => resolve(info)));
            fileWalker.start();
        });
    });
};

const analyzeDiff = (projectConfig, info) => {
    Object.keys(info.components).forEach(key => {
        Object.assign(info.components[key], {linesAdded: 0, linesRemoved: 0});
    });

    return Promise.resolve(info.commit.getDiff())
    .map(diff => { return diff.patches(); })
    .each(convenientPatches => {
        convenientPatches.forEach(patch => {
            if (patch.lineStats().total_additions + patch.lineStats().total_deletions === 0) return;

            if (!info.components.hasOwnProperty(patch.newFile().path())) {
                if (projectConfig.fileFilter(patch.newFile().path())) {
                    log.error(logPrefix, `Missed component "${patch.newFile().path()}" on commit ${info.commit.id().toString()}`);
                    info.components[patch.newFile().path()] = {linesAdded: 0, linesRemoved: 0};
                } else {
                    return;
                }
            }

            Object.assign(info.components[patch.newFile().path()], {
                linesAdded: patch.lineStats().total_additions || 0,
                linesRemoved: patch.lineStats().total_deletions || 0,
            });
        });
    })
    .then(() => info);
};

module.exports = (projectConfig, commit) => {
    return Promise.resolve({
        commit,
        id: commit.id().toString(),
        message: commit.message(),
        date: commit.time(),
        author: commit.author().email(),
        components: {},
    })
    .then(baseInfo => listComponents(projectConfig, baseInfo))
    .then(baseInfo => analyzeDiff(projectConfig, baseInfo));
};
