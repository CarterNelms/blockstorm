/* jshint unused: false */

'use strict';

$(function()
{
  $('#login').on('click', login);

  function login(event)
  {
    var $form = $(this).closest('form');
    var useLocation = $form.find('input[type=checkbox][name=useLocation]').is(':checked');

    if(useLocation)
    {
      var options =
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      };

      navigator.geolocation.getCurrentPosition(pos=>
      {
        var lat = pos.coords.latitude;
        var lng = pos.coords.longitude;
        $form.find('input[name=latitude]').val(lat);
        $form.find('input[name=longitude]').val(lng);
        $form.submit();
      }, e=>console.log(e), options);
    }
    else
    {
      $form.submit();
    }

    event.preventDefault();
  }
});