/*
 * DealPort
 * Copyright (c) 2014  DealPort B.V.
 *
 * This file is part of DealPort
 *
 * DealPort is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 *
 * DealPort is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with DealPort.  If not, see <http://www.gnu.org/licenses/>.
 *
 * In addition, the following supplemental terms apply, based on section 7 of
 * the GNU Affero General Public License (version 3):
 * a) Preservation of all legal notices and author attributions
 */

'use strict';

var conf = module.exports;
var defaults = {
        debugMode: false,  // if true, allows use of eval() and adds lots of logging
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
        smtpRejectUnauthorizedCA: true,
        googleAnalyticsUACode: '',
        sessionSecret: require('crypto').randomBytes(128).toString('base64'),
        // Used when we need to pass a full url to external services (e.g. facebook)
        callbackUrlPrefix: 'http://localhost:1337',
        facebookAppID: '',
        facebookAppSecret: ''
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
