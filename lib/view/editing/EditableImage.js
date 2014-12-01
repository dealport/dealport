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
var domv = require('domv');
var FileReader = global.FileReader;
var hrtime = require('../../swissarmyknife/hrtime');
var bytes = require('bytes');

require('static-reference')('./style/EditableImage.less');

function EditableImage(node, maxSize, initialSrc)
{
        domv.Component.call(this, node, 'span');

        this.lastChangeByUser = null;
        this.isPreviewSrc = false;
        this.fileValue = null; // note: reset if a src value is set
        this.maxSize = maxSize || 1024 * 1024; // 1 MiB

        if (this.isCreationConstructor(node))
        {
                this.cls('EditableImage');

                this.appendChild(this.errorNode = this.create('span', 'error'));
                this.image = null;
                this.srcValue = initialSrc;
                this.input = null; // lazy

        }
        else
        {
                this.assertHasClass('EditableImage');
                this.errorNode = this.assertSelector('> .error');
                this.image = this.selector('> img');
                this.input = this.selector('> input');

                if (this.input)
                {
                        this.input.on('change', this._onInputChange, false, this);
                }
        }

        this.on('click', this._onClick);
        this.on('keydown', this._onKeydown);

        // todo drag
}

module.exports = EditableImage;
require('inherits')(EditableImage, domv.Component);

Object.defineProperty(EditableImage.prototype, 'editing', {
        configurable: true,
        get: function()
        {
                return this.hasClass('editing');
        },
        set: function(value)
        {
                value = !!value;
                this.toggleClass('editing', value);
                this.attr('tabindex', value ? '0' : false);
                this.error = '';

                if (value)
                {
                        if (!this.input)
                        {
                                this.input = this.create('input', {
                                        type: 'file',
                                        accept: 'image/png,image/jpeg'
                                });
                                this.input.on('change', this._onInputChange, false, this);
                        }
                        this.appendChild(this.input);
                }
                else if (this.input)
                {
                        this.input.removeNode();
                }
        }
});

EditableImage.prototype.isChangedByUserSince = function(since)
{
        if (since === undefined ||
            since === null)
        {
                return true;
        }

        if (this.lastChangeByUser === null)
        {
                return false;
        }

        return this.lastChangeByUser > since;
};

Object.defineProperty(EditableImage.prototype, 'srcValue', {
        configurable: true,
        get: function()
        {
                return (!this.isPreviewSrc && this.image && this.image.getAttr('img')) || null;
        },
        set: function(value)
        {
                this.fileValue = null;
                this.isPreviewSrc = false;
                this.error = '';

                if (!value)
                {
                        if (this.image)
                        {
                                this.image.removeNode();
                                this.image = null;
                        }
                        return;
                }

                if (!this.image)
                {
                        this.appendChild(this.image = this.create('img'));
                }

                this.image.attr('src', value);
        }
});

Object.defineProperty(EditableImage.prototype, 'error', {
        configurable: true,
        get: function()
        {
                return this.errorNode.textContent;
        },
        set: function(value)
        {
                this.errorNode.textContent = value || '';
                this.errorNode.style.display = value ? 'block' : null;
        }
});


EditableImage.prototype._onClick = function(e)
{
        if (!this.editing)
        {
                return;
        }

        if (this.input.isNodeEqual(e.target))
        {
                return;
        }

        e.preventDefault();

        this.input.outerNode.click();
};

EditableImage.prototype._onKeydown = function(e)
{
        if (!this.editing)
        {
                return;
        }

        if (e.keyCode === 13 || // enter key
            e.keyCode === 32    // space
        )
        {
                e.preventDefault();

                this.input.outerNode.click();
        }
};

EditableImage.prototype.handleFileSelect = function(files)
{
        var imageFile = null;
        if (!files) { files = []; }
        this.error = '';

        for (var i = 0; i < files.length; ++i)
        {
                var file = files[i];

                if (! /^image\/(png|jpeg|svg\+xml)$/.test(file.type))
                {
                        continue;
                }

                imageFile = file;

                break;
        }

        if (!imageFile)
        {
                this.error = 'Please select a valid image for uploading (png, jpeg or svg)';
                return;
        }

        if (this.maxSize &&
            imageFile.size > this.maxSize)
        {
                this.error = 'The image file must be smaller than ' + bytes(this.maxSize).toUpperCase();
                return;
        }

        var eventData = {
                targetComponent: this,
                newFile: imageFile
        };

        if (this.emit('domv-editable-change', eventData))
        {
                this.lastChangeByUser = hrtime();

                this.fileValue = imageFile;

                var reader = new FileReader();

                reader.onerror = function()
                {
                        this.error = 'Your web browser was unable to read the file you selected';
                }.bind(this);

                reader.onloadend = function()
                {
                        this.image.attr('src', reader.result);
                        this.isPreviewSrc = true;
                }.bind(this);

                reader.readAsDataURL(imageFile);
        }
};

EditableImage.prototype._onInputChange = function(e)
{
        this.handleFileSelect(this.input.outerNode.files);
};