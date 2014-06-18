/* global Phaser, io */
/* jshint unused: false */

'use strict';

$(function()
{
  var game, platforms, players, player, player2, cursors, pointer, stars, scoreText, socket;
  var score = 0;

  initialize();

  function initialize()
  {
    initializeSocketIo();
    game = new Phaser.Game(800, 600, Phaser.AUTO, '', {preload: preload, create: create, update: update});
  }

  function initializeSocketIo()
  {
    socket = io.connect('/tutorial');
    socket.on('update', prepUpdate);
  }

  function refreshPlayers()
  {
    player = players[0];
    player2 = players[1];
  }

  function prepUpdate(serverData)
  {
    if(player2 && serverData)
    {
      player2.server = serverData;
    }
  }

  function preload()
  {
    game.load.image('sky', '/tutorial/assets/sky.png');
    game.load.image('ground', '/tutorial/assets/platform.png');
    game.load.image('star', '/tutorial/assets/star.png');
    game.load.image('logo', '/tutorial/assets/phaser.png');
    game.load.spritesheet('dude', '/tutorial/assets/dude.png', 32, 48);
    game.stage.disableVisibilityChange = true;
  }

  function create()
  {
    game.physics.startSystem(Phaser.Physics.ARCADE);
    game.add.sprite(0, 0, 'sky');

    platforms = game.add.group();
    platforms.enableBody = true;
    var ground = platforms.create(0, game.world.height - 64, 'ground');
    ground.scale.setTo(2, 2);
    ground.body.immovable = true;
    var ledge = platforms.create(400, 400, 'ground');
    ledge.body.immovable = true;
    ledge = platforms.create(-150, 250, 'ground');
    ledge.body.immovable = true;

    players = [player, player2];
    players = players.map(p=>
    {
      p = game.add.sprite(32, game.world.height - 150, 'dude');

      game.physics.arcade.enable(p);
      p.animations.add('left', [0, 1, 2, 3], 10, true);
      p.animations.add('right', [5, 6, 7, 8], 10, true);

      return p;
    });
    refreshPlayers();

    player.body.bounce.y = 0.05;
    player.body.gravity.y = 300;
    player.body.collideWorldBounds = true;

    // Creates a client property for communicating with sockets
    // ------------------------
    player.client = new PlayerClient();
    // ------------------------

    cursors = game.input.keyboard.createCursorKeys();
    pointer = game.input.activePointer;
    game.input.onDown.add(function()
    {
      createStar(pointer.position.x, pointer.position.y);
    }, this);
    stars = game.add.group();
 
    stars.enableBody = true;
 
    //  Here we'll create 12 of them evenly spaced apart
    for (var i = 0; i < 12; i++)
    {
      createStar(i * 70, 0);
    }

    scoreText = game.add.text(16, 16, `Score: ${score}`, { fontSize: '32px', fill: '#000' });
  }

  function createStar(x, y)
  {
    //  Create a star inside of the 'stars' group
    var star = stars.create(x, y, 'star');

    //  Let gravity do its thing
    star.body.gravity.y = 2 + 120*Math.random();

    //  This just gives each star a slightly random bounce value
    star.body.bounce.y = 0.7 + Math.random() * 0.2;
  }

  function update()
  {
    game.physics.arcade.collide(player, platforms);

    player.body.velocity.x = 0;
    player.client.reset();
    if(cursors.left.isDown)
    {
      //  Move to the left
      player.body.velocity.x = -150;
      player.client.body.velocity.x = -150;

      player.animations.play('left');
      player.client.animations = 'left';
    }
    else if (cursors.right.isDown)
    {
      //  Move to the right
      player.body.velocity.x = 150;
      player.client.body.velocity.x = 150;

      player.animations.play('right');
      player.client.animations = 'right';
    }
    else
    {
      //  Stand still
      player.animations.stop();
      player.client.animations = '';

      player.frame = 4;
    }
    //  Allow the player to jump if they are touching the ground.
    if(cursors.up.isDown && player.body.touching.down)
    {
      player.body.velocity.y = -350;
      player.client.body.velocity.y = -350;
    }
    player.client.body.position = player.body.position;

    socket.emit('update', player.client);

    // Drop a new star if the mouse is held down
    // if(pointer.isDown)// && pointer.msSinceLastClick === 0)
    // {
    //   createStar(pointer.position.x, pointer.position.y);
    // }

    var serverData = player2.server;
    if(serverData)
    {
      player2.body.velocity = serverData.body.velocity;
      // player2.body.velocity.x = serverData.body.velocity.x;
      // if(serverData.body.velocity.y)
      // {
      //   player2.body.velocity.y = serverData.body.velocity.y;
      // }
      if(serverData.animations === '')
      {
        // Stand still
        player2.animations.stop();
        player2.frame = 4;
      }
      else
      {
        player2.animations.play(serverData.animations);
      }
      for(var dim in player2.body.position)
      {
        var delta = serverData.body.position[dim] - player2.body.position[dim];
        console.log(delta);
        if(Math.abs(delta) > 10 && Math.abs(delta) < 20)
        {
          delta = 10 * Math.abs(delta)/delta;
        }
        player2.body.position[dim] += delta;
        // player2.body.position[dim] += (serverData.body.position[dim] - player2.body.position[dim])/2;
        // player2.body.position = serverData.body.position;
      }
    }

    game.physics.arcade.collide(stars, platforms);

    players.forEach(p=>
    {
      game.physics.arcade.overlap(p, stars, collectStar, null, this);
    });

    function collectStar (player, star)
    {    
      // Removes the star from the screen
      star.kill();
   
      //  Add and update the score
      score += 10;
      if(score < 120)
      {
        scoreText.text = 'Score: ' + score;
      }
      else
      {
        scoreText.text = 'You Win!';
      }
    }
  }

  class PlayerClient
  {
    constructor()
    {
      this.reset();
    }

    reset()
    {
      this.body = {
        velocity: {
          x: 0,
          y: 0
        },
        position: {
          x: 0,
          y: 0
        }
      };
      this.animations = '';
    }
  }
});