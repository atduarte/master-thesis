'use strict';
const log = require('npmlog-ts');
const knex = require('knex');

const logPrefix = 'extract/cache';

let db = null;
let changesTable = null;

const change = (uniqid, commit, blobId, filename, data) => {
    return {
        uniqid,
        commitId: commit.id().toString(),
        timestamp: commit.time(),
        filename,
        blobId,
        data: JSON.stringify(data),
    };
};

module.exports.setup = (databaseName) => {
    changesTable = `${databaseName}-changes`;
    db = knex({ // TODO: config
        client: 'pg',
        connection: {
            host: '127.0.0.1',
            user: 'node',
            password: 'pass',
            database: 'extractor',
        },
    });

    const changesTablePromise = db.schema.hasTable(changesTable)
    .then(exists => {
        if (exists) return;

        return db.schema.createTable(changesTable, table => {
            table.string('uniqid');
            table.string('commitId', 40);
            table.string('blobId', 40);
            table.text('filename');
            table.bigInteger('timestamp');
            table.json('data');
            table.unique(['commitId', 'blobId']);
        });
    });

    return Promise.all([changesTablePromise]);
};

module.exports.get = db;

module.exports.getChangesData = (commit, parents, blobId, filename) => {
    return db(changesTable)
    .select('uniqid', 'commitId', 'data')
    .where('blobId', '=', blobId)
    .where('filename', '=', filename) // Probably not necessary, but it doesn't hurt to check...
    .orderBy('timestamp', 'desc')
    .then(data => {
        while (data.length > 0) {
            if (!parents.some(_ => _ == data[0].commitId) && blobId) {
                data.shift();
                continue;
            }

            return db(changesTable)
            .select('data')
            .where('uniqid', '=', data[0].uniqid)
            .andWhere('timestamp', '<', commit.time())
            .orderBy('timestamp', 'desc')
            .map(_ => _.data);
        }

        //log.error(logPrefix, 'Miss ' + commit.id().toString().slice(0, 8), blobId); process.exit(-1);
        return undefined;
    });
};

module.exports.saveChanges = (data) => {
    data = data.map(_ => change.apply(null, _));
    return db.batchInsert(changesTable, data)
    .catch(e => {
        if (e.code !== '23505') throw e;

        log.silly(logPrefix, 'Failed to save changes for: ', {
            commit: data[0].commitId,
            blob: data[0].blobId,
            filename: JSON.parse(data[0].data).filename,
        });

        // TODO: What if we replaced?
        // Discover the conflict, remove, and then save
    });
};
