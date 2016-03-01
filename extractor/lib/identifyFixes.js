"use strict";
Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var regex = new RegExp('(\b|)fix(|\b|ed|ing)|bug( | \#|\-|)[0-9]+', 'i');
var isFix = function isFix(commit) {
    // Merge is not a fix
    if (commit.parentcount() > 1) return false;

    var message = commit.message().trim().split('\n', 1)[0];
    return regex.test(message);
};

/**
 * Identifies the commits that were fixes.
 * Walk starts with the given commit.
 *
 * @param startCommit
 * @return {Promise}
 */

exports['default'] = function (startCommit) {
    var walker = startCommit.history();
    var fixCommits = [];

    walker.on('commit', function (commit) {
        if (isFix(commit)) fixCommits.push(commit);
    });

    // Do nothing, on error, just inform me
    walker.on('error', console.error);

    return new _bluebird2['default'](function (resolve) {
        walker.on('end', function () {
            resolve(fixCommits);
        });
        walker.start();
    });
};

module.exports = exports['default'];