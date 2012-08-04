/*
 * This class fixes some deficiencies in original Ext.direct.Manager singleton.
 *
 * Main differences:
 * - All Ext.Direct events from Providers are now relayed by Ext.direct.Manager, making
 *   it easier to react to events. No more chasing individual Providers around.
 *
 * Version 0.99.
 *
 * Usage: require Ext.ux.direct.Manager in your Application class.
 *  
 * Copyright (c) 2012 Alexander Tokarev. Special thanks to IntelliSurvey, Inc.
 * for sponsoring part of my work on this code.
 *
 * This code is licensed under the terms of the Open Source LGPL 3.0 license.
 * Commercial use is permitted to the extent that the code/component(s) do NOT
 * become part of another Open Source or Commercially licensed development library
 * or toolkit without explicit permission.
 * 
 * License details: http://www.gnu.org/licenses/lgpl.html
 */

Ext.define('Ext.ux.direct.Manager', {
    override: 'Ext.direct.Manager',
    
    // Ext.direct.Manager is a singleton *instance*, not a class.
    // So no statics here.
    remotingEvents: [
        'beforecall',
        'beforecallback',
        'call',
        'connect',
        'data',
        'disconnect',
        'exception'
    ],
    
    pollEvents: [
        'beforepoll',
        'beforecallback',
        'connect',
        'data',
        'disconnect',
        'exception',
        'poll'
    ],
    
    addProvider: function() {
        var me  = this,
            arg = arguments,
            rEv = Ext.direct.Manager.remotingEvents,
            pEv = Ext.direct.Manager.pollEvents,
            provider;
        
        if ( arg.length > 1 ) {
            return me.callParent(arguments);
        };
        
        provider = me.callParent(arguments);
        
        if ( provider.type == 'remoting' ) {
            me.relayEvents(provider, rEv);
        }
        else if ( provider.type == 'polling' ) {
            me.relayEvents(provider, pEv);
        };
        
        return provider;
    }
});
