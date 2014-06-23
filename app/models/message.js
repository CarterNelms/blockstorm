'use strict';

var messageCollection = global.nss.db.collection('messages');
var Mongo = require('mongodb');
var traceur = require('traceur');
var Base = traceur.require(__dirname + '/base.js');
var sort = traceur.require(__dirname + '/../lib/sort.js');

class Message{
  constructor(obj){
    this.senderId = Mongo.ObjectID(obj.senderId);
    this.recipientId = Mongo.ObjectID(obj.recipientId);
    this.body = obj.body;
    this.isRead = false;
    this.date = new Date();
  }

  static create(obj, fn){
    Base.create(obj, Message, messageCollection, fn);
  }

  static findById(id, func){
    Base.findById(id, Message, messageCollection, func);
  }

  static findBySenderId(senderId, fn)
  {
    senderId = Mongo.ObjectID(senderId);
    Base.findByProperties({senderId: senderId}, Message, messageCollection, fn);
  }

  static findByRecipientId(recipientId, fn)
  {
    recipientId = Mongo.ObjectID(recipientId);
    Base.findByProperties({recipientId: recipientId}, Message, messageCollection, fn);
  }

  static getHistoryByIds(id1, id2, fn)
  {
    Message.getOneWayHistoryByIds(id1, id2, msgs1=>
    {
      Message.getOneWayHistoryByIds(id2, id1, msgs2=>
      {
        var messages = sort.messages.byDate(msgs1.concat(msgs2));
        fn(messages);
      });
    });
  }

  static getOneWayHistoryByIds(senderId, recipientId, fn)
  {
    senderId = Mongo.ObjectID(senderId);
    recipientId = Mongo.ObjectID(recipientId);

    Base.findByProperties({senderId: senderId, recipientId: recipientId}, Message, messageCollection, messages=>
    {
      messages = sort.messages.byDate(messages);
      fn(messages);
    });
  }
}

module.exports = Message;