/* global Phaser, io, userId */
/* jshint unused: false */

'use strict';

$(function()
{
  var game, socket, player, torso, head, states={};

  initialize();

  function initialize()
  {
    initializeGameStates();
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
    game = new Phaser.Game(800, 600, Phaser.AUTO, 'game', states.boot);
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
    if(data.isReadyToPlay)
    {
      game.state.start('level');
    }
  }

  function initializeGameStates()
  {
    states.boot = {
      preload: function()
      {
        game.load.image('head', '/assets/character/test/head.png');
        game.load.image('torso', '/assets/character/test/torso.png');
        game.load.image('leg', '/assets/character/test/leg.png');
        game.load.image('arm', '/assets/character/test/arm.png');
        game.load.image('eye-open', '/assets/character/test/eye-open.png');
        game.load.image('eye-shut', '/assets/character/test/eye-shut.png');
        game.stage.disableVisibilityChange = true;
      },
      create: function()
      {
        game.state.add('level', states.level);

        initializeSocketIo();
      }
    };
    states.level = {
      create: function()
      {
        game.physics.startSystem(Phaser.Physics.ARCADE);

        player = game.add.group();

        player.enableBody = true;

        torso = player.create(game.width/2, game.height/2, 'torso');
        torso.anchor.setTo(0.5, 0);

        head = player.create(0, 0, 'head');
        head.anchor.setTo(0.5, 1);
        torso.addChild(head);

        game.physics.enable(player, Phaser.Physics.ARCADE);

        head.rotation = Math.PI/6;
        game.add.tween(head).to({rotation: -Math.PI/6}, 650, Phaser.Easing.Linear.In, true, 100, Number.MAX_VALUE, true);
      },
      update: function()
      {
        torso.body.velocity.x = 20;
        // head
      }
    };
  }
});