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