var saml2 = require('saml2-js');
var https = require('https');
var fs = require('fs');
var express = require('express');
var app = express();

var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var multer = require('multer');
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded. You'll need something along these lines to handle calls to the "assert" endpoint.
app.use(cookieParser());

// Basic session management. Key is the session value, value is the user name associated with that session.
var sessions = {};

// This is the public key of the SAML service we're using. This is the key for the IdM Staging server, but it will need to change for production.
// This will be used to verify the signature from IdM in the "assert" endpoint below so that we know it came from them.
var x509IdP = "MIIC5TCCAc2gAwIBAgIQHMHScLtAPKhNJL8oEadDqDANBgkqhkiG9w0BAQUFADAaMRgwFgYDVQQDEw9PRklTU2lnbmluZ0NlcnQwHhcNMTQwODI3MTM0NTIzWhcNMjAwMjE3MTM0NTIzWjAaMRgwFgYDVQQDEw9PRklTU2lnbmluZ0NlcnQwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC3CUhZzRVxThfD6smcRASzZVN9Itjwvsj+4KyjFqgioTnyc1fo2CszWDOVEP4KJb0Qb7KnDneq3E7yK9uXV9WV7HCyOOtqIxfD4jrGBBy89NmyzFQy7HRumFvSORXOWHmGUK+UT/wyZsYYhq1gAsuuZdrGWVrffaI1Oo+/WpoGh7bhLcHADINiWbHO1YC2YnGgzjlJpWz7fN2bn1oQhBplOHcEOLBl6Kl7Qg447Zl71EVHT1uTmw+uQYp95+23xauZkT6nMl9QgOprqwp71ftB6zqVNyWcswwHNtcLYH86Je7ab1V+SGmqrj7ko/zCUuLpNG4byxPPvKXC9YBX8BPvAgMBAAGjJzAlMBMGA1UdJQQMMAoGCCsGAQUFBwMBMA4GA1UdDwQHAwUAsAAAADANBgkqhkiG9w0BAQUFAAOCAQEAUjysm0FgiYnqvEE7mXPMV5yP3MxQ8hppEgRChSr43WfBrWotEJiAzJLWYJsyHCKyVZakGpVkW2GqqzClicnrldJAlUUl89ZLoUlQeGjEK+dKbeERWrOqwsjt8xG1acaupcuCOYAdwTC58Hfg+f+yZKW6cPR+VdBFssPsvv5VRt/3SfrtBv23f9J971NHCsVY+DR03qlfaVAktAJsh2rGCNLpCKCeN/TFANSMtF46otIRTa4jbS0OFiBBnWo5lL9ovpnFraDGQ9fCYzUkfd02BSj6ZLgJeqQPL99uxI/VO53HYx7xABM9yxyOQDY7PGJRvaEtC/8UZ7KC4bSzQhxXnw==";

// The configuration options for the service provider (in this case the CMS)
var sp_options = {
  entity_id: "gotopwc://", // This is the unique identifier that IdM will look for to know that a user is authenticating using the mobile app. This value must remain the same.
  private_key: fs.readFileSync("./ssl/server.key").toString(), // The private SSL key for the server this is deployed on.
  certificate: fs.readFileSync("./ssl/server.crt").toString(), // The certificate for the server this is deployed on.
  assert_endpoint: "https://c832b6dc.ngrok.io/assert", // This is the endpoint that will be called by the mobile app as the final step of authentication. It must receive a POST and be able to handle URL encoded data. This should be the CMS URL.
  allow_unencrypted_assertion: true // The authentication response we're getting from IdM is not encrypted (which is not recommended by the SAML spec but that's out of our control).
                                    // Most libraries won't expect this (this one didn't) so you'll probably need to set this to "true" in whatever library ends up being used.
};
var sp = new saml2.ServiceProvider(sp_options);

// The configuration options that the CMS will need to make calls to IdM
var idp_options = {
  sso_login_url: "https://fedsvc-stage.pwc.com/ofiss/", // This is the IdM URL we'll redirect the user to from a login. The package I'm using is handling formatting the call. This value will change between staging and production.
  sso_logout_url: "https://fedsvc-stage.pwc.com/ofiss/", // URL for logouts. This will change between staging and production.
  certificates: [x509IdP] // Setting the public key the CMS will use to decrypt/verify responses from IdM.
};

// Initialize the code that will build calls to IdM based on the idp_options we set above.
var idp = new saml2.IdentityProvider(idp_options);

// Endpoint to retrieve metadata for others who want to use our SAML service.
// This is not a requirement, but it should be there as it is part of the SAML specification.
app.get("/metadata.xml", function(req, res) {
  res.type('application/xml');
  res.send(sp.create_metadata());
});

// The login path. This must accept a GET request.
app.get("/login", function(req, res) {

  // Generate our SAML authentication request based on the configuration above
  sp.create_login_request_url(idp, {}, function(err, login_url, request_id) {
    if (err != null)
      return res.send(500);
    // The login endpoint must respond with a redirect (302 code) to the IdM endpoint.
    res.redirect(login_url);
  });

});

// An example endpoint I was using as an example of what I would think calls to the existing CMS endpoints would look like.
app.get("/exampleEndpoint", function(req, res) {

  console.log('hitting exampleEndpoint')
  console.log(req.cookies);
  console.log(req.headers);

  let sessionKey = req.cookies['CMSSESSION'];
  if (sessions[sessionKey] !== undefined) { // Case: the user is authenticated based on their session token. Send along the data they've requested.
    let callingUser = sessions[sessionKey];
    res.send('Success for' + callingUser);
  } else { // Case: the user is not authenticated. Return an unauthorized code. I'm assuming this will never happen with how we're planning to manage state on the device.
    res.sendStatus(401);
  }


});

// Assert endpoint for when login completes. This must accept a POST which will originate from the mobile device. It must also be able to parse URL encoded data.
/* Example request headers

{ host: 'c832b6dc.ngrok.io',
  'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'x-username': 'google.test.sixteen@au.pwc.com',
  accept: '* / *',
  'user-agent': 'test_app/1 CFNetwork/808.2.16 Darwin/16.3.0',
  'accept-language': 'en-us',
  'accept-encoding': 'gzip, deflate',
  'content-length': '6473',
  'x-forwarded-proto': 'https',
  'x-forwarded-for': '107.0.84.30' }

*/
app.post("/assert", function(req, res) {
  console.log('hitting assert');
  console.log(req.headers);
  console.log(req.cookies);
  // The request body contains
  var options = {request_body: req.body};
  sp.post_assert(idp, options, function(err, saml_response) {
    console.log(saml_response);
    if (err != null) {
      console.log(err)
      return res.sendStatus(500);
    }

    // The assertion endpoint (the endpoint where authentication ends) must respond with JSON.
    // This sets that header.
    res.set('Content-Type', 'application/json');

    // This is the session identifier that IdM will use to log a user out. I'm using it as a session token for this
    // example server, but that's not a requirement. Though this will need to be retained for
    let idmSAMLSession = saml_response.user.session_index;
    // IdM sends long its unique identifier for the user who has authenticated, which is the users email address.
    let userEmail = saml_response.user.name_id;

    // IdM has authenticated the user, so store their session so we can manage it ourselves from this point.
    sessions[idmSAMLSession] = userEmail;

    // Set the expiration date for the session cookie. We have total control over when this is.
    let expiration = new Date(Date.now() + 500000);

    // This is the cookie we use to manage the user session post-authentication. It can be called whatever you would like.
    // We also have the ability to manage the expiration at our discretion
    res.cookie("CMSSESSION", idmSAMLSession, {
      httpOnly: true,
      expires: expiration,
      path: "/",
      secure: true,
    });

    /* The assertion URL (the endpoint where authentication ends) must return a response with
      1. a 200 code,
      2. a 'Content-Type'= 'application/json' header,
      3. a valid JSON body.
    */
    res.status(200).send(JSON.stringify({ value: "Hello " + saml_response.user.name_id + "!" }));

  });
});

// The URL for logging out a user.
// Requests for this URL will contain the session cookie set in the assert endpoint
// which can be used to clear a user session on the CMS.
// Additionally, a call can be made to the logout URL of IdM to log the user out on their systems.
app.get("/logout", function(req, res) {
  console.log('hitting logout');
  console.log(req.cookies);

  // Here we're retrieving the sessions user information for a logout call to IdM
  let sessionKey = req.cookies['CMSSESSION'];
  let userName = sessions[sessionKey];

  // Setting the options we'll need to generate our SAML logout request
  var options = {
    name_id: userName,
    session_index: sessionKey
  };

  // Generate a SAML logout request based on our IdM configuration and the user session options set above
  sp.create_logout_request_url(idp, options, function(err, logout_url) {
    if (err != null)
      return res.sendStatus(500);
    // There were no problem generating our logout request, so clear the user session on the CMS.
    delete sessions[sessionKey];
    // Redirect the user to the IdM logout URL so that IdM can log the user out on their systems.
    // The CMS will not receive a callback upon a successful logout. It is assumed that it succeeded.
    res.redirect(logout_url);
  });
});

app.listen(3000, function() {
  console.log('listening 3000')
});
