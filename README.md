Ext.ux.Direct
=============

This class fixes some bugs and deficiencies in original Ext.direct.RemotingProvider.

Main differences:

- Direct namespaces can be nested, i.e. if server side declares a class Foo.Bar.Baz
  with methods foo and bar, resulting stub methods will be Foo.Bar.Baz.foo and
  Foo.Bar.Baz.bar. This behavior is compatible with RPC::ExtDirect; with other
  server side stacks it may or may not work. If not sure, don't declare nested
  namespaces.

- Direct method callback can be canceled by listening to 'beforecallback' events
  and returning false from event handler. This is true for both successful and failed
  calls, i.e. in case of server failures and such.

- Direct method accepts extra options Object as last parameter (after callback and scope),
  this object is applied to resulting Ext.Ajax.request() parameters so it becomes
  possible to set individual timeout and any other Ext.Ajax.request() parameter per
  Direct method call.

- The options object is passed back to the Direct method callback function, so it
  is possible to pass any kind of data from caller to the callback.

- When 'timeout' option is specified, Direct method is dispatched immediately, bypassing
  request queue.

Version 0.99.

Usage: require Ext.ux.direct.RemotingProvider in your Application class.

Tested with:

- MSIE 6+
- Chrome 6+
- Firefox 3.6+
- Opera 11
- Safari 4+

This extension is released under GPL 3.0 license.

Commercial use is permitted to the extent that the code/component(s) do NOT
become part of another Open Source or Commercially licensed development library or toolkit without explicit permission.

Copyright (c) 2011-2012 by Alexander Tokarev, <nohuhu@nohuhu.org>.
