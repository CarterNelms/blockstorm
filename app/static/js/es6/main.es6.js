/* exported clamp, randomInt, ajax */

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

function ajax(url, type, data={}, success=r=>console.log(r), dataType='html')
{
  $.ajax(
  {
    url: url,
    type: type,
    dataType: dataType,
    data: data,
    success: success
  });
}

$(function()
{
  $('#logout').on('click', logout);

  $('.modal').each((i, modal)=>
  {
    var button = `<a href='#close' title='Close' class='close'>x</a>`;
    $(modal).children('div').prepend(button);
  });

  $('.sectioned > *:not(:last-child)').each((i, section)=>
  {
    var backToTop = `<a href='#header'><button class=white>Back To Top</button></a>`;
    $(section).append(backToTop);
  });

  function logout()
  {
    $(this).closest('form').submit();
  }
});