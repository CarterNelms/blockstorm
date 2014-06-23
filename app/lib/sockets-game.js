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
    socket.on('frameData', frameData);
    socket.on('message', handleMessage);
  }
};

exports.disconnect = function(socket)
{
  removeUserFromSocket(socket);
};

function frameData(data)
{
  var socket = this;
  var userId = getUserIdFromCookie(socket);
  Game.findPartnerId(userId, partnerId=>
  {
    var partner = users[partnerId];
    if(partner)
    {
      partner.socket.emit('frameData', data);
    }
  });
}

function handleMessage(msg)
{
  var fn;
  switch(msg)
  {
    case 'quit':
      fn = quit;
      break;
    case 'dead':
      fn = dead;
      break;
    default:
  }
  var socket = this;
  fn(socket);
}

function dead(socket)
{
  var userId = getUserIdFromCookie(socket);
  broadcastGame(userId, 'dead');
}

function quit(socket)
{
  removeUserFromSocket(socket);

  var userId = getUserIdFromCookie(socket);
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
  var userId = getUserIdFromCookie(socket);
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

function getUserIdFromCookie(socket)
{
  var cookies = new Cookies(socket.handshake, {}, ['SEC123', '321CES']);
  var encoded = cookies.get('express:sess');
  if(encoded)
  {
    var decoded = decode(encoded);
    return decoded.userId;
  }
  return null;
}

function removeUserFromSocket(socket)
{
  var userId = getUserIdFromCookie(socket);
  if(userId)
  {
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