/*
*************************************************

Dave Dawson
JavaScript Functions
Requires jQuery

Created by Cottleston Pie

*************************************************
*/

jQuery(document).ready(function() {

    var dd = {
      centerArrows: function(){
        $('.page-navigation .left').flexVerticalCenter();
      },
      projectSticky: function(){
        if ($(window).width() > 800) {
          $(".page-navigation").scrollToFixed( { bottom: 0, limit: $('.nav-wrap').offset().top } );
        }
      }
    };
    /*-------------------------------------------
        Initial Actions
    -------------------------------------------*/

    // Call methods like this

    // dd.centerArrows();
    dd.projectSticky();
});