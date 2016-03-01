"use strict";
import Promise from 'bluebird';

export default (commit, filename) => {
    return Promise.resolve(commit.getTree())
    .then((tree) => { return tree.getEntry(filename) })
    .call('getBlob')
    .then((blob) => {
        return {
            lines: blob.toString('utf8').split(/\r\n|[\n\r\u0085\u2028\u2029]/g).length - 1,
            byteSize: blob.rawsize()
        };
    })
    .catch(() => {
        console.log('Didnt found: ' + filename + ' at commit ' + commit.id().toString());
        return {
            lines: 0,
            byteSize: 0
        }
    })
}
