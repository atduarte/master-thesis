'use strict';

function parse(value) {
    switch (value) {
    case true: return 1;
    case false: return 0;
    case undefined: return 0;
    default: return value;
    }
}

module.exports = (columns, json) => columns.map(column => parse(json[column])).join(',');
