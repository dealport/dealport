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

var Primus = require('primus');
var EJSONError = require('./ejson-error');
EJSONError.registerType(require('ejson'));
EJSONError.patchErrorPrototype();

module.exports = function(server)
{
        if (!server)
        {
                server = require('http').createServer();
        }

        var primus = new Primus(server,
        {
                parser: 'ejson', // supports Uint8Array and Date
                transformer: 'engine.io'
        });

        EJSONError.addToPrimusLibrary(primus, true); // true = patch Error prototype

        primus.use('emitter', 'primus-emitter');
        primus.use('multiplex', 'primus-multiplex');

        return primus;
};
