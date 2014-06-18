/* global describe, it, before, beforeEach, after */ //, afterEach */

'use strict';

process.env.DBNAME = 'capstone-test';

// var cp = require('child_process');
var expect = require('chai').expect;
var traceur = require('traceur');
var db = traceur.require(__dirname + '/../../helpers/db.js');
var factory = traceur.require(__dirname + '/../../helpers/factory.js');
var app = require('../../../app/app');
var request = require('supertest');

var User;

describe('users', function(){

  before(function(done){
    db(function(){
      User = traceur.require(__dirname + '/../../../app/models/user.js');
      done();
    });
  });

  beforeEach(function(done){
    global.nss.db.collection('users').drop(function(){
      // cp.execFile(__dirname + '/../../fixtures/before.sh', {cwd:__dirname + '/../../fixtures'}, function(err, stdout, stderr){
      factory('user', function(users)
      {
        User.findByEmail('a@b.com', function(user)
        {
          user.verify(function(u)
          {
            done();
          });
        });
      });
      // });
    });
  });

  // afterEach(function(done){
  //   cp.execFile(__dirname + '/../../fixtures/after.sh', {cwd:__dirname + '/../../fixtures'}, function(err, stdout, stderr){
  //     done();
  //   });
  // });

  after(function(done)
  {
    global.nss.db.collection('users').drop(function(){done();});
  });

  describe('GET /login', function(){
    it('should get the user login page', function(done){
      request(app)
      .get('/login')
      .end(function(err, res){
        expect(res.status).to.equal(200);
        expect(res.req.path).to.equal('/login');
        done();
      });
    });
  });

  describe('POST /login', function(){
    it('should login a user', function(done){
      request(app)
      .post('/login')
      .send({
        email: 'a@b.com',
        password: 'lessthan3redranger'
      })
      .end(function(err, res){
        expect(res.status).to.equal(302);
        expect(res.headers.location).to.equal('/');
        done();
      });
    });

    it('should NOT login a user - account not yet verified', function(done){
      request(app)
      .post('/login')
      .send({
        email: 'b@b.com',
        password: 'password1'
      })
      .end(function(err, res){
        expect(res.status).to.equal(302);
        expect(res.headers.location).to.equal('/login');
        done();
      });
    });

    it('should NOT login a user - wrong password', function(done){
      request(app)
      .post('/login')
      .send({
        email: 'a@b.com',
        password: 'wrongPssword'
      })
      .end(function(err, res){
        expect(res.status).to.equal(302);
        expect(res.headers.location).to.equal('/login');
        done();
      });
    });


    it('should NOT login a user - wrong email', function(done){
      request(app)
      .post('/login')
      .send({
        email: 'aa@b.com',
        password: 'lessthan3redranger'
      })
      .end(function(err, res){
        expect(res.status).to.equal(302);
        expect(res.headers.location).to.equal('/login');
        done();
      });
    });
  });

  describe('GET /register', function(){
    it('should get the user register page', function(done){
      request(app)
      .get('/register')
      .end(function(err, res){
        expect(res.status).to.equal(200);
        expect(res.req.path).to.equal('/register');
        done();
      });
    });
  });

  describe('POST /register', function(){
    it('should create a new user', function(done){
      request(app)
      .post('/register')
      .send({
        email: 'f@b.com',
        username: 'fredRockz',
        password: ['fredzPassword','fredzPassword']
      })
      .end(function(err, res){
        expect(res.status).to.equal(302);
        expect(res.headers.location).to.equal('/');
        User.findByEmail('f@b.com', function(u)
        {
          expect(u.username).to.equal('fredRockz');
          done();
        });
      });
    });

    it('should NOT create a new user - email already in use', function(done){
      request(app)
      .post('/register')
      .send({
        email: 'a@b.com',
        username: 'fredRockz',
        password: ['fredzPassword','fredzPassword']
      })
      .end(function(err, res){
        expect(res.status).to.equal(302);
        expect(res.headers.location).to.equal('/register');
        User.findByEmail('a@b.com', function(u)
        {
          expect(u.username).to.equal('sue12');
          done();
        });
      });
    });
  });

  describe('POST /logout', function(){
    it('should logout an existing user', function(done){
      request(app)
      .post('/logout')
      .end(function(err, res){
        expect(res.status).to.equal(302);
        expect(res.headers.location).to.equal('/');
        done();
      });
    });
  });

  describe('GET /users/:userId/verify', function(){
    it('should verify a user account', function(done){
      User.findByEmail('b@b.com', function(u)
      {
        expect(u.isValid).to.equal(false);
        request(app)
        .get('/users/'+u._id+'/verify')
        .end(function(err, res){
          expect(res.status).to.equal(302);
          expect(res.headers.location).to.equal('/login');
          User.findByEmail('b@b.com', function(u)
          {
            expect(u.isValid).to.equal(true);
            done();
          });
        });
      });
    });
  });
});
