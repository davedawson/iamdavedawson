var sitename = {
    
}

	
jQuery(document).ready(function() {

	enquire.register("screen and (min-width:768px)", function() {

    //execute some code for large-screen devices
    // $('.matchheight').matchHeight();

  }, true);
  enquire.register("screen and (max-width:767px)", function() {

    //execute some code for small-screen devices
    // $('.item').matchHeight({ remove: true });

  }, true);
})