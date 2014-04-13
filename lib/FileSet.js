var fs = require("fs"),
    glob = require("glob"),
    Glob = glob.Glob,
    path = require("path"),
    util = require("util"),
    w = require("wodge");

module.exports = FileSet;

/**
A class to stat files, providing globbing support.
@constructor
@param {Array} files - The input files to stat
@example <caption>Expanding a list of glob patterns</caption>
    var fileStats = new FileSet([ "lib/src/*", "test/*"]);

*/
function FileSet(files){
    /**
    Each key is an existing file, it's value either 0, 1 or 2, meaning "does not exist", "file" or "directory", e.g.:
    @example
        {
            "file1": 1,
            "file2": 1,
            "clive.jpg": 0,
            "folder1": 2,
            "folder1/file1": 1,
            "folder1/file2": 1
        }
    */
    this.stats = {};
}
/** add files to the set */
FileSet.prototype.add = function(files){
    var self = this,
        existingFiles = files.filter(fs.existsSync),
        notExistingFiles = w.without(files, existingFiles);

    existingFiles.forEach(function(file){
        self.stats[file] = fs.statSync(file).isDirectory() ? 2 : 1;
    });

    notExistingFiles.forEach(function(file){
        var glob = new Glob(file, { sync: true, stat: true });
        if (glob.found.length){
            glob.found.forEach(function(file){
                if (glob.cache[file] instanceof Array) glob.cache[file] = 2;
                self.stats[file] = glob.cache[file];
            });
        } else {
            self.stats[file] = 0;
        }
    });
};

/** an array of files which don't exist */
FileSet.prototype.notExisting = function(){
    return w.pluck(this.stats, function(val){ return val === 0; });
};

/** an array of files which exist */
FileSet.prototype.files = function(){
    return w.pluck(this.stats, function(val){ return val === 1; });
};

/** an array of directorys which exist */
FileSet.prototype.dirs = function(){
    w.pluck(this.stats, function(val){ return val === 2; });
};

FileSet.NOEXIST = 0;
FileSet.FILE = 1;
FileSet.DIR = 2;
