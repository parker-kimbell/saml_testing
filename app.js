var https = require('https');
var fs = require('fs');
var express = require('express');
var app = express()
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var multer = require('multer'); // v1.0.5
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(cookieParser());

// var options = {
//     key: fs.readFileSync('./ssl/server.key'),
//     cert: fs.readFileSync('./ssl/server.crt'),
//     requestCert: true,
//     rejectUnauthorized: false
// };

var counter = 0;

app.get('/', function (req, res) {
  console.log('getting touched GET ')
  res.set('Content-Type', 'application/json');
  console.dir(req.cookies)
  console.dir(req.signedCookies)
  console.dir(req.body)
  console.dir(req.query)
  console.dir(req.headers)
  console.log(req.protocol + '://' + req.get('host') + req.originalUrl)
  console.log(req.url)
  res.send(JSON.stringify({ value: "Hello, World!" }))
})

app.post('/post', function (req, res) {
  console.log('getting touched POST ')
  res.set('Content-Type', 'application/json');
  console.dir(req.cookies)
  console.dir(req.signedCookies)
  console.dir(req.body)
  console.dir(req.query)
  console.dir(req.headers)
  console.log(req.protocol + '://' + req.get('host') + req.originalUrl)
  console.log(req.url)
  res.send(JSON.stringify({ value: "Hello, World!" }))

})

app.listen(3000, function() {
  console.log('listening 3000')
})

// var server = https.createServer(options, app).listen(3000, function() {
//   console.log('listening on 3000');
// })
