/* exported clamp, randomInt */

'use strict';

function clamp(num, min=0, max=1)
{
  num = num < min ? min : num;
  num = num > max ? max : num;
  return num;
}

function randomInt(min=0, max=100)
{
  return min + Math.floor(Math.random()*(max-min+1));
}

$(function()
{
  $('#logout').on('click', logout);

  $('.modal').each((i, modal)=>
  {
    var button = `<a href='#close' title='Close' class='close'>X</a>`;
    $(modal).children('div').prepend(button);
  });

  function logout()
  {
    $(this).closest('form').submit();
  }
});