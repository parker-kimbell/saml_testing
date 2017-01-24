var saml2 = require('saml2-js');
var https = require('https');
var fs = require('fs');
var express = require('express');
var app = express();

var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var multer = require('multer'); // v1.0.5
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(cookieParser());

var name_id;
var session_index;

var x509IdP = "MIIC5TCCAc2gAwIBAgIQHMHScLtAPKhNJL8oEadDqDANBgkqhkiG9w0BAQUFADAaMRgwFgYDVQQDEw9PRklTU2lnbmluZ0NlcnQwHhcNMTQwODI3MTM0NTIzWhcNMjAwMjE3MTM0NTIzWjAaMRgwFgYDVQQDEw9PRklTU2lnbmluZ0NlcnQwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC3CUhZzRVxThfD6smcRASzZVN9Itjwvsj+4KyjFqgioTnyc1fo2CszWDOVEP4KJb0Qb7KnDneq3E7yK9uXV9WV7HCyOOtqIxfD4jrGBBy89NmyzFQy7HRumFvSORXOWHmGUK+UT/wyZsYYhq1gAsuuZdrGWVrffaI1Oo+/WpoGh7bhLcHADINiWbHO1YC2YnGgzjlJpWz7fN2bn1oQhBplOHcEOLBl6Kl7Qg447Zl71EVHT1uTmw+uQYp95+23xauZkT6nMl9QgOprqwp71ftB6zqVNyWcswwHNtcLYH86Je7ab1V+SGmqrj7ko/zCUuLpNG4byxPPvKXC9YBX8BPvAgMBAAGjJzAlMBMGA1UdJQQMMAoGCCsGAQUFBwMBMA4GA1UdDwQHAwUAsAAAADANBgkqhkiG9w0BAQUFAAOCAQEAUjysm0FgiYnqvEE7mXPMV5yP3MxQ8hppEgRChSr43WfBrWotEJiAzJLWYJsyHCKyVZakGpVkW2GqqzClicnrldJAlUUl89ZLoUlQeGjEK+dKbeERWrOqwsjt8xG1acaupcuCOYAdwTC58Hfg+f+yZKW6cPR+VdBFssPsvv5VRt/3SfrtBv23f9J971NHCsVY+DR03qlfaVAktAJsh2rGCNLpCKCeN/TFANSMtF46otIRTa4jbS0OFiBBnWo5lL9ovpnFraDGQ9fCYzUkfd02BSj6ZLgJeqQPL99uxI/VO53HYx7xABM9yxyOQDY7PGJRvaEtC/8UZ7KC4bSzQhxXnw==";
// var thumbprint = "2EE148D651630AACC591C806B5A5370090671F5A"

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
  assert_endpoint: "https://c832b6dc.ngrok.io/assert",
  allow_unencrypted_assertion: true
};
var sp = new saml2.ServiceProvider(sp_options);

// Create identity provider
var idp_options = {
  sso_login_url: "https://fedsvc-stage.pwc.com/ofiss/",
  sso_logout_url: "https://fedsvc-stage.pwc.com/ofiss/",
  certificates: [x509IdP]
};
var idp = new saml2.IdentityProvider(idp_options);

// ------ Define express endpoints ------

// Endpoint to retrieve metadata
app.get("/metadata_downstr3am_uniq.xml", function(req, res) {
  res.type('application/xml');
  res.send(sp.create_metadata());
});

var counter = 0;

// Starting point for login
app.get("/login", function(req, res) {

  console.log('hitting login')
  console.dir(req.cookies)
  console.dir(req.signedCookies)
  console.dir(req.body)
  console.dir(req.query)
  console.dir(req.headers)
  console.log(req.protocol + '://' + req.get('host') + req.originalUrl)
  console.log(req.url)
  console.log('\n\n\n\n\n\n-----------------------')
  if (counter % 2 === 0) {
    counter += 1;
    sp.create_login_request_url(idp, {}, function(err, login_url, request_id) {
      if (err != null)
        return res.send(500);
      res.redirect(login_url);
    });
  } else {
    res.set('Content-Type', 'application/json');
    res.set("Access-Control-Allow-Origin" , "*")
    let expiration = new Date(Date.now() + 9000000);
    res.cookie("SMSESSION", session_index, {
      httpOnly: true,
      expires: expiration, //Controls when this cookie will expire. When it does expire, we'll need to re-authenticate
      path: "/",
      secure: true,
      domain: ".io"
    });

    res.cookie("CMSSESSION", session_index, {
      httpOnly: true,
      expires: expiration, //Controls when this cookie will expire. When it does expire, we'll need to re-authenticate
      path: "/",
      secure: true,
      domain: ".io"
    });

    res.cookie("SMTRYNO", "", {
      httpOnly: true,
      expires: expiration, //Controls when this cookie will expire. When it does expire, we'll need to re-authenticate
      path: "/",
      secure: true,
      domain: ".io"
    });

    res.cookie("SMCHALLENGE", "SSL_CHALLENGE_DONE", {
      httpOnly: true,
      expires: expiration, //Controls when this cookie will expire. When it does expire, we'll need to re-authenticate
      path: "/",
      secure: true,
      domain: ".io"
    });
    res.status(200).send(JSON.stringify({"LOS":"","COUNTRY":"AU","STAFFCLASS":"","GUID":"gsixteen001","OFFICECODE":"","PPID":"1005035501","EMAIL":"google.test.sixteen@au.pwc.com","SAPID":""}))
  }

});

// Assert endpoint for when login completes
app.post("/assert", function(req, res) {
  console.log('hitting assert')
  var options = {request_body: req.body};
  // console.log(req.body)
  // console.log(req.headers)
  // console.log('\n\n\n\n\n\n-----------------------')
  sp.post_assert(idp, options, function(err, saml_response) {
    // console.log(idp)
    // console.log(options)
    // console.log(err)
    console.log(saml_response)
    if (err != null)
      return res.send(500);
    res.set('Content-Type', 'application/json');
    // Save name_id and session_index for logout
    // Note:  In practice these should be saved in the user session, not globally.
    name_id = saml_response.user.name_id;
    session_index = saml_response.user.session_index; // This value is also used to log users out
    //debugger;
    let expiration = new Date(Date.now() + 900000);
    //All res.cookie() does is set the HTTP Set-Cookie header with the options provided. Any option not specified defaults to the value stated in RFC 6265.
    res.cookie("SMSESSION", session_index, {
      httpOnly: true,
      expires: expiration, //Controls when this cookie will expire. When it does expire, we'll need to re-authenticate
      path: "/",
      secure: false,
    });

    res.cookie("SMTRYNO", "", {
      httpOnly: true,
      expires: expiration, //Controls when this cookie will expire. When it does expire, we'll need to re-authenticate
      path: "/",
      secure: false,
    });

    res.cookie("CMSSESSION", session_index, {
      httpOnly: true,
      expires: expiration, //Controls when this cookie will expire. When it does expire, we'll need to re-authenticate
      path: "/",
      secure: true,
    });

    res.cookie("SMCHALLENGE", "SSL_CHALLENGE_DONE", {
      httpOnly: true,
      expires: expiration, //Controls when this cookie will expire. When it does expire, we'll need to re-authenticate
      path: "/",
      secure: false,
    });
    // res.cookie("SMCHALLENGE", "", {
    //   httpOnly: true,
    //   expires: expiration, //Controls when this cookie will expire. When it does expire, we'll need to re-authenticate
    //   path: "/",
    //   secure: true,
    //   domain: ".pwcinternal.com"
    // });
    res.set({
      //"Transfer-Encoding" : "Identity",
      //"Content-Language" : "en-US",
      //Connection : "Keep-Alive",
      //"Keep-Alive" : "timeout=15, max=49999",
      "Content-Security-Policy" : "default-src 'self' 'unsafe-inline' 'unsafe-eval' ; frame-ancestors https://*.ngrok.io; http://*.pwc.com http://*.pwcinternal.com http://*.optimalidm.com http://*.pwcmlp.com http://*.dallasmlp.com http://*.pwctrack.com pwc-spark.com sparkpwc.com http://*.pwc-spark.com http://*.kaltura.com http://*.akamaihd.net https://*.pwc.com https://*.pwcinternal.com https://*.optimalidm.com https://*.pwcmlp.com https://*.dallasmlp.com https://*.pwctrack.com https://*.pwc-spark.com https://*.kaltura.com https://*.akamaihd.net https://*.csod.com;",
      "Cache-Control" : "no-store,no-store",
      "Content-Length" : 0,
      "Access-Control-Allow-Origin" : "*",
      //"Location" : "https://c832b6dc.ngrok.io/test",
      "Server" : "",
      "Strict-Transport-Security" : "max-age=31536000",
      "X-Content-Security-Policy" : "default-src 'self' 'unsafe-inline' 'unsafe-eval' ; frame-ancestors https://*.ngrok.io; http://*.pwc.com http://*.pwcinternal.com http://*.optimalidm.com http://*.pwcmlp.com http://*.dallasmlp.com http://*.pwctrack.com pwc-spark.com sparkpwc.com http://*.pwc-spark.com http://*.kaltura.com http://*.akamaihd.net https://*.pwc.com https://*.pwcinternal.com https://*.optimalidm.com https://*.pwcmlp.com https://*.dallasmlp.com https://*.pwctrack.com https://*.pwc-spark.com https://*.kaltura.com https://*.akamaihd.net https://*.csod.com;"
    });

    console.log('sending headers', res._headers)
    console.log('sending cookies', res._cookies)
    res.redirect("https://c832b6dc.ngrok.io/login")
    //res.status(200).send(JSON.stringify({ value: "Hello " + saml_response.user.name_id + "!" }));
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
    console.log('sending redirect to logout url')
    res.redirect(logout_url);
  });
});

app.listen(3000, function() {
  console.log('listening 3000@@@@')
});

// var server = https.createServer(options, app).listen(3000, function() {
//   console.log('listening on 3000');
// })
