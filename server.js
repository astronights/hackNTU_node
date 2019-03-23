// server.js
// where your node app starts

// init project
const routes = require('./routes.js');
//const auth = require('./auth.js');
//const user = require('./models/User.js');
//const word = require('./models/Word.js');
// init project
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const cors = require('cors');
const app = express();

app.use(cors());

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(bodyParser.json());
// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
mongoose.connect(process.env.DATABASE, { useNewUrlParser: true }, function (err, db) {
 
   if (err) throw err;
 
   console.log('Successfully connected');
    routes(app, db);
 
});
// listen for requests :)
const listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});
