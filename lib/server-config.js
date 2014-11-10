'use strict';

var conf = module.exports;
var defaults = {
        listenPort: 1337,
        listenHostname: '127.0.0.1',
        mongoUri: 'mongodb://localhost:27017/dealport',
        dbPoolMin: 2,
        dbPoolMax: 30,
        smtpHost: 'localhost',
        smtpPort: '25',
        smtpSecure: false,
        smtpUser: '',
        smtpPass: '',
        smtpFrom: 'dealport@localhost',
        smtpTo: 'joris@bluehorizon.nl',
        smtpDebug: true,
        smtpRejectUnauthorizedCA: true
};

// see https://www.npmjs.org/doc/misc/npm-config.html#per-package-config-settings
// e.g. `npm config set juridica:listenPort 80`

for (var key in defaults)
{
        if (defaults.hasOwnProperty(key))
        {
                var val = process.env['npm_package_config_' + key];
                var def = defaults[key];

                if (val === undefined)
                {
                        val = def;
                }

                if (typeof def === 'boolean' && typeof val === 'string')
                {
                        val = val === 'true' || val === '1';
                }

                if (typeof def === 'number' && typeof val === 'string')
                {
                        val = parseInt(val, 10);
                }

                conf[key] =  val;
        }
}
