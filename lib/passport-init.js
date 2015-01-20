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

var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var crypto = require('crypto');

var P = require('bluebird');

function gravatar(email)
{
        var mailMd5 = crypto.createHash('md5')
                .update( email.trim().toLowerCase() )
                .digest('hex');

        return '//gravatar.com/avatar/'+mailMd5+'?d=identicon';
}

function updateExternalProfile(model, providerName, profile)
{
        delete profile._raw;
        var displayNameChanged = false;

        return P.using(model.acquire(), function(db)
        {
                var find = {};
                find['auth.'+providerName+'.id'] = profile.id;

                return db.user.findOneAsync(find)
                .then(function(user)
                {
                        if (user)
                        {
                                var comps = [];

                                if (!user.auth) { user.auth = {}; }

                                comps.push({
                                        p: ['auth', providerName],
                                        od: null,
                                        oi: profile
                                });
                                user.auth[providerName] = profile;

                                if (!user.displayName)
                                {
                                        displayNameChanged = true;

                                        user.displayName = profile.displayName;
                                        comps.push({
                                                p: ['displayName'],
                                                od: null,
                                                oi: user.displayName
                                        });
                                }

                                if (!user.email &&
                                    profile.emails &&
                                    profile.emails.length)
                                {
                                        user.email = profile.emails[0].value;
                                        comps.push({
                                                p: ['email'],
                                                od: null,
                                                oi: user.email
                                        });

                                        user.avatarURL = gravatar(user.email);
                                        comps.push({
                                                p: ['avatarURL'],
                                                od: null,
                                                oi: user.avatarURL
                                        });
                                }
                                else if (!user.avatarURL)
                                {
                                        user.avatarURL = gravatar(user.email);
                                        comps.push({
                                                p: ['avatarURL'],
                                                od: null,
                                                oi: user.avatarURL
                                        });
                                }

                                return model.livedb.submitAsync('user', user._id, {
                                        op: comps
                                })
                                .return(user);
                        }
                        else
                        {
                                user = {
                                        auth: {},
                                        displayName: profile.displayName,
                                        email: (profile.emails &&
                                                profile.emails.length &&
                                                profile.emails[0].value)
                                               || ''
                                };
                                user.auth[providerName] = profile;

                                user.avatarURL = gravatar(user.email);

                                displayNameChanged = true;

                                return model.user.newUser(user);
                        }
                });
        })
        .then(function(user)
        {
                if (displayNameChanged)
                {
                        return model.namedEntity.createByGuessingId({
                                user: user._id
                        })
                        .return(user);
                }

                return user;
        });
}

module.exports = function(model, config, expressApp)
{
        var passportInitialize = passport.initialize();
        var passportSession = passport.session();
        expressApp.use(passportInitialize);
        expressApp.use(passportSession);

        expressApp.get('/auth/facebook', passport.authenticate('facebook', { scope: ['public_profile', 'email'] }));
        expressApp.get('/auth/facebook/callback',
                passport.authenticate('facebook', { successRedirect: '/', failureRedirect: '/login' })
        );

        passport.serializeUser(function(user, done)
        {
                done(null, user._id);
        });

        passport.deserializeUser(function(id, done)
        {
                P.using(model.acquire(), function(db)
                {
                        return db.user.findOneAsync({_id: id.toString()});
                }).nodeify(done);
        });

        if (config.facebookAppID)
        {
                passport.use(new FacebookStrategy(
                        {
                                clientID    : config.facebookAppID,
                                clientSecret: config.facebookAppSecret,
                                callbackURL : config.callbackUrlPrefix + '/auth/facebook/callback'
                        },
                        function (accessToken, refreshToken, profile, done)
                        {
                                updateExternalProfile(model, 'facebook', profile).nodeify(done);
                        }
                ));
        }
};