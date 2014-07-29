/* global describe, it, before, beforeEach, after */
/* jshint expr:true */

'use strict';

process.env.DBNAME = 'blockstorm-test';

var expect = require('chai').expect;
var Mongo = require('mongodb');
var traceur = require('traceur');
var db = traceur.require(__dirname + '/../../helpers/db.js');
var factory = traceur.require(__dirname + '/../../helpers/factory.js');

var User;

describe('User', function(){
  before(function(done){
    db(function(){
      User = traceur.require(__dirname + '/../../../app/models/user.js');
      done();
    });
  });

  beforeEach(function(done){
    global.nss.db.collection('users').drop(function(){
      factory('user', function(users){
        done();
      });
    });
  });

  after(function(done)
  {
    global.nss.db.collection('users').drop(function(){done();});
  });

  describe('.create', function(){
    it('should successfully create a user', function(done){
      User.create({username:'bob-2', email:'e@b.com', password:['1234!@#$','1234!@#$']}, function(u){
        expect(u).to.be.ok;
        expect(u).to.be.an.instanceof(User);
        expect(u._id).to.be.an.instanceof(Mongo.ObjectID);
        expect(u.password).to.have.length(60);
        expect(u.email).to.equal('e@b.com');
        expect(u.username).to.equal('bob-2');
        done();
      });
    });

    it('should NOT successfully create a user - short username', function(done){
      User.create({username:'bob1', email:'e@b.com', password:['1234!@#$','1234!@#$']}, function(u){
        expect(u).to.be.null;
        done();
      });
    });

    it('should NOT successfully create a user - long username', function(done){
      User.create({username:'bob12345678901234567890', email:'e@b.com', password:['1234!@#$','1234!@#$']}, function(u){
        expect(u).to.be.null;
        done();
      });
    });

    it('should NOT successfully create a user - invalid username characters', function(done){
      User.create({username:'bob12@', email:'e@b.com', password:['1234!@#$','1234!@#$']}, function(u){
        expect(u).to.be.null;
        done();
      });
    });

    it('should NOT successfully create a user - space in username', function(done){
      User.create({username:'bob -2', email:'e@b.com', password:['1234!@#$','1234!@#$']}, function(u){
        expect(u).to.be.null;
        done();
      });
    });

    it('should NOT successfully create a user - short password', function(done){
      User.create({username:'bob12', email:'e@b.com', password:['12wer','12wer']}, function(u){
        expect(u).to.be.null;
        done();
      });
    });

    it('should NOT successfully create a user - long password', function(done){
      User.create({username:'bob12', email:'e@b.com', password:['12wer1234567890!@#$%^&*()qweE','12wer1234567890!@#$%^&*()qweE']}, function(u){
        expect(u).to.be.null;
        done();
      });
    });

    // it('should NOT successfully create a user - invalid password characters', function(done){
    //   User.create({username:'bob12', email:'e@b.com', password:'[]'}, function(u){
    //     expect(u).to.be.null;
    //     done();
    //   });
    // });

    it('should NOT successfully create a user - password not diverse enough', function(done){
      User.create({username:'bob12', email:'e@b.com', password:['password','password']}, function(u){
        expect(u).to.be.null;
        done();
      });
    });

    it('should NOT successfully create a user - passwords do not match', function(done){
      User.create({username:'bob12', email:'e@b.com', password:['1234qwer','1234rewq']}, function(u){
        expect(u).to.be.null;
        done();
      });
    });

    it('should NOT successfully create a user - space in password', function(done){
      User.create({username:'bob12', email:'e@b.com', password:['1234qwe r','1234qwe r']}, function(u){
        expect(u).to.be.null;
        done();
      });
    });
  });

  describe('.findById', function(){
    it('should successfully find a user - String', function(done){
      User.create({username:'bob-2', email:'e@b.com', password:['1234!@#$','1234!@#$']}, function(u)
      {
        User.findById(Mongo.ObjectID(u._id), function(u2)
        {
          expect(u2).to.be.instanceof(User);
          expect(u2.email).to.equal('e@b.com');
          expect(u2.username).to.equal('bob-2');
          done();
        });
      });
    });

    it('should successfully find a user - object id', function(done){
      User.create({username:'bob-2', email:'e@b.com', password:['1234!@#$','1234!@#$']}, function(u)
      {
        User.findById(u._id.toString(), function(u2)
        {
          expect(u2).to.be.instanceof(User);
          expect(u2.email).to.equal('e@b.com');
          expect(u2.username).to.equal('bob-2');
          done();
        });
      });
    });

    it('should NOT successfully find a user - Bad Id', function(done){
      User.findById('not an id', function(u){
        expect(u).to.be.null;
        done();
      });
    });

    it('should NOT successfully find a user - NULL', function(done){
      User.findById(null, function(u){
        expect(u).to.be.null;
        done();
      });
    });

    it('should NOT successfully find a user - id not assigned', function(done){
      User.findById('111111111111111111111111', function(u){
        expect(u).to.be.null;
        done();
      });
    });
  });

  describe('.findByEmail', function(){
    it('should successfully find a user', function(done){
      User.findByEmail('a@b.com', function(u)
      {
        expect(u).to.be.instanceof(User);
        expect(u.email).to.equal('a@b.com');
        expect(u.username).to.equal('sue12');
        done();
      });
    });

    it('should NOT successfully find a user - bad email', function(done){
      User.findByEmail('this is not even an email', function(u){
        expect(u).to.be.null;
        done();
      });
    });

    it('should NOT successfully find a user - NULL', function(done){
      User.findByEmail(null, function(u){
        expect(u).to.be.null;
        done();
      });
    });

    it('should NOT successfully find a user - email not in use', function(done){
      User.findByEmail('bad@wrong.gov', function(u){
        expect(u).to.be.null;
        done();
      });
    });
  });

  describe('.verify', function(){
    it('should successfully verify a user account', function(done){
      User.findByEmail('a@b.com', function(user)
      {
        expect(user).to.be.ok;
        expect(user.isValid).to.be.false;
        user.verify(function(u)
        {
          expect(u).to.be.ok;
          expect(u.isValid).to.be.true;
          done();
        });
      });
    });
  });

  describe('.save', function(){
    it('should successfully save a newly constructed user', function(done){
      var user = new User({username: 'ted123', email: 'f@b.com', password:['1234asD6','1234asD6']});
      user.save(function(u)
      {
        expect(u).to.be.ok;
        expect(u).to.be.instanceof(User);
        expect(u._id).be.ok;
        expect(u._id).be.instanceof(Mongo.ObjectID);
        User.findById(u._id, function(u2)
        {
          expect(u2).to.be.ok;
          expect(u).to.be.instanceof(User);
          done();
        });
      });
    });
  });

  describe('.login', function(){
    it('should successfully login a user', function(done){
      User.findByEmail('a@b.com', function(user)
      {
        user.verify(function(user)
        {
          User.login({email:'a@b.com', password:'lessthan3redranger'}, function(u){
            expect(u).to.be.ok;
            expect(u.email).to.equal('a@b.com');
            done();
          });
        });
      });
    });

    it('should NOT login a user - account is not activated', function(done){
      User.login({email:'a@b.com', password:'lessthan3redranger'}, function(u){
        expect(u).to.be.null;
        done();
      });
    });

    it('should NOT login user - bad email', function(done){
      User.login({email:'aa@b.com', password:'lessthan3redranger'}, function(u){
        expect(u).to.be.null;
        done();
      });
    });

    it('should NOT login user - bad password', function(done){
      User.login({email:'a@b.com', password:'wrong'}, function(u){
        expect(u).to.be.null;
        done();
      });
    });
  });
});
