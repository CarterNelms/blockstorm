/* jshint unused: false */

'use strict';

var userCollection = global.nss.db.collection('users');
var traceur = require('traceur');
var Base = traceur.require(__dirname + '/base.js');
var Message = traceur.require(__dirname + '/message.js');
var request = require('request');
var bcrypt = require('bcrypt');
var _ = require('lodash');
var sort = traceur.require(__dirname + '/../lib/sort.js');

class User
{
  constructor(obj)
  {
    this.email = obj.email;
    this.username = obj.username;
    this.password = bcrypt.hashSync(obj.password[0], 8);
    this.color = obj.color;
    this.isValid = false;
    this.highScore = 0;
    this.location = {
      latitude: null,
      longitude: null
    };
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

  getLastMsgPerPartner(fn)
  {
    this.getPastChatPartners(partners=>
    {
      var lastMessages = [];
      var messagesLeft = partners.length;
      partners.forEach(partner=>
      {
        Message.getHistoryByIds(this._id, partner._id, messages=>
        {
          var lastMessage = messages[messages.length-1];
          lastMessages.push(lastMessage);

          if(!(--messagesLeft))
          {
            lastMessages = sort.messages.byDate(lastMessages);
            var lastChats = {
              messages: lastMessages,
              partners: partners
            };
            fn(lastChats);
          }
        });
      });
    });
  }

  getAllMessages(fn)
  {
    Message.findBySenderId(this._id, sent=>
    {
      Message.findByRecipientId(this._id, received=>
      {
        var messages = sent.concat(received);
        fn(messages);
      });
    });
  }

  getPastChatPartners(fn)
  {
    this.getAllMessages(messages=>
    {
      var partnerIds = _(messages).map(message=>
      {
        var isSender = message.senderId.toString() === this._id.toString();
        if(isSender)
        {
          return message.recipientId;
        }
        return message.senderId;
      }).map(id=>id.toString()).unique().value();

      var partners = [];
      var parntersLeft = partnerIds.length;
      partnerIds.forEach(partnerId=>
      {
        User.findById(partnerId, partner=>
        {
          partners.push(partner);
          if(!(--parntersLeft))
          {
            fn(partners);
          }
        });
      });
    });
  }

  updateLocation(location, fn)
  {
    this.location = location;
    this.save(user=>fn(user));
  }

  distanceFromOtherUserById(targetId, fn)
  {
    User.findById(targetId, target=>
    {
      fn(distance(this.location, target.location));

      function distance(loc1, loc2)
      {
        if(loc1.latitude && loc1.longitude && loc2.latitude && loc2.longitude)
        {
          var R = 6371; // km
          var lat1 = toRad(loc1.latitude);
          var lat2 = toRad(loc2.latitude);
          var dLat = toRad((loc2.latitude-loc1.latitude));
          var dLng = toRad((loc2.longitude-loc1.longitude));

          var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
          var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

          var d = R * c;

          var miles = d * 1000 * 100 / 2.54 / 12 / 5280;
          return miles;
        }
        return null;

        function toRad(num)
        {
          return num * Math.PI / 180;
        }
      }
    });
  }

  submitScore(score, fn)
  {
    score *= 1;
    if(score > this.highScore)
    {
      this.highScore = score;
      this.save(user=>fn(user));
    }
    else
    {
      fn(this);
    }
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
          if(obj.useLocation && obj.latitude && obj.longitude)
          {
            var location = {
              latitude: obj.latitude,
              longitude: obj.longitude
            };
            user.updateLocation(location, user=>
            {
              fn(user);
            });
          }
          else
          {
            fn(user);
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