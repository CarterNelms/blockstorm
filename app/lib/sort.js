'use strict';

module.exports = {
  messages: {
    byDate: function(messages)
    {
      return messages.sort((a,b)=>(a.date < b.date ? -1 : (a.date > b.date ? 1 : 0)));
    }
  },
  users: {
    byHighScore: function(users)
    {
      return users.sort((a,b)=>a.highScore > b.highScore ? -1 : (a.highScore < b.highScore ? 1 : 0));
    }
  }
};