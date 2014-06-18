'use strict';

exports.connection = function(socket){
  socket.on('update', update);
};

function update(data)
{
  var socket = this;

  // socket.emit('update', data);
  socket.broadcast.emit('update', data);
}