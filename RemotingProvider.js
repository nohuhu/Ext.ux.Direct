/*
 * This class fixes some bugs and deficiencies in original Ext.direct.RemotingProvider.
 *
 * Main differences:
 * - Direct namespaces can be nested, i.e. if server side declares a class Foo.Bar.Baz
 *   with methods foo and bar, resulting stub methods will be Foo.Bar.Baz.foo and
 *   Foo.Bar.Baz.bar. This behavior is compatible with RPC::ExtDirect; with other
 *   server side stacks it may or may not work. If not sure, don't declare nested
 *   namespaces.
 *
 * - Direct method callback can be canceled by listening to 'beforecallback' events
 *   and returning false from event handler. This is true for both successful and failed
 *   calls, i.e. in case of server failures and such.
 *
 * - Direct method accepts extra options Object as last parameter (after callback and scope),
 *   this object is applied to resulting Ext.Ajax.request() parameters so it becomes
 *   possible to set individual timeout and any other Ext.Ajax.request() parameter per
 *   Direct method call.
 *
 * - The options object is passed back to the Direct method callback function, so it
 *   is possible to pass any kind of data from caller to the callback.
 *
 * - When 'timeout' option is specified, Direct method is dispatched immediately, bypassing
 *   request queue.
 *
 * Version 0.99.
 *
 * Usage: require Ext.ux.direct.RemotingProvider in your Application class.
 *  
 * Copyright (C) 2011-2012 Alexander Tokarev. Special thanks to IntelliSurvey, Inc.
 * for sponsoring part of my work on this code.
 *
 * This code is licensed under the terms of the Open Source LGPL 3.0 license.
 * Commercial use is permitted to the extent that the code/component(s) do NOT
 * become part of another Open Source or Commercially licensed development library
 * or toolkit without explicit permission.
 * 
 * License details: http://www.gnu.org/licenses/lgpl.html
 */

Ext.define('Ext.ux.direct.RemotingProvider', {
    override: 'Ext.direct.RemotingProvider',
    
    requires: [
        'Ext.direct.RemotingProvider',
        'Ext.direct.RemotingMethod',
        'Ext.ux.direct.RemotingMethod'
    ],
    
    constructor : function(config) {
        var me = this;
        
        // This calls overridden Ext.direct.RemotingProvider constructor
        me.callParent(arguments);
        
        me.addEvents(
            /**
             * @event beforecallback
             * Fires before callback function is executed.
             * By returning false from an event handler you can prevent the callback
             * from executing.
             * @param {Ext.direct.RemotingProvider} provider
             * @param {Ext.direct.Transaction} transaction
             */
             'beforecallback'
        );
    },
    
    /**
     * Get nested namespace by property
     * @private
     */
    getNamespace: function(root, action) {
        var parts, ns;
        
        root  = root || Ext.global;
        parts = action.toString().split('.');
        
        for ( var i = 0, l = parts.length; i < l; i++ ) {
            ns   = parts[i];
            root = root[ns];
            
            if ( !Ext.isDefined(root) ) {
                return root;
            };
        };
        
        return root;
    },
    
    /**
     * Create nested namespaces
     * @private
     */
    createNamespaces: function(root, action) {
        var parts, ns;
        
        root  = root || Ext.global;
        parts = action.toString().split('.');
        
        for ( var i = 0, l = parts.length; i < l; i++ ) {
            ns = parts[i];
            
            root[ns] = root[ns] || {};
            root     = root[ns];
        };
        
        return root;
    },
    
    /**
     * Initialize the API
     * @private
     */
    initAPI: function() {
        var me         = this,
            actions    = me.actions,
            namespace  = me.namespace;
            
        for ( var action in actions ) {
            if ( actions.hasOwnProperty(action) ) {
                var klass = me.getNamespace(namespace, action);
                
                if ( !klass ) {
                    klass = me.createNamespaces(namespace, action);
                };
                
                var methods = actions[action];
                
                for ( var i = 0, len = methods.length; i < len; ++i ) {
                    var method = new Ext.direct.RemotingMethod( methods[i] );
                    
                    klass[method.name] = me.createHandler(action, method);
                }
            }
        }
    },
    
    /**
     * Run any callbacks related to the transaction.
     * @private
     * @param {Ext.direct.Transaction} transaction The transaction
     * @param {Ext.direct.Event} event The event
     */
    runCallback: function(transaction, event) {
        var success, funcName, callback, options, result;
        
        success  = !!event.status;
        funcName = success ? 'success' : 'failure';
        
        if ( transaction && transaction.callback ) {
            callback = transaction.callback;
            options  = transaction.callbackOptions;
            result   = Ext.isDefined(event.result) ? event.result : event.data;
        
            if ( Ext.isFunction(callback) ) {
                callback(result, event, success, options);
            }
            else {
                Ext.callback(callback[funcName], callback.scope, [result, event, success, options]);
                Ext.callback(callback.callback, callback.scope,  [result, event, success, options]);
            }
        }
    },
    
    /**
     * React to the ajax request being completed
     * @private
     */
    onData: function(options, success, response) {
        var me = this;
            
        if ( success ) {
            var events = me.createEvents(response);
            
            for ( var i = 0, len = events.length; i < len; ++i ) {
                var event       = events[i];
                var transaction = me.getTransaction(event);
                
                me.fireEvent('data', me, event);
                
                if ( transaction && me.fireEvent('beforecallback', me, event, transaction) !== false ) {
                    me.runCallback(transaction, event, true);
                    Ext.direct.Manager.removeTransaction(transaction);
                }
            }
        }
        else {
            var transactions = [].concat(options.transaction);
            
            for ( var i = 0, len = transactions.length; i < len; ++i ) {
                var transaction = me.getTransaction( transactions[i] );
                
                if ( transaction && transaction.retryCount < me.maxRetries ) {
                    transaction.retry();
                }
                else {
                    event = new Ext.direct.ExceptionEvent({
                        data:        null,
                        transaction: transaction,
                        code:        Ext.direct.Manager.exceptions.TRANSPORT,
                        message:     'Unable to connect to the server.',
                        xhr:         response
                    });
                    
                    me.fireEvent('data', me, event);
                    
                    if ( transaction && me.fireEvent('beforecallback', me, transaction) !== false ) {
                        me.runCallback(transaction, event, false);
                        Ext.direct.Manager.removeTransaction(transaction);
                    }
                }
            }
        }
    },
    
    /**
     * Configure a direct request
     * @private
     * @param {String} action The action being executed
     * @param {Object} method The being executed
     */
    configureRequest: function(action, method, args){
        var me = this,
            callData, data, callback, scope, opts, transaction,
            params;
        
        callData = method.getCallData(args);
        data     = callData.data;
        callback = callData.callback;
        scope    = callData.scope;
        opts     = callData.options || {};
        
        params = Ext.apply({}, {
            provider:        me,
            args:            args,
            action:          action,
            method:          method.name,
            data:            data,
            callbackOptions: opts,
            callback:        scope && Ext.isFunction(callback) ? Ext.Function.bind(callback, scope)
                    :                                            callback
        });
        
        if ( opts.timeout ) {
            Ext.applyIf(params, {
                timeout: opts.timeout
            });
        };

        transaction = new Ext.direct.Transaction(params);

        if ( me.fireEvent('beforecall', me, transaction, method) !== false ) {
            Ext.direct.Manager.addTransaction(transaction);
            me.queueTransaction(transaction);
            me.fireEvent('call', me, transaction, method);
        };
    },
    
    /**
     * Sends a request to the server
     * @private
     * @param {Object/Array} data The data to send
     */
    sendRequest: function(data) {
        var me = this,
            request, callData, params,
            enableUrlEncode = me.enableUrlEncode;
        
        request = Ext.applyIf({}, {
            url:         me.url,
            callback:    me.onData,
            scope:       me,
            transaction: data,
            timeout:     me.timeout
        });
        
        Ext.applyIf(request, data.options);

        if ( Ext.isArray(data) ) {
            callData = [];
            
            for ( var i = 0, len = data.length; i < len; ++i ) {
                callData.push( me.getCallData(data[i]) );
            };
        } else {
            callData = me.getCallData(data);
        };

        if ( enableUrlEncode ) {
            params = {};
            params[Ext.isString(enableUrlEncode) ? enableUrlEncode : 'data'] = Ext.encode(callData);
            request.params = params;
        } else {
            request.jsonData = callData;
        };
        
        Ext.Ajax.request(request);
    },
    
    /**
     * Add a new transaction to the queue, or bypass queue and run it instantly
     * if transaction has timeout parameter.
     * @private
     * @param {Ext.direct.Transaction} transaction The transaction
     */
    queueTransaction: function(transaction) {
        var me = this;
        
        if ( transaction.form ) {
            me.sendFormRequest(transaction);
            return;
        };
        
        if ( transaction.timeout !== undefined ) {
            me.sendRequest(transaction);
            return;
        };
        
        if ( me.enableBuffer ) {
            me.callBuffer.push(transaction);
        
            if ( !me.callTask ) {
                me.callTask = new Ext.util.DelayedTask(me.combineAndSend, me);
            };
            
            me.callTask.delay(Ext.isNumber(me.enableBuffer) ? me.enableBuffer : 10);
        }
        else {
            me.combineAndSend();
        };
    }
    
});
