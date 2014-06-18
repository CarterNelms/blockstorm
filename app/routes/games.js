/* jshint unused: false */

'use strict';

var traceur = require('traceur');
var Game = traceur.require(__dirname + '/../models/game.js');

exports.index = (req, res)=>{
  Game.findAllOpen(games=>
  {
    res.render('games/index', {games: games});
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
          res.redirect('/games');
        }
      }
      else
      {
        res.redirect('/games');
      }
    });
  }
  else
  {
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
        res.redirect('/game');
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
  if(res.locals.user && req.url.indexOf('/js/') === -1)
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