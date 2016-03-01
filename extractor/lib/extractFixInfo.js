"use strict";
Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var listComponents = function listComponents(info) {
    return _bluebird2['default'].resolve(info.commit.getTree()).then(function (tree) {
        var fileWalker = tree.walk();
        var waitables = [];
        fileWalker.on('error', console.error);

        fileWalker.on('entry', function (entry) {
            if (!entry.isFile()) return;

            var waitable = _bluebird2['default'].resolve(entry.getBlob()).then(function (blob) {
                if (blob.isBinary()) return;
                info.components[entry.path()] = {};
            });

            waitables.push(waitable);
        });

        return new _bluebird2['default'](function (resolve) {
            fileWalker.on('end', function () {
                _bluebird2['default'].all(waitables).then(resolve.bind(null, info));
            });
            fileWalker.start();
        });
    });
};

var analyzeDiff = function analyzeDiff(info) {
    Object.keys(info.components).forEach(function (key) {
        _lodash2['default'].assign(info.components[key], { linesAdded: 0, linesRemoved: 0 });
    });

    return _bluebird2['default'].resolve(info.commit.getDiff()).map(function (diff) {
        return diff.patches();
    }).each(function (convenientPatches) {
        convenientPatches.forEach(function (patch) {
            var stats = patch.lineStats();
            var componentPath = patch.newFile().path();

            if (!info.components.hasOwnProperty(componentPath)) return;

            info.components[componentPath].linesAdded += stats.total_additions || 0;
            info.components[componentPath].linesRemoved += stats.total_deletions || 0;
        });
    }).then(function () {
        return info;
    });
};

/**
 * Identifies the commits that were fixes.
 * Walk starts with the given commit.
 *
 * @param commit
 * @return {Promise}
 */

exports['default'] = function (commit) {
    return _bluebird2['default'].resolve({
        commit: commit,
        id: commit.id().toString(),
        date: commit.time(),
        author: commit.author().email(),
        components: {}
    }).then(listComponents).then(analyzeDiff);
};

module.exports = exports['default'];