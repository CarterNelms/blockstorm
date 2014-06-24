/* global Phaser, io, userId, isUserHero, clamp, p2, randomInt */
/* jshint unused: false */

'use strict';

$(function()
{
  var game,
  socket,
  player,
  torso,
  head,
  hands={},
  feet={},
  states={},
  cursors,
  grounds,
  platforms,
  world,
  socketData={},
  isHoldingJump=false,
  previousAnimation,
  platformHeight=60;
  // cameraStep=0;

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
      socket.send('quit');
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
    socket.on('dead', dead);
    socket.on('frameData', updateFrameData);
    if(isUserHero)
    {
      socket.on('quit', onPartnerQuit);
    }
    else
    {
      socket.on('ended', gameEnded);
    }
  }

  function dead()
  {
    game.state.start('dead');
  }

  function updateFrameData(data)
  {
    if(isUserHero)
    {
      socketData.platformsData = data.platformsData;
    }
    else
    {
      socketData.playerData = data.playerData;
      socketData.groundData = data.groundData;
    }
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
          game.physics.startSystem(Phaser.Physics.ARCADE);
          world = game.physics.arcade;
          game.world.setBounds(0, 0, 1600, 1200);

          buildPlayer();
          buildGround();
          buildPlatforms();

          game.camera.follow(player);
          // game.camera.deadzone = new Phaser.Rectangle(game.width/2, game.world.height/2, player.body.width, game.world.height);
          game.camera.y = 2400;

          cursors = game.input.keyboard.createCursorKeys();

          function buildPlayer()
          {
            player = game.add.sprite(game.world.width/20, game.world.height - 200);

            createTorso();
            createHead();
            createHands();
            createFeet();

            game.physics.arcade.enable(player);

            player.body.setSize(torso.width, torso.height+head.height+feet.back.height/2);
            player.body.bounce.y = 0;
            player.body.gravity.y = 1500;
            player.body.collideWorldBounds = false;
            player.anchor.setTo(0.5, (head.height+torso.height/2)/player.body.height);

            buildSkeleton();

            function createTorso()
            {
              torso = game.add.sprite(0, 0, 'torso');
              torso.anchor.setTo(0.5, 0.5);
            }

            function createHead()
            {
              head = game.add.sprite(0, 0, 'head');
              head.anchor.setTo(0.5, 1);
              head.position.y = -torso.height/2;
              var headBobDuration = 550;
              var easing = Phaser.Easing.Sinusoidal.In;
              game.add.tween(head.position).to({y: -11*torso.height/24}, headBobDuration, easing).to({y: -13*torso.height/24}, headBobDuration, easing).loop().start();
            }

            function createHands()
            {
              for(let i = 0; i < 2; ++i)
              {
                var limbPos = limbPosition(i);
                hands[limbPos] = game.add.sprite(0, 0, 'hand');
                hands[limbPos].anchor.setTo(0.5, -0.5);
                hands[limbPos].position.y = -torso.height/2;
              }
            }

            function createFeet()
            {
              for(let i = 0; i < 2; ++i)
              {
                var limbPos = limbPosition(i);
                feet[limbPos] = game.add.sprite(0, 0, 'foot');
                feet[limbPos].anchor.setTo(0.5, 0.5-torso.height/feet[limbPos].height);
                feet[limbPos].position.y = -torso.height/2;
              }
            }

            function limbPosition(i)
            {
              return i === 1 ? 'front' : 'back';
            }

            function buildSkeleton()
            {
              getBodyParts().forEach(part=>
              {
                player.addChild(part);
              });
            }
          }

          function buildGround()
          {
            grounds = game.add.group();
            grounds.enableBody = true;
            grounds.physicsBodyType = Phaser.Physics.ARCADE;
            var groundHeight = 60;
            var ground = grounds.create(-game.world.width/2, game.world.height - groundHeight, 'pixel');
            ground.tint = 0xff3300;
            ground.scale.setTo(2*game.world.width, groundHeight);
            ground.body.immovable = true;
            var grassCount = (ground.width/32)/4;
            for(let i = 0; i < grassCount;++i)
            {
              var grass = game.add.sprite(randomInt(0, ground.width)/ground.width, 0, 'grass1');//randomInt(0, ground.width), game.world.height-50, 'grass1');
              grass.anchor.setTo(0.5, 1);
              grass.scale.x = 1/ground.scale.x;
              grass.scale.y = 1/ground.scale.y;
              ground.addChild(grass);
            }
          }

          function buildPlatforms()
          {
            platforms = game.add.group();
            platforms.enableBody = true;
            platforms.physicsBodyType = Phaser.Physics.ARCADE;
            var platformCount = 20;
            for(let i = 0; i < platformCount; ++i)
            {
              var platformWidth = getPlatformWidth();
              var platform = platforms.create(0, 0, 'pixel');
              platform.body.immovable = true;
              resetPlatform(platform);
              platform.position.y = randomInt((game.world.height - game.height) * i/(platformCount-1), game.world.height - (grounds.children[0].body.height*grounds.children[0].scale.y + player.body.height + platformHeight));
              if(!isUserHero)
              {
                platform.inputEnabled = true;
                platform.input.enableDrag(false, true);
              }
            }
          }
        },
        // render: function()
        // {
        //   game.debug.body(player);
        // },
        update: function()
        {
          updateSocketData();

          game.physics.arcade.collide(player, grounds);
          game.physics.arcade.collide(player, platforms);

          var isMoving = isUserHero ? {
            left: cursors.left.isDown && !cursors.right.isDown,
            right: cursors.right.isDown && !cursors.left.isDown
          } : undefined;
          var plrMaxSpeed = 1000;
          var currentAnimation = getPlrAnimation();
          if(isUserHero)
          {
            var acceleration = 0;
            if(shouldPlrSlowDown())
            {
              slowPlrDown();
            }
            else
            {
              acceleration = getInputAcceleration();
            }

            var appliedAcceleration = {
              x: acceleration,
              y: applyJumpBoost()
            };
            var appliedVelocity = {
              x: 0,
              y: getPlrJumpVelocity()
            };

            applyPlrInput();
            forcePlrOnScreen();
            checkForDeath();
          }
          else
          {
            resetDeadPlatforms();
          }
          raiseCamera();
          animate();
          orientPlrSpriteDirection();
          sendFrameInfoToPartner();

          function resetDeadPlatforms()
          {
            platforms.children.forEach(platform=>
            {
              if(isBelowKillLine(platform.body.position.y + player.body.height))
              {
                resetPlatform(platform);
              }
            });
          }

          function isBelowKillLine(distance)
          {
            return distance > game.world.height;
          }

          function updateSocketData()
          {
            if(socketData)
            {
              if(isUserHero)
              {
                var platformsData = socketData.platformsData;
                if(platformsData)
                {
                  platformsData.forEach((platformData, i)=>
                  {
                    platforms.children[i].body.position = platformData.position;
                    platforms.children[i].scale = platformData.scale;
                  });
                }
              }
              else
              {
                var playerData = socketData.playerData;
                if(playerData)
                {
                  player.body.acceleration = playerData.acceleration;
                  player.body.position = playerData.position;
                  for(let d in playerData.velocity)
                  {
                    var velocity = playerData.velocity[d];
                    if(velocity)
                    {
                      player.body.velocity[d] = velocity;
                    }
                  }
                }
                var groundData = socketData.groundData;
                if(groundData)
                {
                  grounds.children[0].body.position = groundData.position;
                }
              }
            }

          }

          function checkForDeath()
          {
            if(isBelowKillLine(player.body.position.y))
            {
              socket.send('dead');
            }
          }

          function raiseCamera()
          {
            var cameraStep = 0.02 * game.time.elapsed;
            if(isUserHero)
            {
              player.y += cameraStep;
              grounds.children.forEach(ground=>
              {
                ground.y += cameraStep;
              });
            }
            else
            {
              platforms.children.forEach(platform=>
              {
                platform.y += cameraStep;
              });
            }
          }

          function forcePlrOnScreen()
          {
            var horizontalWorldBounds = {
              left: player.body.width,
              right: game.world.width-player.body.width
            };
            var oldPlrPosX = player.x;
            player.x = clamp(player.x, player.body.width, game.world.width-player.body.width);
            if(player.x !== oldPlrPosX)
            {
              player.body.velocity.x = 0;
            }
          }

          function sendFrameInfoToPartner()
          {
            if(isUserHero)
            {
              var playerData = {
                acceleration: player.body.acceleration,
                velocity: player.body.velocity,
                position: player.body.position,
                animation: currentAnimation,
                scale: player.scale
              };

              var groundData = {
                position: grounds.children[0].body.position
              };

              socket.emit('frameData', {
                playerData: playerData,
                groundData: groundData
              });
            }
            else
            {
              var platformsData = platforms.children.map(platform=>
              {
                return {
                  position: platform.body.position,
                  scale: platform.scale
                };
              });

              socket.emit('frameData', {
                platformsData: platformsData
              });
            }
          }

          function orientPlrSpriteDirection()
          {
            if(isUserHero)
            {
              if(isMoving.left)
              {
                player.scale.x = -1;
              }
              else if(isMoving.right)
              {
                player.scale.x = 1;
              }
            }
            else if(socketData)
            {
              var playerData = socketData.playerData;
              if(playerData)
              {
                player.scale.x = playerData.scale.x;
              }
            }
          }

          function applyJumpBoost()
          {
            if(isHoldingJump && player.body.velocity.y <= 0 && !isPlrGrounded())
            {
              return -600;
            }
            return 0;
          }

          function animate()
          {
            if(currentAnimation !== previousAnimation)
            {
              previousAnimation = currentAnimation;
              stopPreviousAnimation();

              var plrAnimations = {
                run: {
                  head: {
                    start: function()
                    {
                      var animType = plrAnimations.run;
                      var animator = animType.head;
                      var data = animator.data;
                      this.tween = game.add.tween(this).to({rotation: Math.PI/6}, data.getDuration(), Phaser.Easing.Linear.In);
                      this.tween.onComplete.addOnce(animator.end, this);
                      this.tween.start();
                    },
                    end: function()
                    {
                      var animType = plrAnimations.run;
                      var animator = animType.head;
                      var data = animator.data;
                      this.tween = game.add.tween(this).to({rotation: 0}, data.getDuration(), Phaser.Easing.Linear.In);
                      this.tween.onComplete.addOnce(animator.start, this);
                      this.tween.start();
                    },
                    data: {
                      getDuration: ()=>400
                    }
                  },
                  torso: {
                    start: function()
                    {
                      var animType = plrAnimations.run;
                      var animator = animType.torso;
                      var data = animator.data;
                      game.add.tween(this.position).to({y: 0}, data.getDuration(), Phaser.Easing.Linear.In).start();
                      this.tween = game.add.tween(this).to({rotation: Math.PI/6}, data.getDuration(), Phaser.Easing.Linear.In);
                      this.tween.onComplete.addOnce(animator.end, this);
                      this.tween.start();
                    },
                    end: function()
                    {
                      var animType = plrAnimations.run;
                      var animator = animType.torso;
                      var data = animator.data;
                      this.tween = game.add.tween(this).to({rotation: 0}, data.getDuration(), Phaser.Easing.Linear.In);
                      this.tween.onComplete.addOnce(animator.start, this);
                      this.tween.start();
                    },
                    data: {
                      getDuration: ()=>400
                    }
                  },
                  hand: {
                    forward: function()
                    {
                      var animType = plrAnimations.run;
                      var typeData = animType.data;
                      var animator = animType.hand;
                      var data = animator.data;
                      this.tween = game.add.tween(this).to({rotation: data.getAngle()}, typeData.getLimbDuration(), Phaser.Easing.Linear.In);
                      this.tween.onComplete.addOnce(animator.backward, this);
                      this.tween.start();
                    },
                    backward: function()
                    {
                      var animType = plrAnimations.run;
                      var typeData = animType.data;
                      var animator = animType.hand;
                      var data = animator.data;
                      this.tween = game.add.tween(this).to({rotation: -data.getAngle()}, typeData.getLimbDuration(), Phaser.Easing.Linear.In);
                      this.tween.onComplete.addOnce(animator.forward, this);
                      this.tween.start();
                    },
                    data: {
                      getAngle: ()=>Math.PI/3
                    }
                  },
                  foot: {
                    forward: function()
                    {
                      var animType = plrAnimations.run;
                      var typeData = animType.data;
                      var animator = animType.foot;
                      var data = animator.data;
                      this.tween = game.add.tween(this).to({rotation: data.getAngle()}, typeData.getLimbDuration(), Phaser.Easing.Linear.In);
                      this.tween.onComplete.addOnce(animator.backward, this);
                      this.tween.start();
                    },
                    backward: function()
                    {
                      var animType = plrAnimations.run;
                      var typeData = animType.data;
                      var animator = animType.foot;
                      var data = animator.data;
                      this.tween = game.add.tween(this).to({rotation: -data.getAngle()}, typeData.getLimbDuration(), Phaser.Easing.Linear.In);
                      this.tween.onComplete.addOnce(animator.forward, this);
                      this.tween.start();
                    },
                    data: {
                      getAngle: ()=>Math.PI/6
                    }
                  },
                  data: {
                    getLimbDuration: ()=>Math.round(100 + 150*clamp(1 - getCurrentSpeed()/plrMaxSpeed))
                  }
                },
                stand: {
                  head: {
                    reset: function()
                    {
                      var animType = plrAnimations.stand;
                      var animator = animType.head;
                      var data = animator.data;
                      this.tween = game.add.tween(this).to({rotation: 0}, data.getDuration(), Phaser.Easing.Quadratic.Out);
                      this.tween.start();
                    },
                    data: {
                      getDuration: ()=>550
                    }
                  },
                  torso: {
                    reset: function()
                    {
                      var animType = plrAnimations.stand;
                      var animator = animType.torso;
                      var data = animator.data;
                      this.tween = game.add.tween(this).to({rotation: 0}, data.getDuration(), Phaser.Easing.Quadratic.Out);
                      this.tween.start();
                    },
                    data: {
                      getDuration: ()=>400
                    }
                  },
                  hand: {
                    startForward: function()
                    {
                      var animType = plrAnimations.stand;
                      var typeData = animType.data;
                      var animator = animType.hand;
                      var data = animator.data;
                      this.tween = game.add.tween(this).to({rotation: data.getAngle()}, data.getStartDuration(), Phaser.Easing.Quadratic.Out);
                      this.tween.onComplete.addOnce(animator.backward, this);
                      this.tween.start();
                    },
                    startBackward: function()
                    {
                      var animType = plrAnimations.stand;
                      var typeData = animType.data;
                      var animator = animType.hand;
                      var data = animator.data;
                      this.tween = game.add.tween(this).to({rotation: -data.getAngle()}, data.getStartDuration(), Phaser.Easing.Quadratic.Out);
                      this.tween.onComplete.addOnce(animator.forward, this);
                      this.tween.start();
                    },
                    forward: function()
                    {
                      var animType = plrAnimations.stand;
                      var typeData = animType.data;
                      var animator = animType.hand;
                      var data = animator.data;
                      this.tween = game.add.tween(this).to({rotation: data.getAngle()}, typeData.getLimbDuration(), Phaser.Easing.Quadratic.Out);
                      this.tween.onComplete.addOnce(animator.backward, this);
                      this.tween.start();
                    },
                    backward: function()
                    {
                      var animType = plrAnimations.stand;
                      var typeData = animType.data;
                      var animator = animType.hand;
                      var data = animator.data;
                      this.tween = game.add.tween(this).to({rotation: -data.getAngle()}, typeData.getLimbDuration(), Phaser.Easing.Quadratic.Out);
                      this.tween.onComplete.addOnce(animator.forward, this);
                      this.tween.start();
                    },
                    data: {
                      getAngle: ()=>Math.PI/16,
                      getStartDuration: ()=>200
                    }
                  },
                  foot: {
                    reset: function()
                    {
                      var animType = plrAnimations.stand;
                      var typeData = animType.data;
                      var animator = animType.foot;
                      var data = animator.data;
                      this.tween = game.add.tween(this).to({rotation: 0}, 100, Phaser.Easing.Quadratic.Out);
                      this.tween.start();
                    }
                  },
                  data: {
                    getLimbDuration: ()=>1300
                  }
                },
                fall: {
                  head: {
                    reset: function()
                    {
                      var animType = plrAnimations.fall;
                      var animator = animType.head;
                      var data = animator.data;
                      this.tween = game.add.tween(this).to({rotation: 0}, data.getDuration(), Phaser.Easing.Quadratic.Out);
                      this.tween.start();
                    },
                    data: {
                      getDuration: ()=>550
                    }
                  },
                  torso: {
                    reset: function()
                    {
                      var animType = plrAnimations.stand;
                      var animator = animType.torso;
                      var data = animator.data;
                      this.tween = game.add.tween(this).to({rotation: 0}, data.getDuration(), Phaser.Easing.Quadratic.Out);
                      this.tween.start();
                    },
                    data: {
                      getDuration: ()=>400
                    }
                  },
                  hand: {
                    restart: function()
                    {
                      this.rotation = -Math.PI;
                      var animType = plrAnimations.fall;
                      triggerAnimation(this, animType.hand.start);
                    },
                    start: function()
                    {
                      var animType = plrAnimations.fall;
                      var typeData = animType.data;
                      var animator = animType.hand;
                      var data = animator.data;
                      this.tween = game.add.tween(this).to({rotation: 0}, typeData.getLimbDuration(), Phaser.Easing.Linear.Out);
                      this.tween.onComplete.addOnce(animator.end, this);
                      this.tween.start();
                    },
                    end: function()
                    {
                      var animType = plrAnimations.fall;
                      var typeData = animType.data;
                      var animator = animType.hand;
                      var data = animator.data;
                      this.tween = game.add.tween(this).to({rotation: Math.PI}, typeData.getLimbDuration(), Phaser.Easing.Linear.Out);
                      this.tween.onComplete.addOnce(animator.restart, this);
                      this.tween.start();
                    },
                    data: {
                      getAngle: ()=>Math.PI/16
                    }
                  },
                  foot: {
                    forward: function()
                    {
                      var animType = plrAnimations.run;
                      var typeData = animType.data;
                      var animator = animType.foot;
                      var data = animator.data;
                      this.tween = game.add.tween(this).to({rotation: data.getAngle()}, typeData.getLimbDuration(), Phaser.Easing.Linear.In);
                      this.tween.onComplete.addOnce(animator.backward, this);
                      this.tween.start();
                    },
                    backward: function()
                    {
                      var animType = plrAnimations.run;
                      var typeData = animType.data;
                      var animator = animType.foot;
                      var data = animator.data;
                      this.tween = game.add.tween(this).to({rotation: -data.getAngle()}, typeData.getLimbDuration(), Phaser.Easing.Linear.In);
                      this.tween.onComplete.addOnce(animator.forward, this);
                      this.tween.start();
                    },
                    data: {
                      getAngle: ()=>Math.PI/6
                    }
                  },
                  data: {
                    getLimbDuration: ()=>175
                  }
                }
              };

              var startAnimation = {
                run: function()
                {
                  var animType = plrAnimations.run;
                  triggerAnimation(head, animType.head.start);
                  triggerAnimation(torso, animType.torso.start);
                  for(let limbPos in feet)
                  {
                    triggerAnimation(hands[limbPos], limbPos === 'back' ? animType.hand.forward : animType.hand.backward);
                    triggerAnimation(feet[limbPos], limbPos === 'front' ? animType.foot.forward : animType.foot.backward);
                  }
                },
                fall: function()
                {
                  var animType = plrAnimations.fall;
                  triggerAnimation(head, animType.head.reset);
                  triggerAnimation(torso, animType.torso.reset);
                  for(let limbPos in feet)
                  {
                    triggerAnimation(hands[limbPos], limbPos === 'back' ? animType.hand.start : animType.hand.end);
                    triggerAnimation(feet[limbPos], limbPos === 'front' ? animType.foot.forward : animType.foot.backward);
                  }
                },
                stand: function()
                {
                  var animType = plrAnimations.stand;
                  triggerAnimation(head, animType.head.reset);
                  triggerAnimation(torso, animType.torso.reset);
                  for(let limbPos in feet)
                  {
                    triggerAnimation(hands[limbPos], limbPos === 'back' ? animType.hand.startForward : animType.hand.startBackward);
                    triggerAnimation(feet[limbPos], animType.foot.reset);
                  }
                }
              };

              switch(currentAnimation)
              {
                case 'run':
                  startAnimation.run();
                  break;
                case 'fall':
                  startAnimation.fall();
                  break;
                default:
                  startAnimation.stand();
              }
            }

            function stopPreviousAnimation()
            {
              getBodyParts().forEach(part=>
              {
                if(part.tween)
                {
                  part.tween.stop();
                }
              });
            }

            function triggerAnimation(sprite, firstAnimFunction)
            {
              sprite.tween = game.add.tween(sprite);
              sprite.tween.onStart.addOnce(firstAnimFunction, sprite);
              sprite.tween.start();
            }
          }

          function shouldPlrSlowDown()
          {
            return !isMoving.left && !isMoving.right && isPlrGrounded() && getCurrentSpeed() > 1;
          }

          function applyPlrInput()
          {
            player.body.acceleration = appliedAcceleration;

            for(let d in appliedVelocity)
            {
              var velocity = appliedVelocity[d];
              if(velocity)
              {
                player.body.velocity[d] = velocity;
              }
            }
          }

          function getPlrAnimation()
          {
            if(isUserHero)
            {
              if(!isPlrGrounded())
              {
                return 'fall';
              }
              if(isMoving.left || isMoving.right)
              {
                return 'run';
              }
            }
            else if(socketData)
            {
              if(socketData.playerData)
              {
                return socketData.playerData.animation;
              }
            }
            return 'stand'; // Default animation
          }

          function getInputAcceleration()
          {
            var plrInputDirection = isMoving.right ? 1 : isMoving.left ? -1 : 0;

            var plrVelocityDirection = player.body.velocity.x > 0 ? 1 : player.body.velocity.x < 0 ? -1 : 0;

            var isPlrMovingForward = plrVelocityDirection === plrInputDirection;

            var plrMaxAcceleration = isPlrGrounded() ? 1800 : 800;
            var plrAcceleration = !isPlrMovingForward ? plrMaxAcceleration : getCurrentSpeed() <= plrMaxSpeed ? plrMaxAcceleration*clamp((plrMaxSpeed - getCurrentSpeed())/plrMaxSpeed) : 0;
            plrAcceleration *= isMoving.left ? -1: isMoving.right ? 1 : 0;
            return plrAcceleration;
          }

          function slowPlrDown()
          {
            player.body.velocity.x *= 0.8;
          }

          function getPlrJumpVelocity()
          {
            if(isHoldingJump && !cursors.up.isDown)
            {
              isHoldingJump = false;
            }
            if(isPlrGrounded() && cursors.up.isDown && !isHoldingJump)
            {
              isHoldingJump = true;
              return -600;
            }
            return false;
          }

          function isPlrGrounded()
          {
            return player.body.touching.down;
          }
        }
      },
      dead: {
        create: function()
        {
          console.log('Entering dead state');
        },
        update: function()
        {
          console.log('Dead state');
        }
      }
    };

    function resetPlatform(platform, platformWidth)
    {
      if(!platformWidth)
      {
        platformWidth = getPlatformWidth;
      }
      platform.scale.setTo(platformWidth, platformHeight);
      platform.x = randomInt(game.world.width - platformWidth, 0);
      platform.y = -platformHeight;
    }

    function getPlatformWidth()
    {
      return randomInt(20, 200);
    }

    function getCurrentSpeed()
    {
      return Math.abs(player.body.velocity.x);
    }

    function getBodyParts()
    {
      return [
        hands.back,
        feet.back,
        torso,
        head,
        feet.front,
        hands.front
      ];
    }
  }
});