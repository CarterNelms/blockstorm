'use strict';

var dbname = process.env.DBNAME || 'default-db';
var port = process.env.PORT || 4000;

var traceur        = require('traceur');
var express        = require('express');
var less           = require('express-less');
var morgan         = require('morgan');
var bodyParser     = require('body-parser');
var methodOverride = require('method-override');
var cookieSession  = require('cookie-session');
var flash          = require('express-flash');
var initMongo      = traceur.require(__dirname + '/lib/init-mongo.js');
var initRoutes     = traceur.require(__dirname + '/lib/init-routes.js');

/* --- configuration    */
var app = express();
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

/* --- pipeline         */
app.use(initMongo);
app.use(initRoutes);
app.use(morgan({format: 'dev'}));
app.use(express.static(__dirname + '/static'));
app.use('/less', less(__dirname + '/less'));
app.use(bodyParser());
app.use(methodOverride());
app.use(cookieSession({keys:['SEC123', '321CES']}));
app.use(flash());

/* --- http server      */
var server = require('http').createServer(app);
server.listen(port, function(){
  console.log('Node server listening. Port: ' + port + ', Database: ' + dbname);
});

/* --- socket.io        */
var sockets = traceur.require(__dirname + '/lib/sockets.js');
var socketsTutorial = traceur.require(__dirname + '/lib/sockets-tutorial.js');
var socketsGame = traceur.require(__dirname + '/lib/sockets-game.js');
var io = require('socket.io')(server);
io.of('/app').on('connection', sockets.connection);
io.of('/game').on('connection', socketsGame.connection);
io.of('/tutorial').on('connection', socketsTutorial.connection);

module.exports = app;
