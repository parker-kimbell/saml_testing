var saml2 = require('saml2-js');
var https = require('https');
var fs = require('fs');
var express = require('express');
var app = express();

var name_id;
var session_index;

var x509IdP = "MIIC5TCCAc2gAwIBAgIQHMHScLtAPKhNJL8oEadDqDANBgkqhkiG9w0BAQUFADAaMRgwFgYDVQQDEw9PRklTU2lnbmluZ0NlcnQwHhcNMTQwODI3MTM0NTIzWhcNMjAwMjE3MTM0NTIzWjAaMRgwFgYDVQQDEw9PRklTU2lnbmluZ0NlcnQwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC3CUhZzRVxThfD6smcRASzZVN9Itjwvsj+4KyjFqgioTnyc1fo2CszWDOVEP4KJb0Qb7KnDneq3E7yK9uXV9WV7HCyOOtqIxfD4jrGBBy89NmyzFQy7HRumFvSORXOWHmGUK+UT/wyZsYYhq1gAsuuZdrGWVrffaI1Oo+/WpoGh7bhLcHADINiWbHO1YC2YnGgzjlJpWz7fN2bn1oQhBplOHcEOLBl6Kl7Qg447Zl71EVHT1uTmw+uQYp95+23xauZkT6nMl9QgOprqwp71ftB6zqVNyWcswwHNtcLYH86Je7ab1V+SGmqrj7ko/zCUuLpNG4byxPPvKXC9YBX8BPvAgMBAAGjJzAlMBMGA1UdJQQMMAoGCCsGAQUFBwMBMA4GA1UdDwQHAwUAsAAAADANBgkqhkiG9w0BAQUFAAOCAQEAUjysm0FgiYnqvEE7mXPMV5yP3MxQ8hppEgRChSr43WfBrWotEJiAzJLWYJsyHCKyVZakGpVkW2GqqzClicnrldJAlUUl89ZLoUlQeGjEK+dKbeERWrOqwsjt8xG1acaupcuCOYAdwTC58Hfg+f+yZKW6cPR+VdBFssPsvv5VRt/3SfrtBv23f9J971NHCsVY+DR03qlfaVAktAJsh2rGCNLpCKCeN/TFANSMtF46otIRTa4jbS0OFiBBnWo5lL9ovpnFraDGQ9fCYzUkfd02BSj6ZLgJeqQPL99uxI/VO53HYx7xABM9yxyOQDY7PGJRvaEtC/8UZ7KC4bSzQhxXnw==";
var thumbprint = "2EE148D651630AACC591C806B5A5370090671F5A"

var options = {
    key: fs.readFileSync('./ssl/server.key'),
    cert: fs.readFileSync('./ssl/server.crt'),
    requestCert: true,
    rejectUnauthorized: false
};

// Create service provider
var sp_options = {
  entity_id: "gotopwc://",
  private_key: fs.readFileSync("./ssl/server.key").toString(),
  certificate: fs.readFileSync("./ssl/server.crt").toString(),
  assert_endpoint: "https://475ee218.ngrok.io/assert"
};
var sp = new saml2.ServiceProvider(sp_options);

// Create identity provider
var idp_options = {
  sso_login_url: "https://fedsvc-stage.pwc.com/ofiss/",
  sso_logout_url: "https://fedsvc-stage.pwc.com/ofiss/",
  certificates: [x509IdP, thumbprint]
};
var idp = new saml2.IdentityProvider(idp_options);

// ------ Define express endpoints ------

// Endpoint to retrieve metadata
app.get("/metadata_downstr3am_uniq.xml", function(req, res) {
  res.type('application/xml');
  res.send(sp.create_metadata());
});

// Starting point for login
app.get("/login", function(req, res) {
  console.log('hitting login')
  sp.create_login_request_url(idp, {}, function(err, login_url, request_id) {
    if (err != null)
      return res.send(500);
    console.log('login_url', login_url, 'request_id', request_id)
    res.redirect(login_url);
  });
});

// Assert endpoint for when login completes
app.post("/assert", function(req, res) {
  console.log('hitting assert')
  var options = {request_body: req.body};
  sp.post_assert(idp, options, function(err, saml_response) {
    if (err != null)
      return res.send(500);

    // Save name_id and session_index for logout
    // Note:  In practice these should be saved in the user session, not globally.
    name_id = saml_response.user.name_id;
    session_index = saml_response.user.session_index;

    res.send("Hello #{saml_response.user.name_id}!");
  });
});

// Starting point for logout
app.get("/logout", function(req, res) {
  console.log('hitting logout')
  var options = {
    name_id: name_id,
    session_index: session_index
  };

  sp.create_logout_request_url(idp, options, function(err, logout_url) {
    if (err != null)
      return res.send(500);
    res.redirect(logout_url);
  });
});

app.listen(3000, function() {
  console.log('listening 3000')
});

// var server = https.createServer(options, app).listen(3000, function() {
//   console.log('listening on 3000');
// })
