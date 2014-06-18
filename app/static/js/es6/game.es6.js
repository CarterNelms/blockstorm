/* global Phaser, io, userId */
/* jshint unused: false */

'use strict';

$(function()
{
  var game, socket;

  initialize();

  function initialize()
  {
    alert('begin');
    initializeSocketIo();
    window.addEventListener('beforeunload', e=>
    {
      socket.emit('quit', {userId: userId});
      // e = e || window.event;
      // var text = 'Do you really want to leave?';

      // // For IE and Firefox prior to version 4
      // if(e)
      // {
      //   e.returnValue = text;
      // }

      // // For Safari
      // return text;
    });
    // window.addEventListener('unload', e=>
    // {
    //   socket.emit('quit', {userId: userId});
    // });
    game = new Phaser.Game(800, 600, Phaser.AUTO, '', {preload: preload, create: create, update: update});
  }

  function initializeSocketIo()
  {
    socket = io.connect('/game');
    socket.on('joined', joined);
    socket.on('disconnected', disconnected);
    socket.on('quit', onPartnerQuit);
    socket.on('ended', gameEnded);
  }

  function gameEnded(data)
  {
    alert('The host has left the game');
    window.location = '/games';
  }

  function onPartnerQuit(data)
  {
    console.log('PARTNER QUIT');
    console.log(data);
  }

  function disconnected(data)
  {
    console.log('DISCONNECTED');
    console.log(data);
  }

  function joined(data)
  {
    console.log('JOINED');
    console.log(data);
  }

  function preload()
  {
  }

  function create()
  {
  }

  function update()
  {
  }
});