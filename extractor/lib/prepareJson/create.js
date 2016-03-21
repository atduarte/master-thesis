'use strict';

// TODO

const twr = (start, end, eventDate) => {
    const tr = 0.5; // [0,1]
    const t = (eventDate - start) / (end - start); // [0,1]

    return 1 / (1 + Math.exp(2 + (-12 * t) + (1 - tr) * 10));
};

const getBaseInfo = (data, componentName, component) => {
    const isMostChanged = (percentage) => {
        return [].concat(data.changedComponents)
            .splice(0, Math.ceil(data.changedComponents.length * percentage) + 2)
            .filter(_ => _[0] === componentName)
            .length > 0;
    };

    const lines = component.changes[0] ? component.changes[0].lines : 0;
    const bytes = component.changes[0] ? component.changes[0].byteSize : 0;

    return {
        _commitId: data.id,
        _component: componentName,
        _lines: lines,
        _bytes: bytes,
        _added: component.linesAdded > 0 && lines === 0,
        __changed: (component.linesAdded + component.linesRemoved) > 0 && lines > 0,
        _mostChanged: data.changedComponents.length > 0 && data.changedComponents[0][0] === componentName,
        _mostChanged25: isMostChanged(0.25),
        _mostChanged50: isMostChanged(0.50),
        _mostChanged75: isMostChanged(0.75),
    };
};

const getAuthorsCount = (data, componentName, component) => {
    const authors = [];

    component.changes.forEach(change => {
        if (!authors.some(_ => _ == change.author)) {
            authors.push(change.author);
        }
    });

    return {authors: authors.length};
};

const getAuthorChangeCount = (data, componentName, component) => {
    return component.changes.reduce((previous, current) => {
        const label = `authorChanges::${current.author}`;

        previous[label] = previous[label] + 1 || 1;
        return previous;
    }, {});
};

const getAuthorWeightedChangeCount = (data, componentName, component) => {
    return component.changes.reduce((result, current) => {
        const dateLabel = `authorChanges:date-weighted::${current.author}`;
        const sizeLabel = `authorChanges:size-weighted::${current.author}`;
        const dateSizeLabel = `authorChanges:date+size-weighted::${current.author}`;
        const dateWeight = twr(data.startDate, data.date, current.date);
        const sizeWeight = (current.linesAdded + current.linesRemoved) * 0.2;

        result[dateLabel] = parseFloat((result[dateLabel] + dateWeight || dateWeight).toFixed(6));
        result[sizeLabel] = parseFloat((result[sizeLabel] + sizeWeight || sizeWeight).toFixed(6));
        result[dateSizeLabel] = parseFloat((result[dateSizeLabel] + (dateWeight * sizeWeight) || (dateWeight * sizeWeight)).toFixed(6));
        return result;
    }, {});
};

const getChangeCount = (data, componentName, component) => {
    const result = {
        changes: component.changes.length,
        'changes-fixes': component.changes.filter(change => change.isFix).length,
    };

    return Object.assign(result, {
        'changes-others': result.changes - result['changes-fixes'],
    });
};

const getWeightedChangeCount = (data, componentName, component) => {
    const result = {
        'changes:date-weighted': parseFloat(component.changes
        .reduce((previous, current) => {
            return previous + twr(data.startDate, data.date, current.date);
        }, 0).toFixed(6)),

        'changes:size-weighted': parseFloat(component.changes
        .reduce((previous, current) => {
            return previous + (current.linesAdded + current.linesRemoved) * 0.2;
        }, 0).toFixed(6)),

        'changes:date+size-weighted': parseFloat(component.changes
        .reduce((previous, current) => {
            return previous + twr(data.startDate, data.date, current.date) * (current.linesAdded + current.linesRemoved) * 0.2;
        }, 0).toFixed(6)),

        // Fixes

        'changes-fixes:date-weighted': parseFloat(component.changes.filter(change => change.isFix)
        .reduce((previous, current) => {
            return previous + twr(data.startDate, data.date, current.date);
        }, 0).toFixed(6)),

        'changes-fixes:size-weighted': parseFloat(component.changes.filter(change => change.isFix)
        .reduce((previous, current) => {
            return previous + (current.linesAdded + current.linesRemoved) * 0.2;
        }, 0).toFixed(6)),

        'changes-fixes:date+size-weighted': parseFloat(component.changes.filter(change => change.isFix)
        .reduce((previous, current) => {
            return previous + twr(data.startDate, data.date, current.date) * (current.linesAdded + current.linesRemoved) * 0.2;
        }, 0).toFixed(6)),
    };

    return Object.assign(result, {
        'changes-others:date-weighted': result['changes:date-weighted'] - result['changes-fixes:date-weighted'],
        'changes-others:size-weighted': result['changes:size-weighted'] - result['changes-fixes:size-weighted'],
        'changes-others:date+size-weighted': result['changes:date+size-weighted'] - result['changes-fixes:date+size-weighted'],
    });
};



const addComponentListSortedByChangeCount = (data) => {
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

module.exports = (data) => {
    data = Object.assign.apply(null, [data].concat(preSteps.map(_ => _(data))));
    return Object.keys(data.components).map(key => {
        return Object.assign.apply(null, attributors.map(_ => _(data, key, data.components[key])));
    });
};
