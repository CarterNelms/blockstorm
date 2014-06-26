/* global Phaser, io, userId, isUserHero, isUserHost, clamp, p2, randomInt, favoriteColor, ajax */
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
  platformHeight=64,
  score=0,
  scoreText,
  partnerResponseTime = 0,
  gameTime = 0,
  difficulty = 0,
  cameraSpeed = 0,
  bonus = 0;

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
    socket.on('playagain', playAgain);
    socket.on('frameData', updateFrameData);
    if(isUserHero)
    {
      socket.on('quit', partnerQuit);
    }
    else
    {
      socket.on('ended', gameEnded);
    }
  }

  function playAgain()
  {
    game.state.start('level');
  }

  function dead()
  {
    game.state.start('dead');
  }

  function updateFrameData(data)
  {
    socketData = data;
    partnerResponseTime = 0;
  }

  function leaveGame()
  {
    window.location = '/games';
  }

  function gameEnded(data)
  {
    alert('The host has ended the current game');
    dead();
  }

  function partnerQuit(data)
  {
    alert('Your partner has quit this game');
    dead();
  }

  function disconnected(data)
  {
    alert('You have lost your connection to your partner');
    dead();
  }

  function joined(data)
  {
    if(data.isReadyToPlay)
    {
      socket.off('joined');
      game.state.start('level');
    }
  }

  function initializeGameStates()
  {
    states = {
      boot: {
        preload: function()
        {
          var charType = 'cartoon';
          game.load.image('head', `/assets/character/head/${charType}.png`);
          game.load.image('torso', `/assets/character/torso/${charType}.png`);
          game.load.image('foot', `/assets/character/foot/${charType}.png`);
          game.load.image('hand-front', `/assets/character/hand/front/${charType}.png`);
          game.load.image('hand-back', `/assets/character/hand/back/${charType}.png`);
          game.load.image('pixel', '/assets/misc/pixel.png');
          game.load.image('grass1', '/assets/environment/grass1.png');
          game.load.spritesheet('checkpoint', '/assets/platforms/checkpoint.png', 128, 64);

          game.stage.disableVisibilityChange = true;
        },
        create: function()
        {
          for(var state in states)
          {
            game.state.add(state, states[state]);
          }

          scoreText = game.add.text(16, 16, 'Waiting for partner...', {fontSize: '32px', fill: '#ff0'});
          scoreText.fixedToCamera = true;

          initializeSocketIo();
        }
      },
      level: {
        create: function()
        {
          score = 0;
          game.physics.startSystem(Phaser.Physics.ARCADE);
          world = game.physics.arcade;
          game.world.setBounds(0, 0, 1600, 1200);
          world.checkCollision.down = false;

          buildPlayer();
          buildGround();
          buildPlatforms();

          game.camera.follow(player);
          // game.camera.deadzone = new Phaser.Rectangle(game.width/2, game.world.height/2, player.body.width, game.world.height);
          game.camera.y = 2400;

          cursors = game.input.keyboard.createCursorKeys();

          scoreText = game.add.text(16, 16, scoreAsInt(), {fontSize: '32px', fill: '#ff0'});
          scoreText.fixedToCamera = true;

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
            if(isUserHero){player.body.gravity.y = 1500;}
            player.body.collideWorldBounds = true;
            player.anchor.setTo(0.5, (head.height+torso.height/2)/player.body.height);

            buildSkeleton();
            paintPlayer();

            function paintPlayer()
            {
              getLimbs().forEach(limb=>
              {
                limb.tint = favoriteColor;
              });
            }

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
                hands[limbPos] = game.add.sprite(0, 0, 'hand-'+limbPos);
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
                feet[limbPos].anchor.setTo(0.4, 0.5-torso.height/feet[limbPos].height);
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
            var groundHeight = 64;
            var ground = grounds.create(-game.world.width/2, game.world.height - groundHeight, 'pixel');
            ground.tint = 0xff3300;
            ground.scale.setTo(2*game.world.width, groundHeight);
            ground.body.immovable = true;
            var grassCount = (ground.width/32)/4;
            for(let i = 0; i < grassCount;++i)
            {
              var grass = game.add.sprite(randomInt(0, ground.width)/ground.width, 0, 'grass1');//randomInt(0, ground.width), game.world.height-50, 'grass1');
              grass.anchor.setTo(0.5, 1);
              ground.addChild(grass);
              fitScaleToParent(grass);
            }
          }

          function buildPlatforms()
          {
            platforms = game.add.group();
            platforms.enableBody = true;
            platforms.physicsBodyType = Phaser.Physics.ARCADE;
            var platformCount = 25;
            for(let i = 0; i < platformCount; ++i)
            {
              createPlatform(i);
            }

            function createPlatform(i)
            {
              var platform = platforms.create(0, 0, 'pixel');
              platform.anchor.setTo(0.5, 0.5);
              platform.body.immovable = true;
              platform.platformData = {};
              resetPlatformAsDefault(platform);
              var yOffset = (game.world.height - game.height) * (2*i/(platformCount-1) - 1);
              platform.position.y = yOffset + randomInt(0, game.height - (grounds.getAt(0).body.height*grounds.getAt(0).scale.y + player.body.height + platformHeight));
              if(!isUserHero)
              {
                platform.inputEnabled = true;
                platform.input.enableDrag(false, false);
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
          checkConnectionStability();
          setProperDifficulty();
          updateSocketData();
          if(isUserHero)
          {
            game.physics.arcade.collide(player, grounds);
            updateReplacedPlatforms();
            game.physics.arcade.collide(player, platforms, touchPlatform, null, this);

            var isMoving = isUserHero ? {
              left: cursors.left.isDown && !cursors.right.isDown,
              right: cursors.right.isDown && !cursors.left.isDown
            } : undefined;
            var plrMaxSpeed = 1000;
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
          updateScore();
          raiseCamera();
          var currentAnimation = getPlrAnimation();
          animate();
          orientPlrSpriteDirection();
          sendFrameInfoToPartner();

          function setProperDifficulty()
          {
            gameTime += game.time.elapsed;
            var lastDifficulty = difficulty;
            difficulty = Math.ceil(gameTime/30000);
            if(difficulty !== lastDifficulty)
            {
              updateDifficulty();
            }

            function updateDifficulty()
            {
              cameraSpeed = difficulty;
            }
          }

          function checkConnectionStability()
          {
            partnerResponseTime += game.time.elapsed;
            if(partnerResponseTime >= 6000)
            {
              disconnected();
            }
          }

          function updateScore()
          {
            if(isUserHero)
            {
              score += 5 * (difficulty + bonus) * game.time.elapsed/1000;
            }
            scoreText.text = scoreAsInt();
          }

          function updateReplacedPlatforms()
          {
            platforms.children.forEach(platform=>
            {
              if(!isBelowTouchableLine(platform.body.position.y))
              {
                untouchPlatform(platform);
                destroyChildSprites(platform);
              }
              else if(!isPlrGrounded())
              {
                platform.platformData.isStoodUponNow = false;
              }
            });
          }

          function touchPlatform(plr, platform)
          {
            switch(platform.platformData.type)
            {
              case 'bonus':
                if(platform.body.touching.up && !platform.platformData.isStoodUpon)
                {
                  bonus += 1;
                }
                break;
              default:
            }

            platform.platformData.isTouched = true;
            platform.platformData.isStoodUpon = platform.body.touching.up;
            platform.platformData.isStoodUponNow = platform.platformData.isStoodUpon;
            if(platform.platformData.isStoodUpon)
            {
              destroyChildSprites(platform);
            }
          }

          function resetDeadPlatforms()
          {
            platforms.children.forEach(platform=>
            {
              if(isBelowKillLine(platform.body.position.y - (platform.scale.y/2 + player.body.height)))
              {
                resetPlatform(platform);
              }
            });
          }

          function isBelowKillLine(distance)
          {
            return distance > game.world.height;
          }

          function isBelowTouchableLine(distance)
          {
            return distance > -platformHeight;
          }

          function updateSocketData()
          {
            if(socketData)
            {
              if(isUserHero)
              {
                let platformsData = socketData.platformsData;
                if(platformsData)
                {
                  platformsData.forEach((platformData, i)=>
                  {
                    var platform = platforms.getAt(i);
                    if(platform.platformData.isStoodUponNow && isBelowTouchableLine(platformData.position.y))
                    {
                      // if(isPlrOnPlatform(platform))
                      // {
                      player.body.position.y += platformData.position.y - platform.body.position.y;
                      // }
                    }
                    platform.body.position = platformData.position;
                    platform.scale = platformData.scale;
                    platform.tint = platformData.tint;
                  });
                }
              }
              else
              {
                score = socketData.score;
                var playerData = socketData.playerData;
                if(playerData)
                {
                  player.body.acceleration = playerData.acceleration;
                  player.body.position = playerData.position;
                  // for(let d in playerData.velocity)
                  // {
                  //   var velocity = playerData.velocity[d];
                  //   if(velocity)
                  //   {
                  //     player.body.velocity[d] = velocity;
                  //   }
                  // }
                }
                var groundData = socketData.groundData;
                if(groundData)
                {
                  grounds.children[0].body.position = groundData.position;
                }
                let platformsData = socketData.platformsData;
                if(platformsData)
                {
                  platformsData.forEach((platformData, i)=>
                  {
                    var platform = platforms.children[i];
                    platform.platformData.isTouched = platformData.isTouched;

                    var tint;
                    if(platform.platformData.isTouched)
                    {
                      tint = 0xffff00;
                    }
                    else
                    {
                      switch(platform.platformData.type)
                      {
                        case 'checkpoint':
                          tint = 0x00ff00;
                          break;
                        case 'bonus':
                          tint = 0xff0000;
                          break;
                        default:
                          tint = 0x1199ff;
                      }
                    }
                    platform.tint = tint;
                    platform.inputEnabled = !platform.platformData.isTouched;

                    if(platformData.isStoodUpon && !platform.platformData.isStoodUpon && isBelowTouchableLine(platform.y))
                    {
                      platform.platformData.isStoodUpon = true;
                      switch(platform.platformData.type)
                      {
                        case 'checkpoint':
                          var newWidth = 2.5 * game.world.width;
                          platform.scale.x = newWidth;
                          destroyChildSprites(platform);
                          break;
                        case 'bonus':
                          resetPlatform(platform);
                          break;
                        default:
                      }
                    }
                    platform.platformData.isStoodUponNow = platformData.isStoodUponNow;
                  });
                }
              }
            }
          }

          // function isPlrOnPlatform(platform)
          // {
          //   var delta = {
          //     x: (platform.body.position.x - platform.scale.x/2) - player.body.position.x,
          //     y: (platform.body.position.y - platform.scale.y/2) - player.body.position.y
          //   };

          //   var deadzoneSize = 200;
          //   if(delta.x === clamp(delta.x, -platform.scale.x, 0) && delta.y === clamp(delta.y, player.body.height - deadzoneSize/2, player.body.height + deadzoneSize/2))
          //   {
          //     return true;
          //   }
          //   return false;
          // }

          function checkForDeath()
          {
            if(isBelowKillLine(player.body.position.y))
            {
              socket.send('dead');
            }
          }

          function raiseCamera()
          {
            var cameraStep = cameraSpeed * 0.01 * game.time.elapsed;
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
            player.body.position.y = clamp(player.body.position.y, 0, getCheckpointPosY() - (9*platformHeight/20 + player.body.height));// platform.body.position.y - (platform.scale.y/2 + player.body.height));
            // var horizontalWorldBounds = {
            //   left: player.body.width,
            //   right: game.world.width-player.body.width
            // };
            // var oldPlrPosX = player.x;
            // player.x = clamp(player.x, player.body.width, game.world.width-player.body.width);
            // if(player.x !== oldPlrPosX)
            // {
            //   player.body.velocity.x = 0;
            // }
          }

          function getCheckpointPosY()
          {
            var distance = game.world.height + game.height;
            platforms.children.forEach(platform=>
            {
              if(platform.platformData.type === 'checkpoint')
              {
                if(platform.platformData.isStoodUpon)
                {
                  if(platform.y < distance)
                  {
                    distance = platform.y;
                  }
                }
              }
            });
            return distance;
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

              let platformsData = platforms.children.map(platform=>
              {
                return platform.platformData;
              });

              socket.emit('frameData', {
                playerData: playerData,
                groundData: groundData,
                platformsData: platformsData,
                score: score
              });
            }
            else
            {
              let platformsData = platforms.children.map(platform=>
              {
                return {
                  position: platform.body.position,
                  scale: platform.scale,
                  tint: platform.tint
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
            player.body.velocity.x *= clamp(0.8 * game.time.elapsed/30, 0, 1);
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
            return player.body.touching.down && player.body.wasTouching.down;
          }
        }
      },
      dead: {
        preload: function()
        {
          if(isUserHost)
          {
            game.load.image('playagain','/assets/misc/playagain.png');
          }
        },
        create: function()
        {
          scoreText = game.add.text(16, 16, `Score: ${scoreAsInt()} \n Submitting to server...`, {fontSize: '32px', fill: '#ff0'});
          scoreText.fixedToCamera = true;
          submitScore();
          if(isUserHost)
          {
            game.add.button(game.width/2 - 100, game.height/2-20, 'playagain', sendPlayAgain, this);
          }
        }
        // update: function()
        // {
        //   console.log('Dead state');
        // }
      }
    };

    function sendPlayAgain()
    {
      socket.send('playagain');
    }

    function submitScore()
    {
      score = Math.floor(score);
      ajax(`/users/${userId}/score`, 'POST', {score: score}, data=>
      {
        scoreText.text = `Score: ${scoreAsInt()} \nHigh Score: ${data.score}`;
      }, 'json');
    }

    function scoreAsInt()
    {
      return Math.floor(score);
    }

    function untouchPlatform(platform)
    {
      platform.platformData.isTouched = false;
      platform.platformData.isStoodUpon = false;
      platform.platformData.isStoodUponNow = false;
    }

    function fitScaleToParent(child)
    {
      var parent = child.parent;
      child.scale.x = 1/parent.scale.x;
      child.scale.y = 1/parent.scale.y;
    }

    function destroyChildSprites(parent)
    {
      parent.children.forEach(child=>
      {
        child.destroy();
      });
    }

    function resetPlatform(platform)
    {
      destroyChildSprites(platform);
      platform.y = -2*platformHeight;
      untouchPlatform(platform);
      var typeDeciderRange = 100;
      var typeDecider = randomInt(1, typeDeciderRange);
      var fn = resetPlatformAsDefault;
      if(typeDecider <= 10)
      {
        fn = resetPlatformAsCheckpoint;
      }
      else if(typeDecider <= 20)
      {
        fn = resetPlatformAsBonus;
      }
      fn(platform);
    }

    function resetPlatformAsBonus(platform)
    {
      var platformWidth = 24;
      setPlatformScaleByWidth(platform, platformWidth);
      platform.x = getRandomPlatformPosX(platformWidth);
      platform.platformData.type = 'bonus';
    }

    function resetPlatformAsCheckpoint(platform)
    {
      var platformWidth = 128;
      setPlatformScaleByWidth(platform, platformWidth);
      platform.x = getRandomPlatformPosX(platformWidth);
      platform.platformData.type = 'checkpoint';

      var checkpointArrows = game.add.sprite(0, 0, 'checkpoint');
      checkpointArrows.animations.add('outward', [0, 1, 2], 3.5, true);
      checkpointArrows.anchor.setTo(0.5, 0.5);
      platform.addChild(checkpointArrows);
      fitScaleToParent(checkpointArrows);
      checkpointArrows.animations.play('outward');
    }

    function resetPlatformAsDefault(platform)
    {
      var platformWidth = randomInt(48, 240);
      setPlatformScaleByWidth(platform, platformWidth);
      platform.x = getRandomPlatformPosX(platformWidth);
      platform.platformData.type = null;
    }

    function setPlatformScaleByWidth(platform, platformWidth)
    {
      platform.scale.setTo(platformWidth, platformHeight);
    }

    function getRandomPlatformPosX(platformWidth)
    {
      return randomInt(platformWidth/2, game.world.width - platformWidth/2);
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

    function getLimbs()
    {
      return [
        hands.back,
        feet.back,
        feet.front,
        hands.front
      ];
    }
  }
});