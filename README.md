# Express SAML Implementation

## To run
1. ```npm install```
2. ```node saml.js```
3. Replace current ngrok.io paths with a server that can receive https traffic

This is currently using https://ngrok.com/ to handle HTTPS traffic coming its way, so any ```ngrok.io``` URLs within will need to be updated to the CMS addresses. It will, in its current state, redirect any traffic to the instance running on Parker's machine.

Documentation is in the code. You'll need to be on the PwC VPN, but authentication can be performed via web browser at https://c832b6dc.ngrok.io/login if you want to walk through what it looks like from a user perspective.

## Routes
* GET /login -- kicks off the authentication chain.
* POST /assert -- The end of the authentication chain. This will receive the authentication token from IdM.
* GET /logout -- logs a user out.

