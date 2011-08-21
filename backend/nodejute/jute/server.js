/*
Copyright (c) 2011, Yahoo! Inc.
All rights reserved.

Redistribution and use of this software in source and binary forms, 
with or without modification, are permitted provided that the following 
conditions are met:

* Redistributions of source code must retain the above
  copyright notice, this list of conditions and the
  following disclaimer.

* Redistributions in binary form must reproduce the above
  copyright notice, this list of conditions and the
  following disclaimer in the documentation and/or other
  materials provided with the distribution.

* Neither the name of Yahoo! Inc. nor the names of its
  contributors may be used to endorse or promote products
  derived from this software without specific prior
  written permission of Yahoo! Inc.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS 
IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED 
TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A 
PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT 
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, 
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT 
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, 
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY 
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT 
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/


module.exports = {
Create:  function(hub) {
    var path = require('path'),
        fs   = require('fs');

    // Events I care about
    hub.addListener('startServer', startServer);

    // Get this ready to go
    var juteClient = fs.readFileSync(path.join(__dirname, 'jute_docs', 'jute_client.js'), 'utf8');

    function startServer() {

        var connect  = require('connect'),
            sessions = require('cookie-sessions'),
            os       = require('os'),
            sys      = require('sys'),
            uuid     = require('node-uuid');

        hub.emit(hub.LOG, hub.INFO, "Running as " + process.getuid() + '/' + process.getgid());
        hub.emit(hub.LOG, hub.INFO, "Connect at http://" + (hub.config.host || os.hostname()) + ':' + hub.config.port + '/');

        connect(
          sessions({secret: 'jute rox', timeout: 365 * 1000 * 60 * 60 * 24 })
        , connect.favicon()
        , connect.query()
        , connect.bodyParser()
        , function(req, res, next) {
            // Make sure we have a session UUID
            //  maybe even from a selenium host
            var sess = req.session;
            if (!sess) sess = req.session = {};
            if (!sess.uuid) {
                sess.uuid = req.query.selenium || uuid();
                sess.selenium = req.query.selenium ? true: false;
            }

            // stash of req/res
            hub.cache.req = req;
            hub.cache.res = res;

            next();
        }
        , connect.logger(hub.config.logFormat)
        , connect.router(function(app){
            app.get('/jute_docs/:file', function(req, res, next){
                // Just one of JUTE's static files
                sendFullFile(path.join(__dirname, req.url), req, res, next);
            });
            app.all(/\/jute\/_([^\?]+)/, function(req, res, next){
                // A JUTE action - GET
                hub.emit('action', req.params[0]);//, req, res);
            });
            app.get('/', function(req, res, next){
                // Serve from '/'
                res.writeHead(301, { Location: '/jute_docs/capture.html' });
                res.end();
            });
        })
        , function(req, res, next) {
            // Anything else is a regular file - a test or a file being tested
            sendFullFile(path.join(hub.config.docRoot, req.url), req, res, next);
        }
        ).listen(hub.config.port);

        // Let anyone know the server has been started
        hub.emit('serverStarted');
    }

    /*
     * Check if static file needs to be coverage'd before sending it
     */
    function sendFullFile(path, req, res, next) {

        var p = require('path'),
            exec = require('child_process').exec,
            url = req.url;

        path = path.replace(/\?.*/,''); // get rid of any query string
        url = url.replace(/\?.*/,''); // get rid of any query string
        url = url.replace(hub.config.testDirWeb,''); // get rid of any query string

        if (req.query._one_shot && path.match(/\.js$/)) {
            // A V8 test!!
            exec('JUTE_DEBUG=1 ' + p.join(__dirname, '..', 'jute_v8.js') + ' ' + url + '?do_coverage=' + req.query.do_coverage, function(error, stdout, stderr) {
                if (error) {
                    res.end('V8 ERROR: ' + error);
                } else {
                    res.end(stdout);
                }
            });
        } else if (req.query.coverage && (!req.headers.referer || req.headers.referer.match('do_coverage=1'))) {
            // Coverage this bad boy!
            var tempFile = p.join('/tmp', p.basename(path));
            hub.emit(hub.LOG, hub.INFO, "Generating coverage file " + tempFile + " for " + path);
            exec(hub.config.java + ' -jar ' + p.join(__dirname, "yuitest-coverage.jar") + " -o " + tempFile + " " + path, function(err) {
                if (err) {
                    hub.emit(hub.LOG, 'error', "Error coverage'ing " + path + ": " + err);
                    hub.emit(hub.LOG, 'error', "Sending plain file");
                    _doSend(path, req, res, next);
                } else {
                    _doSend(tempFile, req, res, next);
                    // DO NOT delete coverage'd file for debugging
                }
            });
        } else {
            _doSend(path, req, res, next);
        }
    }
    /*
     * Sucked mostly from connection/middleware/static
     *  just send a static file
     */
    function _doSend(path, req, res, next) {

        var mime = require('mime');

        fs.stat(path, function(err, stat) {
            var type, charset,
                cutils = require('connect/lib/utils');

            if (err) {
                return 'ENOENT' == err.code ? next() : next(err);
            // ignore directories
            } else if (stat.isDirectory()) {
                next();
            }

            type = mime.lookup(path);

            res.setHeader('Content-Length', stat.size);
            res.setHeader('Last-Modified', new Date().toUTCString());

            // header fields
            if (!res.getHeader('content-type')) {
                charset = mime.charsets.lookup(type);
                res.setHeader('Content-Type', type + (charset ? '; charset=' + charset : ''));
            }

            // dynamically inject JUTE?
            if (type.match(/javascript/)) {
                var file = fs.readFileSync(path, 'utf8'),
                    regex = /\)\s*\.\s*use\s*\(([^)]+)/;

                var matches = regex.exec(file);
                if (matches) {
                    if (matches[1].match('test')) {

                        hub.emit(hub.LOG, hub.INFO, "Dynamically injecting JUTE client into " + path);

                        res.setHeader('Content-Length', stat.size + juteClient.length);
                        res.write(juteClient);
                        res.end(file.replace('test', 'jute'));
                        return;
                    }
                }

                // Nope, just some plain old JS file...
                res.end(file);
            } else {
                fs.createReadStream(path).pipe(res);
            }
        });
    }
}
};

