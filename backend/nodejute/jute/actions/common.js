module.exports = {
    Create:  function(hub) {
        return {
            browserName: function(req) {
                return [req.headers['user-agent'], req.connection.remoteAddress].join('---');
            },

            makeSaneNames: function(browser) {
                var names = browser.split('---'),
                    filename = names[0],
                    ip = names[1],
                    pkgname
                ;

                // Get rid of funny chars
                filename = filename.replace(/[\/;]/g, '');
                filename = filename.replace(/[^A-Za-z0-9-]/g, '_');

                // Make a Hudson happy package name
                pkgname = filename.replace(/\./g, '');
                pkgname = pkgname.replace(/_+/g, '.');

                return [ filename, pkgname ];
            },

            dumpFile: function(vars, dataKey, filename, component) {
                var baseOutputDir = hub.config.outputDir,
                    path          = require('path'),
                    dir           = path.join(baseOutputDir, (this.makeSaneNames(component))[0]);
                    data          = vars[dataKey],
                    fullFile      = path.join(dir, filename),
                    fs            = require('fs')
                ;

                hub.emit(hub.LOG, 'info', "Dumping " + fullFile);

                // Any one of these can toss cookies!!!
                try {
                    // This will complain if dir already exists
                    //     And we KNOW we can already make dirs here
                    fs.mkdirSync(dir, 0777);
                } catch(e) {}

                try {
                    var fd = fs.openSync(fullFile, 'w')
                    fs.writeSync(fd, data, 0, 'utf8');
                    fs.closeSync(fd)
                    return [ fullFile, dir ];
                } catch(e) {
                    hub.emit(hub.LOG, 'error', "Error dumping file: " + e);
                }
            },

            failedTests: function(filename) {
                var fs = require('fs'),
                    file = fs.readFileSync(filename, 'utf8');

                return file.match(/failures="[1-9]/);
            },

            sendToClient: function(req, str) {
                req.write(str);
            },

            sendRemoteOutput: function(req, str) {
                req.write(str);
            }
        };
    }
};

