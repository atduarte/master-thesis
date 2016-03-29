'use strict';

const log = require('npmlog-ts');
const humanizeDuration = require('humanize-duration');

/**
 * Continuously monitor the process, printing metrics such as the memory and uptime.
 */
function statProcess() {
    // Do nothing if loglevel is higher than stat
    if (log.levels[log.level] < log.level.info) {
        return;
    }

    const pid = process.pid;

    setInterval(() => {
        const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const memoryTotal = (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2);
        const memoryRss = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
        const uptime = humanizeDuration(Math.round(process.uptime()) * 1000, { largest: 1 });

        log.info('process', `pid: ${pid}; memory: ${memoryUsage} / ${memoryTotal} / ${memoryRss} MB; uptime: ${uptime}`);
    }, 5000)
    .unref();
}

module.exports = statProcess;

