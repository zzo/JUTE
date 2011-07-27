module.exports = {
Create:  function(hub) {
    // Events I care about
    hub.addListener('configureDone', startServer);

    function startServer(config) {

        var connect  = require('connect'),
            os       = require('os'),
            sys      = require('sys'),
            uuid     = require('node-uuid');

        hub.emit('log', 'info', "Running as " + process.getuid() + '/' + process.getgid());
        hub.emit('log', 'info', "Connect at http://" + os.hostname() + '/jute/');

        connect(
          connect.cookieParser()
        , connect.session({ secret: 'jute rox', cookie: { maxAge: 5000 }})
        , connect.favicon()
        , function(req, res, next) {
            var sess = req.session;
            if (!sess.uuid) {
                sess.uuid = uuid();
                sess.cookie.expires = false;
            }
            res.setHeader('Content-Type', 'text/plain');
            res.end(sys.inspect(config));
        }
        ).listen(config.port);

        hub.emit('serverStarted', config);
    }
}
};

