/* global Phaser, io, userId, isUserHero, clamp, p2, randomInt */
/* jshint unused: false */

'use strict';

$(function()
{
  var game, socket, player, torso, head, hands={}, feet={}, states={}, cursors, grounds, world, socketData={};
  var fps = 30;
  var then = Date.now();
  var interval = 1000/fps;

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
    if(isUserHero)
    {
      socket.on('quit', onPartnerQuit);
    }
    else
    {
      socket.on('ended', gameEnded);
      socket.on('hero', updateHero);
    }
  }

  function updateHero(data)
  {
    socketData.player = data;
    console.log(socketData.player);
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
          game.load.image('pixel', '/assets/misc/pixel.png');
          game.load.image('grass1', '/assets/environment/grass1.png');

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
          world = game.physics.p2;
          world.useElapsedTime = true;
          world.setImpactEvents(true);
          world.gravity.y = 3000;
          world.restitution = 0;
          game.world.setBounds(0, 0, 1600, 1200);

          var playerCollisionGroup = world.createCollisionGroup();
          var groundCollisionGroup = world.createCollisionGroup();

          world.updateBoundsCollisionGroup();

          buildPlayer();
          buildGround();

          game.camera.follow(player);
          // game.camera.deadzone();

          cursors = game.input.keyboard.createCursorKeys();

          console.log(player.body);

          function buildPlayer()
          {
            player = game.add.sprite(game.world.width/20, game.world.height - 100);

            createTorso();
            createHead();
            createHands();
            createFeet();

            game.physics.enable(player, Phaser.Physics.P2JS);
            player.body.setRectangle(torso.width, torso.height+head.height+feet.back.height);
            player.body.fixedRotation = true;
            player.body.collideWorldBounds = true;

            player.body.setCollisionGroup(playerCollisionGroup);

            player.body.collides(groundCollisionGroup, playerLanded, this);

            function playerLanded()
            {
              console.log('PLAYER LANDED');
            }

            buildSkeleton();
          }

          function buildGround()
          {
            grounds = game.add.group();
            grounds.enableBody = true;
            grounds.physicsBodyType = Phaser.Physics.P2JS;
            // game.physics.enable(grounds, Phaser.Physics.P2JS);
            var groundHeight = 120;
            var ground = grounds.create(0, 0, 'pixel');
            ground.tint = 0xff3300;
            ground.body.x = game.world.width/2;
            ground.body.y = game.world.height - groundHeight/2;
            ground.scale.setTo(game.world.width, groundHeight);
            ground.body.setRectangle(ground.width, ground.height);
            ground.body.immovable = true;
            ground.body.setCollisionGroup(groundCollisionGroup);
            ground.body.collides([groundCollisionGroup, playerCollisionGroup]);
            ground.body.static = true;
            var grassCount = (ground.width/32)/4;
            for(let i = 0; i < grassCount;++i)
            {
              var grass = game.add.sprite(randomInt(0, ground.width), game.world.height-50, 'grass1');
              grass.anchor.setTo(0.5, 1);
              // grass.position.x = randomInt(0, ground.width);
              // grass.position.y = 0;
              // ground.addChild(grass);
              console.log(grass.world.x);
              console.log(grass.world.y);
            }
          }

          function createHands()
          {
            for(let i = 0; i < 2; ++i)
            {
              var limbPos = limbPosition(i);
              hands[limbPos] = game.add.sprite(0, 0, 'hand');
              hands[limbPos].anchor.setTo(0.5, -0.5);
              hands[limbPos].position.y = -torso.height/2;
              var armAngleDir = i === 0 ? 1 : -1;
              var angle = Math.PI/6;
              var s = game.add.tween(hands[limbPos]).to({rotation: -armAngleDir*angle}, 750, Phaser.Easing.Linear.In).to({rotation: armAngleDir*angle}, 750, Phaser.Easing.Linear.In).loop();//, true, 100, Number.MAX_VALUE, true);
              s.start();
            }
          }

          function createFeet()
          {
            for(let i = 0; i < 2; ++i)
            {
              var limbPos = limbPosition(i);
              feet[limbPos] = game.add.sprite(0, 0, 'foot');
              feet[limbPos].anchor.setTo(0.5, -0.25);
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
            head.position.y = -torso.height/2;
            var angle = Math.PI/36;
            head.rotation = angle;
            game.add.tween(head).to({rotation: -angle}, 650, Phaser.Easing.Linear.In, true, 100, Number.MAX_VALUE, true);
          }

          function createTorso()
          {
            torso = game.add.sprite(0, 0, 'torso'); //.create(game.width/2, game.height/2, 'torso');
            torso.anchor.setTo(0.5, 0.5);
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
          if(isUserHero)
          {
            var isPlrTouchingDown = getIsPlrTouchingDown();
            var inputForce = getInputForce();
            applyPlrJumpVelocity();

            player.body.force.x = inputForce;

            socket.emit('hero', {
              userId: userId,
              playerData: {
                force: {
                  x: player.body.force.x,
                  y: player.body.force.y
                },
                velocity: {
                  x: player.body.velocity.x,
                  y: player.body.velocity.y
                },
                position: {
                  x: player.x,
                  y: player.y
                }
              }
            });
          }
          else
          {
            if(player)
            {
              console.log('PLAYER');
              if(player.body)
              {
                console.log('BODY');
                var data = socketData.player;
                if(data)
                {
                  player.body.force.x = data.force.x;
                  player.body.force.y = data.force.y;
                  player.body.velocity.x = data.velocity.x;
                  player.body.velocity.y = data.velocity.y;
                  player.x = data.position.x;
                  player.y = data.position.y;
                }
              }
            }
          }

          function getInputForce()
          {
            var isMoving = {
              left: cursors.left.isDown && !cursors.right.isDown,
              right: cursors.right.isDown && !cursors.left.isDown
            };

            var plrVelocityDirection = player.body.velocity.x > 0 ? -1 : player.body.velocity.x < 0 ? 1 : 0;

            var force = 0;
            var shouldPlrSlowDown = !isMoving.left && !isMoving.right && isPlrTouchingDown && Math.abs(player.body.velocity.x) > 1;
            if(shouldPlrSlowDown)
            {
              force = slowPlrDown();
            }
            else
            {
              force = applyPlrMoveInput();
            }
            return force;

            function applyPlrMoveInput()
            {
              var plrInputDirection = isMoving.right ? 1 : isMoving.left ? -1 : 0;

              var isPlrMovingForward = plrVelocityDirection === plrInputDirection;

              var plrMaxSpeed = 100;

              var plrMaxAcceleration = 2400;
              var plrAcceleration = !isPlrMovingForward ? plrMaxAcceleration : Math.abs(player.body.velocity.x) <= plrMaxSpeed ? plrMaxAcceleration*clamp((plrMaxSpeed - Math.abs(player.body.velocity.x))/plrMaxSpeed) : 0;
              var inputForce = plrAcceleration;// * game.time.elapsed * game.time.elapsed;
              inputForce *= isMoving.left ? -1: isMoving.right ? 1 : 0;
              return inputForce;
            }

            function slowPlrDown()
            {
              var slowDownForce = 1000;
              return slowDownForce * -plrVelocityDirection;
            }
          }

          function applyPlrJumpVelocity()
          {
            if(cursors.up.isDown && isPlrTouchingDown)
            {
              player.body.velocity.y = -1200;
            }
          }

          function getIsPlrTouchingDown()
          {
            var downAxis = p2.vec2.fromValues(0, 1);
            var result = false;
            var contactEquations = world.world.narrowphase.contactEquations;

            contactEquations.forEach(c=>
            {
              if(!result)
              {
                var isBodyA = c.bodyA === player.body.data;
                var isBodyB = c.bodyB === player.body.data;
                if(isBodyA || isBodyB)
                {
                  var normalDown = p2.vec2.dot(c.normalA, downAxis);
                  normalDown *= isBodyA ? -1 : 1;
                  if(normalDown > 0.5)
                  {
                    result = true;
                  }
                }
              }
            });
            return result;
          }
        }
      }
    };
  }
});