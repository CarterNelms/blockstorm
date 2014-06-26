'use strict';

var traceur = require('traceur');
var dbg = traceur.require(__dirname + '/route-debugger.js');
var initialized = false;

module.exports = (req, res, next)=>{
  if(!initialized){
    initialized = true;
    load(req.app, next);
  }else{
    next();
  }
};

function load(app, fn)
{
  var home = traceur.require(__dirname + '/../routes/home.js');
  var users = traceur.require(__dirname + '/../routes/users.js');
  var games = traceur.require(__dirname + '/../routes/games.js');

  app.all('*', users.lookup);

  app.get('/games/:gameId', dbg, games.play);
  app.post('/games', dbg, games.create);
  app.post('/games/:gameId', dbg, games.join);

  app.all('*', games.cleanup);

  app.get('/games', dbg, games.index);
  app.get('/games/:gameId', dbg, games.play);
  app.post('/games', dbg, games.create);
  app.post('/games/:gameId', dbg, games.join);
  app.get('/tutorial', dbg, games.tutorial);


  app.get('/', dbg, home.index);
  app.get('/about', dbg, home.about);

  app.get('/login', dbg, users.login);
  app.post('/login', dbg, users.authenticate);
  app.post('/logout', dbg, users.logout);
  app.get('/register', dbg, users.register);
  app.post('/register', dbg, users.create);
  app.get('/users', dbg, users.index);
  app.get('/users/:userId/verify', dbg, users.verify);
  app.get('/users/:userId', dbg, users.profile);
  app.post('/users/:userId/score', dbg, users.submitScore);

  console.log('Routes Loaded');
  fn();
}