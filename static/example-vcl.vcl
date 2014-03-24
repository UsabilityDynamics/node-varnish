# This is a basic VCL configuration file for varnish. See the vcl(7) main page for details on VCL syntax and semantics.
#
# Default backend definition. Set this to point to your content server.
#
 backend default {
   .host = "127.0.0.1";
   .port = "3000";
   .connect_timeout = 600s;
   .first_byte_timeout = 600s;
   .between_bytes_timeout = 600s;
 }

acl internal {
 "192.10.0.0"/24;
}

# Respond to incoming requests.
sub vcl_recv {

  if (req.request == "GET" && req.url ~ "^/varnishcheck$") {
    error 200 "Varnish is Ready";
  }

  # Allow the backend to serve up stale content if it is responding slowly.
  if (!req.backend.healthy) {
    # Use anonymous, cached pages if all backends are down.
    unset req.http.Cookie;
    if (req.http.X-Forwarded-Proto == "https") {
      set req.http.X-Forwarded-Proto = "http";
    }
    set req.grace = 30m;
  } else {
    set req.grace = 15s;
  }

  # Get ride of progress.js query params
  if (req.url ~ "^/misc/progress\.js\?[0-9]+$") {
    set req.url = "/misc/progress.js";
  }

  # Do not cache these paths.
  if (req.url ~ "^/status\.php$" ||
      req.url ~ "^/update\.php$" ||
      req.url ~ "^/ooyala/ping$" ||
      req.url ~ "^/admin" ||
      req.url ~ "^/admin/.*$" ||
      req.url ~ "^/user" ||
      req.url ~ "^/user/.*$" ||
      req.url ~ "^/users/.*$" ||
      req.url ~ "^/info/.*$" ||
      req.url ~ "^/flag/.*$" ||
      req.url ~ "^.*/ajax/.*$" ||
      req.url ~ "^.*/ahah/.*$") {
    return (pass);
  }

  # Pipe these paths directly to Apache for streaming.
  if (req.url ~ "^/admin/content/backup_migrate/export") {
    return (pipe);
  }

  # Do not allow outside access to cron.php or install.php.
  if (req.url ~ "^/(cron|install)\.php$" && !client.ip ~ internal) {
    error 404 "Page not found.";
  }

  # Always cache the following file types for all users.
  if (req.url ~ "(?i)\.(png|gif|jpeg|jpg|ico|swf|css|js)(\?[a-z0-9]+)?$") {
    unset req.http.Cookie;
  }

  if (req.http.Cookie) {
    unset req.http.Cookie;
  }

  ## From default below ##
  if (req.restarts == 0) {
    if (req.http.x-forwarded-for) {
      set req.http.X-Forwarded-For =
      req.http.X-Forwarded-For + ", " + client.ip;
    } else {
      set req.http.X-Forwarded-For = client.ip;
    }
  }
  if (req.request != "GET" &&
    req.request != "HEAD" &&
    req.request != "PUT" &&
    req.request != "POST" &&
    req.request != "TRACE" &&
    req.request != "OPTIONS" &&
    req.request != "DELETE") {
      /* Non-RFC2616 or CONNECT which is weird. */
      return (pipe);
  }
  if (req.request != "GET" && req.request != "HEAD") {
      /* We only deal with GET and HEAD by default */
      return (pass);
  }
  ## Unset Authorization header if it has the correct details...
  #if (req.http.Authorization == "Basic ") {
  #  unset req.http.Authorization;
  #}
  if (req.http.Authorization || req.http.Cookie) {
      /* Not cacheable by default */
      return (pass);
  }
  return (lookup);
}

# Code determining what to do when serving items from the Apache servers.
sub vcl_fetch {

  # Don't allow static files to set cookies.
  if (req.url ~ "(?i)\.(png|gif|jpeg|jpg|ico|swf|css|js)(\?[a-z0-9]+)?$") {
    # beresp == Back-end response from the web server.
    unset beresp.http.set-cookie;
  }
  else if (beresp.http.Cache-Control) {
    unset beresp.http.Expires;
  }

  if (beresp.status == 301) {
    set beresp.ttl = 1h;
    return(deliver);
  }

  # Allow items to be stale if needed.
  set beresp.grace = 1h;
}

# Set a header to track a cache HIT/MISS.
sub vcl_deliver {

  unset resp.http.Age;
  unset resp.http.Via;

  set resp.http.X-Powered-By = "Express/Varnish";

  if (obj.hits > 0) {
    set resp.http.X-Varnish-Cache = "HIT";
  }
  else {
    set resp.http.X-Varnish-Cache = "MISS";
  }
}

# In the event of an error, show friendlier messages.
sub vcl_error {
  set obj.http.Content-Type = "text/html; charset=utf-8";
  set obj.http.Retry-After = "5";

  synthetic "{ok:true,status:'"+obj.status+"'}";

  return (deliver);
}
