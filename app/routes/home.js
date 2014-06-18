'use strict';

exports.index = (req, res)=>{
  res.render('home/index');
};

exports.about = (req, res)=>{
  res.render('home/about');
};