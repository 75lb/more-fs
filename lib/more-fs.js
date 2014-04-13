"use strict";
/**
a few more Filesystem functions..
@module more-fs
*/

var os = require("os"),
    fs = require("fs"),
    glob = require("glob"),
    Glob = glob.Glob,
    path = require("path"),
    util = require("util"),
    crypto = require("crypto"),
    nature = require("nature"),
    w = require("wodge"),
    FileSet = require("./FileSet");

/** Move a file from A to B, creating the dest directories, optionally using a safe `to` path (if the existing one exists) and preserving the dates */
exports.moveFile = moveFile;

/** Delete a file, if it exists */
exports.deleteFile = deleteFile;
exports.copy = copy;
exports.write = write;
exports.rmdir = rmdir;
exports.mkdir = mkdir;

/** Copy `accessed` and `modified` times from A to B */
exports.preserveDates = preserveDates;
exports.getSafePath = getSafePath;
exports.expandFileList = expandFileList;

/** return a random filename in the OS tmp folder */
exports.getTempFilePath = getTempFilePath;
exports.getTempDir = getTempDir;

exports.getSubDirPath = getSubDirPath;
exports.replaceFileExtension = replaceFileExtension;
exports.getOutputPath = getOutputPath;

exports.FileSet = FileSet;

/** https://github.com/isaacs/node-glob#globsyncpattern-options */
exports.expand = glob.sync;
exports.Glob = glob.Glob;

function moveFile(options, done){
    // if to is a directory, keep the same baseName as from
    // make Job adapter wrapper for simple use from cli

    var config = new nature.Thing()
        .define({ name: "from", type: "string", required: true, alias: "f", valueTest: function(file){
            var exists = fs.existsSync(file);
            if (!exists) this.addValidationMessage("file does not exist: " + file);
            return exists;
        }})
        .define({  name: "to", type: "string", alias: "t", required: true })
        .define({  name: "safe", type: "boolean", default: true })
        .define({  name: "preserve-dates", alias: "p", type: "boolean" })
        .set(options);

    if(!config.valid){
        throw new Error("failed in movefile: " + JSON.stringify(config.errors));
    }

    var from = config.get("from"),
        to = config.get("to");

    // create destination directories
    var toDir = path.dirname(to);
    if (!fs.existsSync(toDir)){
        fse.mkdirsSync(toDir);
    }

    // get a safe `to` path
    to = config.get("safe")
        ? exports.getSafePath(to)
        : to;

    try{
        fs.renameSync(from, to);
        if (config.get("preserve-dates")){
            exports.preserveDates(from, to);
        }
        if (done) done(to);
    } catch(e){
        if (e.code === "EXDEV"){
            // fallback attempt
            fse.copy(from, to, function(err){
                if (err) throw err;
                if (config.get("preserve-dates")){
                    exports.preserveDates(from, to);
                }
                fs.unlinkSync(from);
                if (done) done(to);
            });
        } else {
            throw e;
        }
    }
}

function preserveDates(from, to){
    var fileStats = from instanceof fs.Stats ? from : fs.statSync(from);
    fs.utimesSync(to, fileStats.atime, fileStats.mtime);
}

function deleteFile(file){
    if (fs.existsSync(file)){
        fs.unlinkSync(file);
    }
}

function getSafePath(path){
    if (fs.existsSync(path)){
        return exports.getSafePath(path.replace(/\.(\w+)$/, "_.$1"));
    } else {
        return path;
    }
}

function expandFileList(filePaths, include, exclude){
    var output = [];

    filePaths.forEach(function(filePath){
        if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()){
            var dirListing = fs.readdirSync(filePath).map(function(file){
                return path.join(filePath, file);
            });
            output = output.concat(exports.expandFileList(dirListing, include, exclude));
        } else {
            if (fileShouldBeIncluded(filePath, include, exclude)){
                output.push(filePath);
            }
        }
    });
    return output;
}

function fileShouldBeIncluded(relativePath, include, exclude){
    // defaults
    var included = true,
        excluded = false;

    // exclude expression passed
    if (exclude){
        if (!(exclude instanceof RegExp)){
            throw new Error("pass a RegExp");
        }
        excluded = exclude.test(relativePath);
    }

    // include expression passed
    if (include){
        if (!(include instanceof RegExp)){
            throw new Error("pass a RegExp");
        }
        included = include.test(relativePath);
    }
    return included && !excluded;
}

function getTempFilePath(file){
    file = file || "temp-file"
    file = crypto.randomBytes(4).readUInt32LE(0) + path.basename(file);
    return path.join(os.tmpDir(), file);
}

function getTempDir(dirname){
    if (!dirname) throw new Error("please supply a directory name");
    var tempDir = path.join(os.tmpdir(), dirname);
    if(!fs.existsSync(tempDir)){
        fs.mkdirSync(tempDir);
    }
    return tempDir;
}

function copy(files, dest){
    files.forEach(function(file){
        var destFile = path.resolve(dest, file),
            content = fs.readFileSync(file);
        write(destFile, content);
    });
}

function write(filename, content){
    if (typeof content === "undefined") content = "";
    mkdir(path.dirname(filename));
    fs.writeFileSync(filename, content);
}

function mkdir(dirname){
    if (!fs.existsSync(dirname)){
        mkdir(path.dirname(dirname));
        fs.mkdirSync(dirname);
    }
}

function rmdir(dirName){
    if (!fs.existsSync(dirName)) return;
    fs.readdirSync(dirName).forEach(function(file){
        var fullPath = path.join(dirName, file);
        if (fs.statSync(fullPath).isDirectory()){
            rmdir(fullPath);
        } else {
            fs.unlinkSync(fullPath);
        }
    });
    fs.rmdirSync(dirName);
}

function getSubDirPath(file, subDirName){
    if (subDirName){
        return path.join(
            path.dirname(file),
            subDirName,
            path.basename(file)
        );
    } else {
        throw new Error("getSubDirName: must supply a sub directory path");
    }
}

function replaceFileExtension(file, ext){
    return file.replace(/\.\w+$/, "." + ext);
}

function getOutputPath(file, outputDir){
    if(outputDir && file){
        outputDir = outputDir.trim();
        // specific path specified
        if (/^\.\//.test(outputDir) || /^\//.test(outputDir) || /\.\.\//.test(outputDir)){
            return path.join(outputDir, file);

        // else return subdir path of input file
        } else {
            return exports.getSubDirPath(file, outputDir);
        }
    }
}
