"use strict";

var browserSync = require("../../../");
var fileWatcher = require("../../../lib/file-watcher");
var hooks       = require("../../../lib/hooks");
var merge       = require("../../../lib/cli/cli-options").merge;

var events      = require("events");
var path        = require("path");
var fs          = require("graceful-fs");
var assert      = require("chai").assert;

var outpath = path.join(__dirname, "../../fixtures");

var tempFileContent = "A test generated this file and it is safe to delete";

var writeTimeout = 500; // Wait for it to get to the filesystem

var writeFileWait = function (name, content, cb) {
    if (!cb) {
        cb = function () {};
    }
    setTimeout(function () {
        fs.writeFile(name, content, cb);
    }, writeTimeout);
};

describe("File Watcher Module", function () {

    it("Passes options for chokidar", function (done) {
        var imm = merge({
            files: "css/*.css",
            watchOptions: {
                debounceDelay: 4000
            }
        });
        imm = imm.set("files", hooks["files:watch"]([], imm.get("files"), {}));

        var emitter = new events.EventEmitter();
        var watchers = fileWatcher.plugin(imm, emitter);

        assert.equal(watchers.core.watchers.length, 1);
        assert.equal(watchers.core.watchers[0].options.debounceDelay, 4000);
        done();
    });
    it("Passes separate options for chokidar when multi given", function (done) {
        var imm = merge({
            files: [
                "css/*.css",
                {
                    match: "*.html",
                    fn: function (event) {
                        console.log(event);
                    },
                    options: {
                        interval: 100
                    }
                }
            ],
            watchOptions: {
                interval: 200
            }
        });
        imm = imm.set("files", hooks["files:watch"]([], imm.get("files"), {}));

        var emitter = new events.EventEmitter();
        var watchers = fileWatcher.plugin(imm, emitter);

        assert.equal(watchers.core.watchers.length, 2);
        assert.equal(watchers.core.watchers[0].options.interval, 200);
        assert.equal(watchers.core.watchers[1].options.interval, 100);
        done();
    });
    it("should emit events about changed files in core namespace", function (done) {

        var tempFile = path.join(outpath, "watch-func.txt");

        fs.writeFile(tempFile, tempFileContent, function () {

            // assert: it works if it calls done
            browserSync.reset();
            browserSync.create().init({
                files: tempFile,
                ui: false,
                online: false,
                logSnippet: false
            }, function (err, bs) {

                bs.events.on("file:changed", function (data) {
                    assert.equal(data.namespace, "core");
                    assert.equal(data.path, path.resolve(tempFile));
                    bs.cleanup();
                    done();
                });

                // act: change file
                writeFileWait(tempFile, tempFileContent + " changed");
                writeFileWait(tempFile, tempFileContent + " changed");
            });
        });
    });
});
