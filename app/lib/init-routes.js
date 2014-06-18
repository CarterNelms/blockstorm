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
  var game = traceur.require(__dirname + '/../routes/game.js');

  app.all('*', users.lookup);

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

  app.get('/games', dbg, game.index);
  app.post('/games', dbg, game.create);
  app.get('/games/:gameId', dbg, game.play);
  app.post('/games/:gameId', dbg, game.join);
  app.get('/games/tutorial', dbg, game.tutorial);

  console.log('Routes Loaded');
  fn();
}