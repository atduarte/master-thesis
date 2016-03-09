export default {
    cf23df2207d99a74fbe169e3eba035e633b65d94: {
        id: 'cf23df2207d99a74fbe169e3eba035e633b65d94',
        date: 1456750312,
        author: 'hi@andreduarte.eheh',
        components: {
            'index.js': {
                linesAdded: 0, // On change
                linesRemoved: 0, // On change
                changes: [
                    {
                        id: 'cf23df2207d99a74fbe169e3eba035e633b65d94',
                        date: 1456750312,
                        parentCount: 1, // >1 = Merge
                        author: 'hi@andreduarte.eheh',
                        linesAdded: 0,
                        linesRemoved: 0,
                        loc: 125,
                    },
                    // ...
                ]
            },
            // ...
        }
    }
};

//Objective: repo -> fixInfo[]
//
//repo -> fixCommit[]
//(commit) -> baseFixInfo[]
//(repo, fixCommitId, filename) -> componentInfo[]
