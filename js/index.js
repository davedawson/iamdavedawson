var fitties;
var dd = {
    fitText: function(){
      fitties = fitty('.intro h3');
    }
}

	
jQuery(document).ready(function() {

	enquire.register("screen and (min-width:768px)", function() {

    //execute some code for large-screen devices
    dd.fitText();

  }, true);
  enquire.register("screen and (max-width:767px)", function() {

    //execute some code for small-screen devices
    // fitties[0].destroy();
    console.log('small screen');
  }, true);

  // On resize
  $( window ).resize(function() {
    // fitties[0].fit();
    // console.log('resize');
  });
})