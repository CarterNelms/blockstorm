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

exports.play = (req, res)=>{
  res.render('games/play');
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