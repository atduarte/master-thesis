'use strict';

module.exports = (regex, commit) => {
    // Merge is not a fix
    if (commit.parentcount() > 1) return false;

    const message = commit.message().trim().split('\n', 1)[0].toLowerCase();

    const stopwords = ['typo', 'identation', 'javadoc', 'checkstyle', 'spelling'];
    //for (let i = 0; i < stopwords.length; ++i) {
    //    if (message.includes(stopwords[i])) return false;
    //}

    return regex.test(message);
};
