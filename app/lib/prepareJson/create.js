'use strict';

const _ = require('lodash');

// TODO

const twr = (start, end, eventDate) => {
    const tr = 0.5; // [0,1]
    const t = (eventDate - start) / (end - start); // [0,1]

    return 1 / (1 + Math.exp(2 + (-12 * t) + (1 - tr) * 10));
};

const getBaseInfo = (projectConfig, data, componentName, component) => {
    const isMostChanged = (percentage) => {
        return [].concat(data.changedComponents)
            .splice(0, Math.ceil(data.changedComponents.length * percentage) + 2)
            .filter(_ => _[0] === componentName)
            .length > 0;
    };

    const getExt = (filename) => {
        filename = filename.split('/').pop();

        const index = filename.lastIndexOf('.');

        return index >= 0 ? filename.substr(index + 1) : '';
    };

    const lines = component.changes[0] ? component.changes[0].lines : 0;
    const bytes = component.changes[0] ? component.changes[0].byteSize : 0;

    return {
        __changed: (component.linesAdded + component.linesRemoved) > 0 && lines > 0,
        __date: data.date,
        //__type: getExt(componentName),
        //_commitId: data.id,
        __filename: componentName,
        _lines: lines,
        _bytes: bytes,
        _added: component.linesAdded > 0 && lines === 0,
        _mostChanged: data.changedComponents.length > 0 && data.changedComponents[0][0] === componentName,
        _mostChanged25: isMostChanged(0.25),
        _mostChanged50: isMostChanged(0.50),
        _mostChanged75: isMostChanged(0.75),
    };
};

const getAuthorsCount = (projectConfig, data, componentName, component) => {
    const authors = [];

    component.changes.forEach(change => {
        if (!authors.some(_ => _ == change.author)) {
            authors.push(projectConfig.emailNormalizer(change.author));
        }
    });

    return {authors: authors.length};
};

const getAuthorChangeCount = (projectConfig, data, componentName, component) => {
    return component.changes.reduce((previous, current) => {
        const label = `authorChanges::${projectConfig.emailNormalizer(current.author)}`;

        previous[label] = previous[label] + 1 || 1;
        return previous;
    }, {});
};

const getAuthorWeightedChangeCount = (projectConfig, data, componentName, component) => {
    return component.changes.reduce((result, current) => {
        const email = projectConfig.emailNormalizer(current.author);
        const dateLabel = `authorChanges:date-weighted::${email}`;
        const sizeLabel = `authorChanges:size-weighted::${email}`;
        const dateSizeLabel = `authorChanges:date+size-weighted::${email}`;
        const dateWeight = twr(data.startDate, data.date, current.date);
        const sizeWeight = (current.linesAdded + current.linesRemoved);

        result[dateLabel] = parseFloat((result[dateLabel] + dateWeight || dateWeight).toFixed(6));
        result[sizeLabel] = parseFloat((result[sizeLabel] + sizeWeight || sizeWeight).toFixed(6));
        result[dateSizeLabel] = parseFloat((result[dateSizeLabel] + (dateWeight * sizeWeight) || (dateWeight * sizeWeight)).toFixed(6));
        return result;
    }, {});
};

const getChangeCount = (projectConfig, data, componentName, component) => {
    const result = {
        changes: component.changes.length,
        'changes-fixes': component.changes.filter(change => change.isFix).length,
    };

    return Object.assign(result, {
        'changes-others': result.changes - result['changes-fixes'],
    });
};

const getWeightedChangeCount = (projectConfig, data, componentName, component) => {
    const result = {
        'changes:date-weighted': parseFloat(component.changes
        .reduce((previous, current) => {
            return previous + twr(data.startDate, data.date, current.date);
        }, 0).toFixed(6)),

        'changes:size-weighted': parseFloat(component.changes
        .reduce((previous, current) => {
            return previous + (current.linesAdded + current.linesRemoved);
        }, 0).toFixed(6)),

        'changes:date+size-weighted': parseFloat(component.changes
        .reduce((previous, current) => {
            return previous + twr(data.startDate, data.date, current.date) * (current.linesAdded + current.linesRemoved);
        }, 0).toFixed(6)),

        // Fixes

        'changes-fixes:date-weighted': parseFloat(component.changes.filter(change => change.isFix)
        .reduce((previous, current) => {
            return previous + twr(data.startDate, data.date, current.date);
        }, 0).toFixed(6)),

        'changes-fixes:size-weighted': parseFloat(component.changes.filter(change => change.isFix)
        .reduce((previous, current) => {
            return previous + (current.linesAdded + current.linesRemoved);
        }, 0).toFixed(6)),

        'changes-fixes:date+size-weighted': parseFloat(component.changes.filter(change => change.isFix)
        .reduce((previous, current) => {
            return previous + twr(data.startDate, data.date, current.date) * (current.linesAdded + current.linesRemoved);
        }, 0).toFixed(6)),
    };

    return Object.assign(result, {
        'changes-others:date-weighted': result['changes:date-weighted'] - result['changes-fixes:date-weighted'],
        'changes-others:size-weighted': result['changes:size-weighted'] - result['changes-fixes:size-weighted'],
        'changes-others:date+size-weighted': result['changes:date+size-weighted'] - result['changes-fixes:date+size-weighted'],
    });
};


const addComponentListSortedByChangeCount = (projectConfig, data) => {
    return {
        changedComponents: Object.keys(data.components)
            .filter(_ => data.components[_].lines !== 0)
            .filter(_ => data.components[_].linesAdded + data.components[_].linesRemoved > 0)
            .map(_ => [_, data.components[_].linesAdded + data.components[_].linesRemoved])
            .sort((a, b) => a[1] - b[1]),
    };
};

// Complement the rawData
const preSteps = [
    addComponentListSortedByChangeCount,
];

// Generate the attributes
const attributors = [
    getBaseInfo,
    getChangeCount,
    getWeightedChangeCount,
    getAuthorsCount,
    getAuthorChangeCount,
    getAuthorWeightedChangeCount,
];

const postStep = (projectConfig, data, result) => {
    const aggregation = {};

    // Aggregate
    result.forEach(row => {
        Object.keys(row).forEach(key => {
            if (!key.startsWith('author') && !key.startsWith('change')) return;

            aggregation[key] = aggregation[key] || {max: 0, min: Math.pow(10, 9)};

            if (row[key] !== undefined) {
                aggregation[key].min = Math.min(row[key], aggregation[key].min);
                aggregation[key].max = Math.max(row[key], aggregation[key].max);
            }
        });

    });

    // Normalize
    return result.map(row => {
        Object.keys(aggregation).forEach(key => {
            if (row[key] === undefined) return;
            row[`${key}:raw`] = row[key] || 0;
            row[`${key}:normalized`] = (row[key] - aggregation[key].min) / aggregation[key].max || 0;
            delete row[key];
        });

        return row;
    });
};

const removeOwnCommit = (data) => {
    _.forIn(data.components, (info, name) => {
        if (info.changes[0] && info.changes[0].id == data.id) {
            data.components[name].changes.shift();
        }
    });

    return data;
};

module.exports = (projectConfig, data, isHead) => {
    if (!isHead) data = removeOwnCommit(data);

    data = Object.assign.apply(null, [data].concat(preSteps.map(_ => _(projectConfig, data))));
    const result = Object.keys(data.components).map(key => {
        return Object.assign.apply(null, attributors.map(_ => _(projectConfig, data, key, data.components[key])));
    });

    return postStep(projectConfig, data, result);
};
