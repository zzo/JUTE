module.exports = (function() {
    var fs = require('fs'), config;

    try {
        config = JSON.parse(fs.readFileSync('/tmp/jute.config', 'utf8'));
    } catch(e) {
        console.error('You must start the JUTE server: % npm start jute');
        process.exit(1);
    }

    return function() { return config };

})();
