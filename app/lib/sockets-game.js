'use strict';

var Cookies = require('cookies');
var traceur = require('traceur');
var User;
var Game;
var users = {};

exports.connection = function(socket)
{
  if(global.nss)
  {
    User = traceur.require(__dirname + '/../models/user.js');
    Game = traceur.require(__dirname + '/../models/game.js');
    addUserToSocket(socket);
    socket.on('quit', quit);
  }
};

exports.disconnect = function(socket)
{
  removeUserFromSocket(socket);
};

function quit(data)
{
  var socket = this;
  removeUserFromSocket(socket);

  var userId = data.userId;
  Game.findByPlayerId(userId, game=>
  {
    if(game)
    {
      var partnerId = game.partnerId(userId);
      game.quit(userId, game=>
      {
        if(game)
        {
          broadcastPlayer(partnerId, 'quit');
        }
        else
        {
          broadcastPlayer(partnerId, 'ended');
        }
      });
    }
  });
}

function addUserToSocket(socket)
{
  var cookies = new Cookies(socket.handshake, {}, ['SEC123', '321CES']);
  var encoded = cookies.get('express:sess');
  var decoded;

  if(encoded)
  {
    decoded = decode(encoded);
    var userId = decoded.userId;
    User.findById(userId, user=>
    {
      if(user)
      {
        users[userId] = {
          user: user,
          socket: socket
        };
        socket.nss = {};
        socket.nss.user = user;
        Game.findByPlayerId(userId, game=>
        {
          if(game)
          {
            broadcastGame(game, 'joined', {isReadyToPlay: game.isReadyToPlay});
          }
        });
      }
    });
  }
}

function removeUserFromSocket(socket)
{
  var cookies = new Cookies(socket.handshake, {}, ['SEC123', '321CES']);
  var encoded = cookies.get('express:sess');
  var decoded;

  if(encoded)
  {
    decoded = decode(encoded);
    var userId = decoded.userId;
    users[userId] = null;
  }
}

function decode(string)
{
  var body = new Buffer(string, 'base64').toString('utf8');
  return JSON.parse(body);
}

function broadcastGame(identifyer, msg, obj)
{
  if(identifyer instanceof Game)
  {
    emitToPlayers(identifyer);
  }
  else
  {
    Game.findByIdOrPlayerId(identifyer, game=>
    {
      if(game)
      {
        emitToPlayers(game);
      }
    });
  }

  function emitToPlayers(game)
  {
    for(var playerId in game.players)
    {
      var user = users[game.players[playerId.toString()]];
      if(user)
      {
        user.socket.emit(msg, obj);
      }
    }
  }
}

function broadcastPlayer(id, msg='message', obj={})
{
  var user = users[id.toString()];
  if(user)
  {
    user.socket.emit(msg, obj);
  }
}