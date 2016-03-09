"use strict";
const Promise = require('bluebird');

const listComponents = (info) => {
    return Promise.resolve(info.commit.getTree())
    .then(tree => {
        let fileWalker = tree.walk();
        let waitables = [];
        fileWalker.on('error', console.error);

        fileWalker.on('entry', entry => {
            if (!entry.isFile()) return;

            let waitable = Promise.resolve(entry.getBlob())
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

const analyzeDiff = (info) => {
    Object.keys(info.components).forEach(key => {
        Object.assign(info.components[key], {linesAdded: 0, linesRemoved: 0});
    });

    return Promise.resolve(info.commit.getDiff())
    .map(diff => { return diff.patches(); })
    .each(convenientPatches => {
        convenientPatches.forEach(patch => {
            if (patch.lineStats().total_additions + patch.lineStats().total_deletions == 0) return;

            if(!info.components.hasOwnProperty(patch.newFile().path())) {
                info.components[patch.newFile().path()] = {linesAdded: 0, linesRemoved: 0};
            }

            Object.assign(info.components[patch.newFile().path()], {
                linesAdded: patch.lineStats().total_additions || 0,
                linesRemoved: patch.lineStats().total_deletions || 0,
            });
        });
    })
    .then(() => info);
};

/**
 * Identifies the commits that were fixes.
 * Walk starts with the given commit.
 *
 * @param commit
 * @return {Promise}
 */
module.exports = commit => {
    return Promise.resolve({
        commit: commit,
        id: commit.id().toString(),
        message: commit.message(),
        date: commit.time(),
        author: commit.author().email(),
        components: {}
    })
    .then(listComponents)
    .then(analyzeDiff);
};
