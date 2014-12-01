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

module.exports = function(primus, model, config, user)
{
        // primus argument is null if the Resource is constructed for use in server side controllers

        if (!model)
        {
                throw Error('Missing argument model');
        }

        return {
                Company: new (require('./Company'))(primus, model, config, user),
                CompanySubmit: new (require('./CompanySubmit'))(primus, model, config, user),
                User: new (require('./User'))(primus, model, config, user),
                UploadedImage: new (require('./UploadedImage'))(primus, model, config, user)
        };
};
