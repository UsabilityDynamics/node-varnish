var Admin = require('./admin')
  , Server = require('./server')
  , Vcl = require('./vcl')
  , ps = require('./util/ps')
  , async = require('async')
  , debug = require( 'debug' )( 'varnish' )
  , util = require('./util');

exports.Admin = Admin;

exports.Server = Server;

exports.Vcl = Vcl;

/**
 *
 * @author potanin@UD
 * @param options
 * @returns {Server}
 */
exports.create = function( options ) {
  debug( 'varnish.create()' );

  var _server = new Server();

  if( 'object' === typeof options ) {
    for( var _key in options ) {
      if( 'function' === typeof _server[ _key ] ) {
        _server[ _key ]( options[ _key ] );
      }
    }
  }

  return _server;
}

exports.get = function(opt, fn){


};


/**
 * Finds All running instances of varnish.
 */
exports.discover = function(fn){
  debug( 'varnish.discover()', 'asdfasfd' );

  var cmd = 'varnishd';

  ps.find(cmd, function(err, result, options){

    if(err) return fn(err);

    var result = result.map(function(line){
        return util.merge(line, Server.parse(line.args));
      });


    var reduced = result.reduce(function(prev, curr, idx, arr){
      if(prev[curr.args]){
        if(curr.pid == prev[curr.args].ppid){
          curr.child = prev[curr.args].pid;
          prev[curr.args] = curr;
        } else if(curr.ppid == prev[curr.args].pid){
          prev[curr.args].child = curr.pid;
        } else {
          prev[curr.args] = curr;
        }
      } else prev[curr.args] = curr;
      return prev;
    }, {});

    var servers =
      Object.keys(reduced).map(function(key){
        return new Server(reduced[key]);
      });

    return fn(null, servers);

  });

}
