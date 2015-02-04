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

var P = require('bluebird');

/* jshint -W117 */
function ga()
{
        var window = global.window;
        if (!window)
        {
                return; // node.js
        }

        if (!window.ga)
        {
                window.ga = function()
                {
                        (window.ga.q = window.ga.q || []).push(arguments);
                };

                window.ga.l = +new Date();
        }

        if (ga.debugMode)
        {
                console.log('google-analytics()', arguments);
        }
        return window.ga.apply(null, arguments);
}
/* jshint +W117 */

module.exports = ga;

ga.debugMode = false;

/**
 * Use me in promises catch handlers and normal catch blocks
 * @param {Error} err
 * @returns {Promise} Rejected promise with err
 */
module.exports.logException = function(err)
{
        ga('send', 'exception', {
                'exDescription': err.toString() + '\n\n' + err.stack,
                'exFatal': true
        });
        return P.reject(err);
};