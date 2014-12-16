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

module.exports = function(primus, sharejsConn)
{
        return {
                Company: new (require('./Company'))(primus, sharejsConn),
                CompanySubmit: new (require('./CompanySubmit'))(primus, sharejsConn),
                User: new (require('./User'))(primus, sharejsConn),
                UploadedImage: new (require('./UploadedImage'))(primus, sharejsConn),
                NamedEntity: new (require('./NamedEntity'))(primus, sharejsConn)
        };
};
