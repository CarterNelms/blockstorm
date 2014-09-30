/* jshint unused: false */

'use strict';

var traceur = require('traceur');
var Game = traceur.require(__dirname + '/../models/game.js');
var User = traceur.require(__dirname + '/../models/user.js');

exports.index = (req, res)=>{
  Game.findAllOpen(games=>
  {
    var users = [];
    var userCount = games.length;
    if(games.length)
    {
      games.forEach(game=>
      {
        User.findById(game.hostId, user=>
        {
          console.log(userCount);
          users.push(user);
          if(!(--userCount))
          {
            res.render('games/index', {games: games, users: users});
          }
        });
      });
    }
    else
    {
      res.render('games/index', {games: games, users: users});
    }
  });
};

exports.tutorial = (req, res)=>{
  res.render('games/tutorial');
};

exports.play = (req, res)=>
{
  if(res.locals.user)
  {
    var gameId = req.params.gameId;
    Game.findById(gameId, game=>
    {
      if(game)
      {
        var userId = res.locals.user._id;
        if(game.isUserInGame(userId))
        {
          res.render('games/play', {game: game});
        }
        else
        {
          req.flash('message', "Sorry, you are not in that game.");
          res.redirect('/games');
        }
      }
      else
      {
        req.flash("message", "Sorry, that game has ended.");
        res.redirect('/games');
      }
    });
  }
  else
  {
    req.flash('message', "You must be logged in to play.");
    res.redirect('/games');
  }
};

exports.create = (req, res)=>
{
  Game.create(req.body, game=>
  {
    if(game)
    {
      res.redirect(`/games/${game._id}`);
    }
    else
    {
      res.redirect('/games');
    }
  });
};

exports.join = (req, res)=>
{
  if(res.locals.user)
  {
    var gameId = req.params.gameId;
    Game.findById(gameId, game=>
    {
      if(game)
      {
        var userId = res.locals.user._id;
        game.join(userId, game=>
        {
          res.redirect(`/games/${game._id}`);
        });
      }
      else
      {
        res.redirect('/games');
      }
    });
  }
  else
  {
    res.redirect('/login');
  }
};

exports.cleanup = (req, res, next)=>
{
  if(res.locals.user && req.url.indexOf('/js/') === -1 && req.url.indexOf('/assets/') === -1)
  {
    var userId = res.locals.user._id;
    Game.findByPlayerId(userId, game=>
    {
      if(game)
      {
        game.quit(userId, next);
      }
      else
      {
        next();
      }
    });
  }
  else
  {
    next();
  }
};