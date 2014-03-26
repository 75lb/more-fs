var test = require("tape"),
    mfs = require("../lib/more-fs");

test("FileStats", function(t){
    var stats = new mfs.FileStats([ "test/fixture/*", "clive", "test/fixture/folder2/**" ]);
    t.deepEqual(stats, { 
        stats: { 
            "clive": 0,
            "test/fixture/file1": 1,
            "test/fixture/folder1": 2,
            "test/fixture/folder2": 2,
            "test/fixture/folder2/file3": 1,
            "test/fixture/folder2/folder3": 2,
            "test/fixture/folder2/folder3/file4": 1 
        },
        notExisting: [ "clive" ],
        files: [ 
            "test/fixture/file1",
            "test/fixture/folder2/file3",
            "test/fixture/folder2/folder3/file4" 
        ],
        dirs: [ 
            "test/fixture/folder1",
            "test/fixture/folder2",
            "test/fixture/folder2/folder3" 
        ]
    });
    t.end();
});
