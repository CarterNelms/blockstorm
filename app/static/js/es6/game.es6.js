/* global Phaser, io, userId, isUserHero */
/* jshint unused: false */

'use strict';

$(function()
{
  var game, socket, player, torso, head, hands={}, feet={}, states={}, keys;

  initialize();

  function initialize()
  {
    initializeGameStates();
    game = new Phaser.Game(800, 600, Phaser.AUTO, 'game', states.boot);
  }

  function initializeSocketIo()
  {
    socket = io.connect('/game');
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
    states = {
      boot: {
        preload: function()
        {
          game.load.image('head', '/assets/character/head/demo.png');
          game.load.image('torso', '/assets/character/torso/demo.png');
          game.load.image('foot', '/assets/character/foot/demo.png');
          game.load.image('hand', '/assets/character/hand/demo.png');

          game.stage.disableVisibilityChange = true;
        },
        create: function()
        {
          for(var state in states)
          {
            game.state.add(state, states[state]);
          }

          initializeSocketIo();
        }
      },
      level: {
        create: function()
        {
          game.physics.startSystem(Phaser.Physics.P2JS);

          // player = game.add.group();

          // player.enableBody = true;

          buildPlayer();

          keys = game.input.keyboard.createCursorKeys();

          function buildPlayer()
          {
            player = game.add.sprite(game.world.width/2, game.world.height/2);

            createHead();
            createTorso();
            createHands();
            createFeet();

            game.physics.enable(player, Phaser.Physics.P2JS);

            buildSkeleton();
          }

          function createHands()
          {
            for(let i = 0; i < 2; ++i)
            {
              var limbPos = limbPosition(i);
              hands[limbPos] = game.add.sprite(0, 0, 'hand');
              hands[limbPos].anchor.setTo(0.5, -0.5);
              var armAngleDir = i === 0 ? 1 : -1;
              var angle = Math.PI/6;
              hands[limbPos].rotation = armAngleDir*angle;
              game.add.tween(hands[limbPos]).to({rotation: -armAngleDir*angle}, 750, Phaser.Easing.Linear.In, true, 100, Number.MAX_VALUE, true);
            }
          }

          function createFeet()
          {
            for(let i = 0; i < 2; ++i)
            {
              var limbPos = limbPosition(i);
              feet[limbPos] = game.add.sprite(0, 0, 'foot');
              feet[limbPos].anchor.setTo(0.5, -0.75);
              feet[limbPos].position.y = torso.height/2;
              var armAngleDir = i === 0 ? 1 : -1;
              var angle = Math.PI/6;
              feet[limbPos].rotation = armAngleDir*angle;
              game.add.tween(feet[limbPos]).to({rotation: -armAngleDir*angle}, 750, Phaser.Easing.Linear.In, true, 100, Number.MAX_VALUE, true);
            }
          }

          function limbPosition(i)
          {
            return i === 1 ? 'front' : 'back';
          }

          function createHead()
          {
            head = game.add.sprite(0, 0, 'head');
            head.anchor.setTo(0.5, 1);
            var angle = Math.PI/36;
            head.rotation = angle;
            game.add.tween(head).to({rotation: -angle}, 650, Phaser.Easing.Linear.In, true, 100, Number.MAX_VALUE, true);
          }

          function createTorso()
          {
            torso = game.add.sprite(0, 0, 'torso'); //.create(game.width/2, game.height/2, 'torso');
            torso.anchor.setTo(0.5, 0);
          }

          function buildSkeleton()
          {
            var parts = [
              head,
              hands.back,
              feet.back,
              torso,
              feet.front,
              hands.front
            ];

            parts.forEach(part=>
            {
              player.addChild(part);
            });
          }
        },
        update: function()
        {
          var speed = {
            x: game.time.elapsed * game.time.elapsed,
            y: 0
          };
          var inputForce = {};
          
          for(let d in speed)
          {
            inputForce[d] = isMovingLeft() ? -speed[d]: isMovingRight() ? speed[d] : 0;
          }

          for(let d in inputForce)
          {
            player.body.force[d] = inputForce[d];
          }

          function isMovingLeft()
          {
            return keys.left.isDown && !keys.right.isDown;
          }

          function isMovingRight()
          {
            return keys.right.isDown && !keys.left.isDown;
          }
        }
      }
    };
  }
});