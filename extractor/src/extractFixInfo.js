"use strict";
import Promise from 'bluebird';
import _ from 'lodash';

const listComponents = (info) => {
    return Promise.resolve(info.commit.getTree())
    .then((tree) => {
        let fileWalker = tree.walk();
        let waitables = [];
        fileWalker.on('error', console.error);

        fileWalker.on('entry', (entry) => {
            if (!entry.isFile()) return;

            let waitable = Promise.resolve(entry.getBlob())
                .then((blob) => {
                    if (blob.isBinary()) return;
                    info.components[entry.path()] = {};
                });

            waitables.push(waitable);
        });

        return new Promise((resolve) => {
            fileWalker.on('end', () => {
                Promise.all(waitables).then(resolve.bind(null, info));
            });
            fileWalker.start();
        });
    });
};

const analyzeDiff = (info) => {
    Object.keys(info.components).forEach(function(key) {
        _.assign(info.components[key], {linesAdded: 0, linesRemoved: 0});
    });

    return Promise.resolve(info.commit.getDiff())
    .map((diff) => { return diff.patches(); })
    .each((convenientPatches) => {
        convenientPatches.forEach((patch) => {
            const stats = patch.lineStats();
            const componentPath = patch.newFile().path();

            if (!info.components.hasOwnProperty(componentPath)) return;

            info.components[componentPath].linesAdded += stats.total_additions || 0;
            info.components[componentPath].linesRemoved += stats.total_deletions || 0;
        });
    })
    .then(() => { return info; });
};

/**
 * Identifies the commits that were fixes.
 * Walk starts with the given commit.
 *
 * @param commit
 * @return {Promise}
 */
export default (commit) => {
    return Promise.resolve({
        commit: commit,
        id: commit.id().toString(),
        date: commit.time(),
        author: commit.author().email(),
        components: {}
    })
    .then(listComponents)
    .then(analyzeDiff);
}
