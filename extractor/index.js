'use strict';
const fs = require('fs');
const prepare = require('./lib/prepare');

const rawData = JSON.parse(fs.readFileSync('./example/junit/raw/04c3f9955266bbb47542a17c486354b80cfe77e6'));

console.log(JSON.stringify(prepare(rawData), null, 2));
