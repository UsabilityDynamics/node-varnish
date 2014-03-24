var varnish = require('../')
  , async = require('async');

varnish.discover(function(err, servers){
  if(err) return console.log('discovery failed');

  // console.log( 'servers', servers );

  async.map(servers, health, function(err, results){

    if(err) console.log('something is wrong');

    if( !err && ( !results ) ) {
      console.log('no error, but no results');
    }

    if( !err && results ) {
      console.log( 'all good, results:', results);
    }

  });

  function health(server, cb){
    var admin = server.admin();

    //console.log( 'server', server );
    admin.backend(function(err, backends){

      admin.destroy();
      if(err) return cb(err);

      var isHealthy = backends.every(function(backend){
        return (!!~backend.status.indexOf('Healthy'));
      });

      if(isHealthy) return cb(null);

      return cb(new Error('Not Healthy'), backends);
    });
  }

});