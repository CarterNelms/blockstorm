/* jshint unused: false */

'use strict';

var userCollection = global.nss.db.collection('users');
var traceur = require('traceur');
var Base = traceur.require(__dirname + '/base.js');
var request = require('request');
var bcrypt = require('bcrypt');

class User
{
  constructor(obj)
  {
    this.email = obj.email;
    this.username = obj.username;
    this.password = bcrypt.hashSync(obj.password[0], 8);
    this.isValid = false;
  }

  verify(fn)
  {
    this.isValid = true;
    this.save(fn);
  }

  save(fn)
  {
    Base.save(this, userCollection, fn);
  }

  static login(obj, fn=()=>{})
  {
    User.findByEmail(obj.email, user=>
    {
      if(user)
      {
        var isMatch = bcrypt.compareSync(obj.password, user.password);
        if(isMatch && user.isValid)
        {
          fn(user);
        }
        else
        {
          fn(null);
        }
      }
      else
      {
        fn(null);
      }
    });
  }

  static findById(id, fn)
  {
    Base.findById(id, User, userCollection, fn);
  }

  static findByEmail(email, fn)
  {
    Base.findOneByProperties({email: email}, User, userCollection, fn);
  }

  static findAllVerified(fn)
  {
    Base.findByProperties({isValid: true}, User, userCollection, fn);
  }

  static create(obj, fn)
  {
    User.findByEmail(obj.email, u=>
    {
      if(u)
      {
        fn(null);
      }
      else
      {
        if(obj.password[0] === obj.password[1])
        {
          if(isValidPassword(obj.password[0]))
          {
            if(isValidUsername(obj.username))
            {
              Base.create(obj, User, userCollection, user=>
              {
                if(user)
                {
                  sendVerificationEmail(user, fn);
                }
              });
            }
            else
            {
              fn(null);
            }
          }
          else
          {
            fn(null);
          }
        }
        else
        {
          fn(null);
        }
      }
    });
  }
}

function sendVerificationEmail(user, fn)
{
  var key = process.env.MAILGUN;
  var url = 'https://api:' + key + '@api.mailgun.net/v2/sandbox5d2443e5ce2c4eb5913ca6e0fd59c213.mailgun.org/messages';
  var post = request.post(url, (err, response, body)=>
  {
    console.log(body);
    fn(user);
  });

  var form = post.form();
  form.append('from', 'capstone@carternelms.com');
  form.append('to', user.email);
  form.append('subject', 'Email Verification');
  var link = `http://localhost:3000/users/${user._id}/verify`;
  form.append('html', `<a href="${link}">${link}</a>`);
}

function isValidPassword(password)
{
  var areCharsValid = /^[A-Za-z0-9`!"?$%\^&\*()_\-+={\[}\]:;@~#|<,>.'\/\\]+$/.test(password);
  var isLengthValid = password.length >= 7 && password.length <= 20;
  var doesContainNumber = /(?=.*\d)/.test(password);
  var doesContainUppercase = /(?=.*[A-Z])/.test(password);
  var doesContainLowercase = /(?=.*[a-z])/.test(password);
  var doesContainSymbol = /(?=.*[`!"?$%\^&\*()_\-+={\[}\]:;@~#|<,>.'\/\\])/.test(password);
  var isDiverse = doesContainNumber*1 + doesContainUppercase*1 + doesContainLowercase*1 + doesContainSymbol*1 >= 2;
  return areCharsValid && isLengthValid && isDiverse;
}

function isValidUsername(username)
{
  var areCharsValid = /^[A-Za-z0-9_\-]+$/.test(username);
  var isLengthValid = username.length >= 5 && username.length <= 20;
  return areCharsValid && isLengthValid;
}

module.exports = User;