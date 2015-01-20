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
var domv = require('domv');
var FileReader = global.FileReader;
var hrtime = require('../../swissarmyknife/hrtime');

if (global.window) // browser
{
        if (!global.mOxie)
        {
                global.mOxie = require('plupload/js/moxie').mOxie;
        }

        require('plupload/js/plupload.dev');
        var plupload = global.plupload;
}

require('static-reference')('./style/EditableImage.less');

function uploaderAddMimeType(uploader, file)
{
        /*jshint -W106 */
        if (!uploader.settings.multipart_params)
        {
                uploader.settings.multipart_params = {};
        }

        uploader.settings.multipart_params['Content-Type'] = file.type;
}

function EditableImage(node, maxSize, initialSrc)
{
        domv.Component.call(this, node, 'span');

        this.lastChangeByUser = null;
        this.isPreviewSrc = false;
        this.maxSize = maxSize || 1024 * 1024; // 1 MiB
        this._sharePath = null;
        this._shareContext = null;

        if (this.isCreationConstructor(node))
        {
                this.cls('EditableImage');

                this.appendChild(this.errorNode = this.create('span', 'error'));
                this.image = null;
                this.srcValue = initialSrc;

        }
        else
        {
                this.assertHasClass('EditableImage');
                this.errorNode = this.assertSelector('> .error');
                this.image = this.selector('> img');
        }

        //this.on('keydown', this._onKeydown);

        if (plupload)
        {
                this.createUploader();
        }
}

module.exports = EditableImage;
require('inherits')(EditableImage, domv.Component);

EditableImage.prototype.createUploader = function()
{
        this.uploader = new plupload.Uploader({
                'browse_button': this.outerNode,
                'drop_element': this.outerNode,
                container: this.outerNode,
                url: '/upload/image',
                filters: {
                        'max_file_size': this.maxSize,
                        'mime_types' : [
                                { title : 'Image', extensions : 'jpg,png' }
                        ]
                },
                multipart: false, // binary stream
                'multi_selection': false,
                'required_features:': 'select_file, send_binary_string',
                runtimes: 'html5',
                'send_file_name': true
        });

        this.uploader.bind('Init', this._uploaderInit, this);
        this.uploader.bind('BeforeUpload', uploaderAddMimeType);
        this.uploader.bind('Error', this._uploaderError, this);
        this.uploader.bind('FilesAdded', this._uploaderFilesAdded, this);
        this.uploader.bind('FileUploaded', this._uploaderFileUploaded, this);
        this.uploader.init();
};

EditableImage.prototype._uploaderInit = function(up)
{
        up.disableBrowse(!this.editing);
};

EditableImage.prototype._uploaderError = function(up, err)
{
        this.error = err.message;
        console.error('Uploader error', err);
};

EditableImage.prototype._uploaderFilesAdded = function(up, files)
{
        up.start();

        var nativeFile = files[0].getNative();
        if (nativeFile)
        {
                // show preview
                var reader = new FileReader();

                reader.onerror = function()
                {
                        this.error = 'Your web browser was unable to read the file you selected';
                }.bind(this);

                reader.onloadend = function ()
                {
                        this.image.attr('src', reader.result);
                        this.isPreviewSrc = true;
                }.bind(this);

                reader.readAsDataURL(nativeFile);
        }
};

EditableImage.prototype._uploaderFileUploaded = function(up, file, response)
{
        // response.response
        // response.status
        // response.responseHeaders

        var oldValue = this.fileIdValue;

        var responseBody = JSON.parse(response.response);
        var newValue = responseBody.fileId;
        this.fileIdValue = newValue;

        var eventData = {
                targetComponent: this,
                newFileId: newValue
        };

        this.emit('domv-editable-change', eventData, true, false);
        this.lastChangeByUser = hrtime();

        if (this._shareContext)
        {
                var op = {
                        p : [this._sharePath],
                        od: oldValue,
                        oi: newValue
                };

                this._shareContext.submitOp(op);
        }
};

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

                if (this.uploader)
                {
                        this.uploader.disableBrowse(!value);
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

Object.defineProperty(EditableImage.prototype, 'fileIdValue', {
        configurable: true,
        get: function()
        {
                var val = this.srcValue;
                val = /^\/uploads\/image\/([a-f0-9]{24})/i.exec(val);
                return val ? val[1] : null;
        },
        set: function(value)
        {
                this.srcValue = value
                        ? '/uploads/image/' + value
                        : null;
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

/*
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
*/

EditableImage.prototype.attachEditingContext = P.method(function(path, contextFactory)
{
        this._sharePath = null;

        if (this._shareContext)
        {
                this._shareContext._onOp = null;
                this._shareContext.destroy();
                this._shareContext = null;
        }

        if (!contextFactory)
        {
                return false;
        }

        // assume the factory is bound to an id
        return contextFactory.get()
        .bind(this)
        .then(function(context)
        {
                this._sharePath = path;
                this._shareContext = context;
                this._shareContext._onOp = this._contextOnOp.bind(this); // _onOp(opData.op)

                return true;
        });
});

EditableImage.prototype._contextOnOp = function(components)
{
        components.forEach(function(comp)
        {
                if (comp.p[0] !== this._sharePath)
                {
                        // not for me
                        return;
                }

                this.handleOperationComponent(comp);
        }, this);
};

EditableImage.prototype.handleOperationComponent = function(comp)
{
        if ('oi' in comp)
        {
                this.fileIdValue = comp.oi;
        }
        else if ('od' in comp) // only a remove
        {
                this.fileIdValue = null;
        }
};
