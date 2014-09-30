'use strict';

var traceur = require('traceur');
var User = traceur.require(__dirname + '/../models/user.js');
var sort = traceur.require(__dirname + '/../lib/sort.js');

exports.lookup = (req, res, next)=>
{
  var userId = req.session.userId;
  if(userId)
  {
    User.findById(userId, user=>
    {
      res.locals.user = user;
      if(user)
      {
        user.getLastMsgPerPartner(lastMessages=>
        {
          res.locals.lastMessages = lastMessages;
          next();
        });
      }
      else
      {
        next();
      }
      next();
    });
  }
  else
  {
    next();
  }
};

exports.index = (req, res)=>
{
  User.findAllVerified(users=>
  {
    res.render('users/index', {users: sort.users.byHighScore(users)});
  });
};

exports.profile = (req, res)=>
{
  var userId = req.params.userId;
  User.findById(userId, owner=>
  {
    if(res.locals.user)
    {
      res.locals.user.distanceFromOtherUserById(owner._id, distance=>
      {
        res.render('users/profile', {owner: owner, distance: distance});
      });
    }
    else
    {
      res.render('users/profile', {owner: owner});
    }
  });
};

exports.submitScore = (req, res)=>
{
  var userId = req.params.userId;
  User.findById(userId, user=>
  {
    var score = req.body.score;
    if(user)
    {
      user.submitScore(score, user=>
      {
        res.send({score: user.highScore});
      });
    }
    else
    {
      res.send({score: score});
    }
  });
};

exports.login = (req, res)=>
{
  if(!req.session.userId)
  {
    res.render('users/login');
  }
  else
  {
    res.redirect('/');
  }
};

exports.authenticate = (req, res)=>
{
  User.login(req.body, user=>
  {
    if(user)
    {
      req.session.userId = user._id;
      req.flash('message', "Welcome back, " + user.username + ".");
      res.redirect('/');
    }
    else
    {
      req.flash('message', 'Your email / password combination could not be verified. Please double check your credentials and try again.');
      res.redirect('/login');
    }
  });
};

exports.logout = (req, res)=>
{
  req.session.userId = null;
  req.flash('message', 'You have successfully logged out. Thanks for playing!');
  res.redirect('/');
};

exports.register = (req, res)=>
{
  if(!req.session.userId)
  {
    res.render('users/register');
  }
  else
  {
    res.redirect('/');
  }
};

exports.create = (req, res)=>
{
  User.create(req.body, (user, msg)=>
  {
    if(msg){ req.flash('message', msg); }
    if(user)
    {
      res.redirect('/');
    }
    else
    {
      res.redirect('/register');
    }
  });
};

exports.verify = (req, res)=>
{
  User.findById(req.params.userId, user=>
  {
    if(user)
    {
      user.verify(()=>
      {
        res.redirect('/login');
      });
    }
    else
    {
      res.redirect('/');
    }
  });
};