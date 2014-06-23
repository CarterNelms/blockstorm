'use strict';

module.exports = {
  messages: {
    byDate: function(messages)
    {
      return messages.sort((a,b)=>(a.date < b.date ? -1 : (a.date > b.date ? 1 : 0)));
    }
  }
};