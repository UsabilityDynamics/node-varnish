/**
 *
 *
 * DEBUG=varnish node examples/start
 *
 * supervisor --no-restart-on exit --watch lib,examples --quiet --harmony -- examples/start
 * DEBUG=varnish node examples/start
 */

var varnish = require( '../' );
//var express = require( 'express' );

varnish.discover( function discoverVarnish( err, servers ) {

  console.log( 'Found %d server(s).', servers && servers.length ? servers.length : 0 );

  if( servers && servers.length ) {

    servers.forEach( function( server ) {
      console.log( 'Killing [pid=%d]', server.pid );
      process.kill( server.pid );
    } );

  }

  // startBackend( 3000 );

  startVarnish();

} );

/**
 * Start Express Backend Server
 *
 * @param port
 * @param callback
 * @returns {*}
 */
function startBackend( port, callback ) {

  var app = express();

  app.use( function( req, res ) {

    res.json({
      ok: true,
      message:  'Fake express app is online.',
      port: port,
      headers: req.headers
    });

  });

  app.listen( port, 'localhost', function() {
    console.log( 'fake express app ready on', this.address() );

    if( 'function' === typeof callback ) {
      callback.call( app, null, this );
    }

  });

  return app;
}

/**
 * Add New Backend
 *
 * Not implemented...
 *
 * @param error
 * @param server
 */
function addBackend( error, server ) {

  var _admin = new varnish.Admin( 'localhost', 4242 );

  _admin.on( 'connect', function() {
    // console.log( 'connected' );
  });

  _admin.on( 'error', function() {} );

  _admin.list(function(err, list){
    // console.log(list);
  });

  // console.log( 'target', server );
}

/**
 * Start Varnish
 *
 * @returns {*}
 */
function startVarnish() {
  console.log( 'Creating new Varnish server...' );

  var server = varnish.create({
    listen: ':9000',
    ttl: 900,
    management: 'localhost:4242',
    workers: '2,500,300',
    id: 'test-varnish',
    storage: 'malloc',
    shmlog: '200M',
    name: 'test-varnish',
    vcl: require( 'path' ).join( __dirname, '../static/example-vcl.vcl' )
  });

  server.param('max_restarts', 10);

  server.start(function(error, server) {

    if( error && error.message ) {
      console.error( 'Unable to connect to Varnish: ' + error.message );
      process.exit();
    }

    console.log( 'Varnish Server started using %d.', server.pid );

    process.on( 'exit', function( code ) {
      console.log( 'Killing varnish...' );
      process.kill( server.pid );
      process.exit();
    });

    // startBackend( 3010, addBackend );
    // startBackend( 3020, addBackend );

  });

  return server;
}