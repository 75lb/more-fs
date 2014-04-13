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
    this.list = [];
    this.files = [];
    this.dirs = [];
    this.notExisting = [];
    this.add(files);
}
/** add files to the set */
FileSet.prototype.add = function(files){
    var self = this,
        nonExistingFiles = [];
        
    files.forEach(function(file){
        try {
            var stat = fs.statSync(file),
                fileSetItem = { path: file };
                
            if (!w.exists(self.list, fileSetItem)){
                if (stat.isFile()){
                    fileSetItem.type = FileSet.FILE;
                    self.files.push(file);
                }
                if (stat.isDirectory()){
                    fileSetItem.type = FileSet.DIR;
                    self.dirs.push(file);
                }
                self.list.push(fileSetItem);
            }
        } catch(err){
            if (err.code === "ENOENT"){
                nonExistingFiles.push(file);
            }
        }
    });

    nonExistingFiles.forEach(function(file){
        var glob = new Glob(file, { sync: true, stat: true });
        if (glob.found.length){
            glob.found.forEach(function(file){
                if (!w.exists(self.list, { path: file })){
                    if (glob.cache[file] instanceof Array) glob.cache[file] = 2;
                    var fileSetItem = { path: file, type: glob.cache[file] };
                    self.list.push(fileSetItem);
                
                    if (fileSetItem.type === 1) self.files.push(file);
                    if (fileSetItem.type === 2) self.dirs.push(file);
                }
            });
        } else {
            self.list.push({ path: file, type: FileSet.NOEXIST });
            self.notExisting.push(file);
        }
    });
};

FileSet.NOEXIST = 0;
FileSet.FILE = 1;
FileSet.DIR = 2;