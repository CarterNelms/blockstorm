/* jshint unused: false */

'use strict';

var gameCollection = global.nss.db.collection('games');
var traceur = require('traceur');
var Base = traceur.require(__dirname + '/base.js');
var Mongo = require('mongodb');

class Game
{
  constructor(obj)
  {
    this.players = {};
    this.players.heroId = '';
    this.players.wizardId = '';
    this.isHostHero = obj.isHostHero*1 ? true : false;
    if(this.isHostHero)
    {
      this.players.heroId = Mongo.ObjectID(obj.userId);
    }
    else
    {
      this.players.wizardId = Mongo.ObjectID(obj.userId);
    }
  }

  save(fn)
  {
    Base.save(this, gameCollection, fn);
  }

  join(playerId, fn)
  {
    if(this.isOpen)
    {
      playerId = Mongo.ObjectID(playerId);
      if(this.isHeroOpen)
      {
        this.players.heroId = playerId;
      }
      else
      {
        this.players.wizardId = playerId;
      }
      this.save(game=>fn(game));
    }
    else
    {
      fn(null);
    }
  }

  quit(userId, fn)
  {
    if(this.isUserHost(userId) || this.isEmpty)
    {
      this.destroy(()=>fn(null));
    }
    else
    {
      if(this.isUserHero(userId))
      {
        this.players.heroId = '';
      }
      else
      {
        this.players.wizardId = '';
      }
      this.save(game=>fn(game));
    }
  }

  destroy(fn)
  {
    console.log('DESTROYING');
    Base.destroy(this._id, gameCollection, fn);
  }

  isUserInGame(userId)
  {
    return this.isUserHero(userId) ? true : this.isUserWizard(userId);
  }

  isUserHero(userId)
  {
    return userId.toString() === this.players.heroId.toString();
  }

  isUserWizard(userId)
  {
    return userId.toString() === this.players.wizardId.toString();
  }

  isUserHost(userId)
  {
    return userId.toString() === this.hostId.toString();
  }

  userRole(userId)
  {
    if(this.isUserHero(userId))
    {
      return 'Hero';
    }
    if(this.isUserWizard(userId))
    {
      return 'Wizard';
    }
    return 'Spectator';
  }

  partnerId(userId)
  {
    if(this.isUserHero(userId))
    {
      return this.players.wizardId;
    }
    if(this.isUserWizard(userId))
    {
      return this.players.heroId;
    }
    return null;
  }

  get isEmpty()
  {
    return this.isHeroOpen ? this.isWizardOpen : false;
  }

  get isOpen()
  {
    /* Open if one position is available.
     * 0 means the game is full. 2 means an error has occured.
     */
    return this.isHeroOpen ? !this.isWizardOpen : this.isWizardOpen;
  }

  get isHeroOpen()
  {
    return this.players.heroId.toString() === '';
  }

  get isWizardOpen()
  {
    return this.players.wizardId.toString() === '';
  }

  get isReadyToPlay()
  {
    return !this.isHeroOpen ? !this.isWizardOpen : false;
  }

  get hostId()
  {
    return this.isHostHero ? this.players.heroId : this.players.wizardId;
  }

  static findAllOpen(fn)
  {
    Game.findAllOpenHero(heroGames=>
    {
      Game.findAllOpenWizard(wizardGames=>
      {
        var games = heroGames.concat(wizardGames);
        fn(games);
      });
    });
  }

  static findAllOpenHero(fn)
  {
    Base.findByProperties({'players.heroId': ''}, Game, gameCollection, fn);
  }

  static findAllOpenWizard(fn)
  {
    Base.findByProperties({'players.wizardId': ''}, Game, gameCollection, fn);
  }

  static findById(id, fn)
  {
    Base.findById(id, Game, gameCollection, fn);
  }

  static findByIdOrPlayerId(id, fn)
  {
    Game.findById(id, game=>
    {
      if(game)
      {
        fn(game);
      }
      else
      {
        Game.findByPlayerId(id, game=>
        {
          if(game)
          {
            fn(game);
          }
          else
          {
            fn(null);
          }
        });
      }
    });
  }

  static findByPlayerId(playerId, fn)
  {
    Game.findByHeroId(playerId, game=>
    {
      if(game)
      {
        fn(game);
      }
      else
      {
        Game.findByWizardId(playerId, game=>
        {
          if(game)
          {
            fn(game);
          }
          else
          {
            fn(null);
          }
        });
      }
    });
  }

  static findByHeroId(heroId, fn)
  {
    heroId = Mongo.ObjectID(heroId);
    Base.findOneByProperties({'players.heroId': heroId}, Game, gameCollection, fn);
  }

  static findByWizardId(wizardId, fn)
  {
    wizardId = Mongo.ObjectID(wizardId);
    Base.findOneByProperties({'players.wizardId': wizardId}, Game, gameCollection, fn);
  }

  static findPartnerId(userId, fn)
  {
    Game.findByPlayerId(userId, game=>
    {
      if(game)
      {
        fn(game.partnerId(userId));
      }
      else
      {
        fn(null);
      }
    });
  }

  static create(obj, fn)
  {
    Game.findByPlayerId(obj.userId, game=>
    {
      if(game)
      {
        game.quit(obj.userId, createNewGame);
      }
      else
      {
        createNewGame();
      }
    });

    function createNewGame()
    {
      Base.create(obj, Game, gameCollection, game=>
      {
        if(game)
        {
          fn(game);
        }
        else
        {
          fn(null);
        }
      });
    }
  }
}

module.exports = Game;