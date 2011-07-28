module.exports = {
Create:  function(hub) {
    // Events I care about
    hub.addListener('startServer', startServer);

    function startServer() {

        var connect  = require('connect'),
            os       = require('os'),
            sys      = require('sys'),
            path     = require('path'),
            uuid     = require('node-uuid');

        hub.emit(hub.LOG, 'info', "Running as " + process.getuid() + '/' + process.getgid());
        hub.emit(hub.LOG, 'info', "Connect at http://" + os.hostname() + '/jute/');
//        hub.emit(hub.LOG, 'debug', sys.inspect(hub.config));

        connect(
          connect.cookieParser()
        , connect.session({ secret: 'jute rox', cookie: { maxAge: 5000 }})
        , connect.favicon()
        , connect.query()
        , function(req, res, next) {
            var sess = req.session;
            if (!sess.uuid) {
                sess.uuid = uuid();
                sess.cookie.expires = false;
            }
            next();
        }
        , function(req, res, next) {
            if (req.url == '/') {
                res.writeHead(301, { Location: '/jute_docs/capture.html' });
                res.end();
            } else {
                next();
            }
        }
        , connect.logger()
        , connect.router(function(app){
            app.get('/jute_docs/:file', function(req, res, next){
                sendFullFile(path.join(hub.config.docRoot, req.url), req, res, next);
            });
            app.get(/\/jute\/_([^\?]+)/, function(req, res, next){
                hub.emit('action', req.params[0], req, res);
            });
            app.post('/jute/_test_report', function(req, res, next){
                hub.emit('action', 'test_report', req, res);
            });
            app.get(/\/jutebase\/([^\?]+)/, function(req, res, next){
                // Fetching a TEST or SRC file!!
                // If this file has do_coverage=1 on it we may need to do
                //  something - otherwise it's just a static file
                //  lop off query string & send it
                sendFullFile(path.join(hub.config.docRoot, req.url), req, res, next);
            });
        })
        ).listen(hub.config.port);

        hub.emit('serverStarted');
    }

    /*
     * Sucked mostly from connection/middleware/static
     */
    function sendFullFile(path, req, res, next) {

        var fs = require('fs');
        path = path.replace(/\?.*/,''); // get rid of any query string

        fs.stat(path, function(err, stat) {
            var mime = require('mime'), type, charset,
                cutils = require('connect/lib/utils');

            if (err) {
                return 'ENOENT' == err.code ? next() : next(err);
            // ignore directories
            } else if (stat.isDirectory()) {
                next();
            }

            type = mime.lookup(path);
            res.setHeader('Content-Length', stat.size);
            res.setHeader('Last-Modified', stat.mtime.toUTCString());
            res.setHeader('ETag', cutils.etag(stat));

            // conditional GET support
            if (cutils.conditionalGET(req)) {
                if (!cutils.modified(req, res)) {
                return cutils.notModified(res);
                }
            }

            // header fields
            if (!res.getHeader('content-type')) {
                charset = mime.charsets.lookup(type);
                res.setHeader('Content-Type', type + (charset ? '; charset=' + charset : ''));
            }

            fs.createReadStream(path).pipe(res);
        });
    }
}
};

