'use strict';

var Mongo = require('mongodb');
var _ = require('lodash');

class Base
{
  static destroy(id, collection, fn)
  {
    collection.remove({_id: id}, fn);
  }

  static save(instance, collection, fn)
  {
    if(instance._id)
    {
      collection.save(instance, ()=>fn(instance));
    }
    else
    {
      collection.save(instance, (e, instance)=>fn(instance));
    }
  }

  static findById(id, Model, collection, fn)
  {
    if(typeof id === 'string')
    {
      if(id.length !== 24)
      {
        fn(null);
        return;
      }
      id = Mongo.ObjectID(id);
    }

    if(!(id instanceof Mongo.ObjectID))
    {
      fn(null);
      return;
    }

    collection.findOne({_id:id}, (e, instance)=>
    {
      if(instance)
      {
        instance = _.create(Model.prototype, instance);
        fn(instance);
      }
      else
      {
        fn(null);
      }
    });
  }

  static findByProperties(properties, Model, collection, fn)
  {
    collection.find(properties).toArray((e, instances)=>
    {
      instances = instances.map(instance=>_.create(Model.prototype, instance));
      fn(instances);
    });
  }

  static findOneByProperties(properties, Model, collection, fn)
  {
    collection.findOne(properties, (e, instance)=>
    {
      if(instance)
      {
        instance = _.create(Model.prototype, instance);
      }
      fn(instance);
    });
  }

  static create(obj, Model, collection, fn)
  {
    var instance = new Model(obj);
    collection.save(instance, (e, instance)=>
    {
      fn(instance);
    });
  }
}

module.exports = Base;