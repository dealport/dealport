'use strict';

var conf = module.exports;
var defaults = {
        listenPort: 1337,
        listenHostname: '127.0.0.1',
        mongoUri: 'mongodb://localhost:27017/dealport',
        dbPoolMin: 2,
        dbPoolMax: 30
};

// see https://www.npmjs.org/doc/misc/npm-config.html#per-package-config-settings
// e.g. `npm config set juridica:listenPort 80`

for (var key in defaults)
{
        if (defaults.hasOwnProperty(key))
        {
                conf[key] = process.env['npm_package_config_' + key];

                if (conf[key] === undefined)
                {
                        conf[key] = defaults[key];

                }
        }
}