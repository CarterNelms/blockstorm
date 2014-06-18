'use strict';

var traceur = require('traceur');
var User = traceur.require(__dirname + '/../models/user.js');

exports.lookup = (req, res, next)=>
{
  var userId = req.session.userId;
  if(userId)
  {
    console.log(userId);
    User.findById(userId, user=>
    {
      console.log(user);
      res.locals.user = user;
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
    res.render('users/index', {users: users});
  });
};

exports.profile = (req, res)=>
{
  var userId = req.params.userId;
  User.findById(userId, owner=>
  {
    res.render('users/profile', {owner: owner});
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
      res.redirect('/');
    }
    else
    {
      res.redirect('/login');
    }
  });
};

exports.logout = (req, res)=>
{
  req.session = null;
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
  User.create(req.body, user=>
  {
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