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

// todo move me to npm

function ejsonErrorModule(Error)
{
        /*jshint -W064*/
        /*jshint -W121*/

        // wrapped is either a json object or an actual Error
        function EJSONError(wrapped)
        {
                if (!(this instanceof EJSONError))
                {
                        return new EJSONError(wrapped);
                }

                this.wrapped = wrapped;
        }

        EJSONError.prototype = Object.create(Error.prototype);
        EJSONError.prototype.constructor = EJSONError;

        function wrap(attr)
        {
                Object.defineProperty(EJSONError.prototype, attr, {
                        get: function ()
                        {
                                return this.wrapped ? this.wrapped[attr] : /* istanbul ignore next */ undefined;
                        }
                });
        }

        wrap('name');
        wrap('message');
        wrap('stack');
        wrap('fileName');
        wrap('lineNumber');
        wrap('columnNumber');

        EJSONError.prototype.toString = function ()
        {
                var ret = 'Error';
                if (this.name)
                {
                        ret += ' ' + this.name;
                }

                if (this.message)
                {
                        ret += ': ' + this.message;
                }

                return ret;
        };

        EJSONError.prototype.typeName = function ()
        {
                return 'jserror';
        };

        EJSONError.prototype.toJSONValue = function ()
        {
                return {
                        name        : this.name,
                        message     : this.message,
                        stack       : this.stack,
                        fileName    : this.fileName,
                        lineNumber  : this.lineNumber,
                        columnNumber: this.columnNumber
                };
        };

        module.exports = EJSONError;

        EJSONError.registerType = function (EJSON)
        {
                EJSON.addType('jserror', function (obj)
                {
                        return EJSONError(obj);
                });
        };

        EJSONError.patchErrorPrototype = function ()
        {
                Error.prototype.typeName = function ()
                {
                        return 'jserror';
                };

                Error.prototype.toJSONValue = function ()
                {
                        return EJSONError(this).toJSONValue();
                };
        };

        EJSONError.addToPrimusLibrary = function (primus, patchErrorPrototype)
        {
                var lib = ';(function (EJSON) {';
                lib += ejsonErrorModule.toString();
                lib += 'var EJSONError = ejsonErrorModule(window.Error);';
                lib += 'EJSONError.registerType(EJSON);';
                if (patchErrorPrototype)
                {
                        lib += 'EJSONError.patchErrorPrototype();';
                }
                lib += '})(EJSON);';

                primus.parser.library += lib;
        };

        return EJSONError;
}

module.exports = ejsonErrorModule(global.Error);