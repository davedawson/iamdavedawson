 /**
 * jquery.matchHeight.js master
 * http://brm.io/jquery-match-height/
 * License: MIT
 */
 
 ;(function(factory) { // eslint-disable-line no-extra-semi
     'use strict';
     if (typeof define === 'function' && define.amd) {
         // AMD
         define(['jquery'], factory);
     } else if (typeof module !== 'undefined' && module.exports) {
         // CommonJS
         module.exports = factory(require('jquery'));
     } else {
         // Global
         factory(jQuery);
     }
 })(function($) {
     /*
     *  internal
     */
 
     var _previousResizeWidth = -1,
         _updateTimeout = -1;
 
     /*
     *  _parse
     *  value parse utility function
     */
 
     var _parse = function(value) {
         // parse value and convert NaN to 0
         return parseFloat(value) || 0;
     };
 
     /*
     *  _rows
     *  utility function returns array of jQuery selections representing each row
     *  (as displayed after float wrapping applied by browser)
     */
 
     var _rows = function(elements) {
         var tolerance = 1,
             $elements = $(elements),
             lastTop = null,
             rows = [];
 
         // group elements by their top position
         $elements.each(function(){
             var $that = $(this),
                 top = $that.offset().top - _parse($that.css('margin-top')),
                 lastRow = rows.length > 0 ? rows[rows.length - 1] : null;
 
             if (lastRow === null) {
                 // first item on the row, so just push it
                 rows.push($that);
             } else {
                 // if the row top is the same, add to the row group
                 if (Math.floor(Math.abs(lastTop - top)) <= tolerance) {
                     rows[rows.length - 1] = lastRow.add($that);
                 } else {
                     // otherwise start a new row group
                     rows.push($that);
                 }
             }
 
             // keep track of the last row top
             lastTop = top;
         });
 
         return rows;
     };
 
     /*
     *  _parseOptions
     *  handle plugin options
     */
 
     var _parseOptions = function(options) {
         var opts = {
             byRow: true,
             property: 'height',
             target: null,
             remove: false
         };
 
         if (typeof options === 'object') {
             return $.extend(opts, options);
         }
 
         if (typeof options === 'boolean') {
             opts.byRow = options;
         } else if (options === 'remove') {
             opts.remove = true;
         }
 
         return opts;
     };
 
     /*
     *  matchHeight
     *  plugin definition
     */
 
     var matchHeight = $.fn.matchHeight = function(options) {
         var opts = _parseOptions(options);
 
         // handle remove
         if (opts.remove) {
             var that = this;
 
             // remove fixed height from all selected elements
             this.css(opts.property, '');
 
             // remove selected elements from all groups
             $.each(matchHeight._groups, function(key, group) {
                 group.elements = group.elements.not(that);
             });
 
             // TODO: cleanup empty groups
 
             return this;
         }
 
         if (this.length <= 1 && !opts.target) {
             return this;
         }
 
         // keep track of this group so we can re-apply later on load and resize events
         matchHeight._groups.push({
             elements: this,
             options: opts
         });
 
         // match each element's height to the tallest element in the selection
         matchHeight._apply(this, opts);
 
         return this;
     };
 
     /*
     *  plugin global options
     */
 
     matchHeight.version = 'master';
     matchHeight._groups = [];
     matchHeight._throttle = 80;
     matchHeight._maintainScroll = false;
     matchHeight._beforeUpdate = null;
     matchHeight._afterUpdate = null;
     matchHeight._rows = _rows;
     matchHeight._parse = _parse;
     matchHeight._parseOptions = _parseOptions;
 
     /*
     *  matchHeight._apply
     *  apply matchHeight to given elements
     */
 
     matchHeight._apply = function(elements, options) {
         var opts = _parseOptions(options),
             $elements = $(elements),
             rows = [$elements];
 
         // take note of scroll position
         var scrollTop = $(window).scrollTop(),
             htmlHeight = $('html').outerHeight(true);
 
         // get hidden parents
         var $hiddenParents = $elements.parents().filter(':hidden');
 
         // cache the original inline style
         $hiddenParents.each(function() {
             var $that = $(this);
             $that.data('style-cache', $that.attr('style'));
         });
 
         // temporarily must force hidden parents visible
         $hiddenParents.css('display', 'block');
 
         // get rows if using byRow, otherwise assume one row
         if (opts.byRow && !opts.target) {
 
             // must first force an arbitrary equal height so floating elements break evenly
             $elements.each(function() {
                 var $that = $(this),
                     display = $that.css('display');
 
                 // temporarily force a usable display value
                 if (display !== 'inline-block' && display !== 'flex' && display !== 'inline-flex') {
                     display = 'block';
                 }
 
                 // cache the original inline style
                 $that.data('style-cache', $that.attr('style'));
 
                 $that.css({
                     'display': display,
                     'padding-top': '0',
                     'padding-bottom': '0',
                     'margin-top': '0',
                     'margin-bottom': '0',
                     'border-top-width': '0',
                     'border-bottom-width': '0',
                     'height': '100px',
                     'overflow': 'hidden'
                 });
             });
 
             // get the array of rows (based on element top position)
             rows = _rows($elements);
 
             // revert original inline styles
             $elements.each(function() {
                 var $that = $(this);
                 $that.attr('style', $that.data('style-cache') || '');
             });
         }
 
         $.each(rows, function(key, row) {
             var $row = $(row),
                 targetHeight = 0;
 
             if (!opts.target) {
                 // skip apply to rows with only one item
                 if (opts.byRow && $row.length <= 1) {
                     $row.css(opts.property, '');
                     return;
                 }
 
                 // iterate the row and find the max height
                 $row.each(function(){
                     var $that = $(this),
                         display = $that.css('display');
 
                     // temporarily force a usable display value
                     if (display !== 'inline-block' && display !== 'flex' && display !== 'inline-flex') {
                         display = 'block';
                     }
 
                     // ensure we get the correct actual height (and not a previously set height value)
                     var css = { 'display': display };
                     css[opts.property] = '';
                     $that.css(css);
 
                     // find the max height (including padding, but not margin)
                     if ($that.outerHeight(false) > targetHeight) {
                         targetHeight = $that.outerHeight(false);
                     }
 
                     // revert display block
                     $that.css('display', '');
                 });
             } else {
                 // if target set, use the height of the target element
                 targetHeight = opts.target.outerHeight(false);
             }
 
             // iterate the row and apply the height to all elements
             $row.each(function(){
                 var $that = $(this),
                     verticalPadding = 0;
 
                 // don't apply to a target
                 if (opts.target && $that.is(opts.target)) {
                     return;
                 }
 
                 // handle padding and border correctly (required when not using border-box)
                 if ($that.css('box-sizing') !== 'border-box') {
                     verticalPadding += _parse($that.css('border-top-width')) + _parse($that.css('border-bottom-width'));
                     verticalPadding += _parse($that.css('padding-top')) + _parse($that.css('padding-bottom'));
                 }
 
                 // set the height (accounting for padding and border)
                 $that.css(opts.property, (targetHeight - verticalPadding) + 'px');
             });
         });
 
         // revert hidden parents
         $hiddenParents.each(function() {
             var $that = $(this);
             $that.attr('style', $that.data('style-cache') || null);
         });
 
         // restore scroll position if enabled
         if (matchHeight._maintainScroll) {
             $(window).scrollTop((scrollTop / htmlHeight) * $('html').outerHeight(true));
         }
 
         return this;
     };
 
     /*
     *  matchHeight._applyDataApi
     *  applies matchHeight to all elements with a data-match-height attribute
     */
 
     matchHeight._applyDataApi = function() {
         var groups = {};
 
         // generate groups by their groupId set by elements using data-match-height
         $('[data-match-height], [data-mh]').each(function() {
             var $this = $(this),
                 groupId = $this.attr('data-mh') || $this.attr('data-match-height');
 
             if (groupId in groups) {
                 groups[groupId] = groups[groupId].add($this);
             } else {
                 groups[groupId] = $this;
             }
         });
 
         // apply matchHeight to each group
         $.each(groups, function() {
             this.matchHeight(true);
         });
     };
 
     /*
     *  matchHeight._update
     *  updates matchHeight on all current groups with their correct options
     */
 
     var _update = function(event) {
         if (matchHeight._beforeUpdate) {
             matchHeight._beforeUpdate(event, matchHeight._groups);
         }
 
         $.each(matchHeight._groups, function() {
             matchHeight._apply(this.elements, this.options);
         });
 
         if (matchHeight._afterUpdate) {
             matchHeight._afterUpdate(event, matchHeight._groups);
         }
     };
 
     matchHeight._update = function(throttle, event) {
         // prevent update if fired from a resize event
         // where the viewport width hasn't actually changed
         // fixes an event looping bug in IE8
         if (event && event.type === 'resize') {
             var windowWidth = $(window).width();
             if (windowWidth === _previousResizeWidth) {
                 return;
             }
             _previousResizeWidth = windowWidth;
         }
 
         // throttle updates
         if (!throttle) {
             _update(event);
         } else if (_updateTimeout === -1) {
             _updateTimeout = setTimeout(function() {
                 _update(event);
                 _updateTimeout = -1;
             }, matchHeight._throttle);
         }
     };
 
     /*
     *  bind events
     */
 
     // apply on DOM ready event
     $(matchHeight._applyDataApi);
 
     // update heights on load and resize events
     $(window).bind('load', function(event) {
         matchHeight._update(false, event);
     });
 
     // throttled update heights on resize events
     $(window).bind('resize orientationchange', function(event) {
         matchHeight._update(true, event);
     });
 
 });
 
 
 /*!
  * enquire.js v2.1.2 - Awesome Media Queries in JavaScript
  * Copyright (c) 2014 Nick Williams - http://wicky.nillia.ms/enquire.js
  * License: MIT (http://www.opensource.org/licenses/mit-license.php)
  */
 
 !function(a,b,c){var d=window.matchMedia;"undefined"!=typeof module&&module.exports?module.exports=c(d):"function"==typeof define&&define.amd?define(function(){return b[a]=c(d)}):b[a]=c(d)}("enquire",this,function(a){"use strict";function b(a,b){var c,d=0,e=a.length;for(d;e>d&&(c=b(a[d],d),c!==!1);d++);}function c(a){return"[object Array]"===Object.prototype.toString.apply(a)}function d(a){return"function"==typeof a}function e(a){this.options=a,!a.deferSetup&&this.setup()}function f(b,c){this.query=b,this.isUnconditional=c,this.handlers=[],this.mql=a(b);var d=this;this.listener=function(a){d.mql=a,d.assess()},this.mql.addListener(this.listener)}function g(){if(!a)throw new Error("matchMedia not present, legacy browsers require a polyfill");this.queries={},this.browserIsIncapable=!a("only all").matches}return e.prototype={setup:function(){this.options.setup&&this.options.setup(),this.initialised=!0},on:function(){!this.initialised&&this.setup(),this.options.match&&this.options.match()},off:function(){this.options.unmatch&&this.options.unmatch()},destroy:function(){this.options.destroy?this.options.destroy():this.off()},equals:function(a){return this.options===a||this.options.match===a}},f.prototype={addHandler:function(a){var b=new e(a);this.handlers.push(b),this.matches()&&b.on()},removeHandler:function(a){var c=this.handlers;b(c,function(b,d){return b.equals(a)?(b.destroy(),!c.splice(d,1)):void 0})},matches:function(){return this.mql.matches||this.isUnconditional},clear:function(){b(this.handlers,function(a){a.destroy()}),this.mql.removeListener(this.listener),this.handlers.length=0},assess:function(){var a=this.matches()?"on":"off";b(this.handlers,function(b){b[a]()})}},g.prototype={register:function(a,e,g){var h=this.queries,i=g&&this.browserIsIncapable;return h[a]||(h[a]=new f(a,i)),d(e)&&(e={match:e}),c(e)||(e=[e]),b(e,function(b){d(b)&&(b={match:b}),h[a].addHandler(b)}),this},unregister:function(a,b){var c=this.queries[a];return c&&(b?c.removeHandler(b):(c.clear(),delete this.queries[a])),this}},new g});

/*
 * fitty v2.3.0 - Snugly resizes text to fit its parent container
 * Copyright (c) 2020 Rik Schennink <rik@pqina.nl> (https://pqina.nl/)
 */
!function(e,t){if("function"==typeof define&&define.amd)define(["module","exports"],t);else if("undefined"!=typeof exports)t(module,exports);else{var n={exports:{}};t(n,n.exports),e.fitty=n.exports}}(this,function(e,t){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var E=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var i in n)Object.prototype.hasOwnProperty.call(n,i)&&(e[i]=n[i])}return e};t.default=function(n){if(n){var r={IDLE:0,DIRTY_CONTENT:1,DIRTY_LAYOUT:2,DIRTY:3},i=[],e=null,o="requestAnimationFrame"in n?function(){n.cancelAnimationFrame(e),e=n.requestAnimationFrame(function(){return u(i.filter(function(e){return e.dirty&&e.active}))})}:function(){},t=function(t){return function(){i.forEach(function(e){return e.dirty=t}),o()}},u=function(e){e.filter(function(e){return!e.styleComputed}).forEach(function(e){e.styleComputed=s(e)}),e.filter(f).forEach(d);var t=e.filter(c);t.forEach(l),t.forEach(function(e){d(e),a(e)}),t.forEach(p)},a=function(e){return e.dirty=r.IDLE},l=function(e){e.availableWidth=e.element.parentNode.clientWidth,e.currentWidth=e.element.scrollWidth,e.previousFontSize=e.currentFontSize,e.currentFontSize=Math.min(Math.max(e.minSize,e.availableWidth/e.currentWidth*e.previousFontSize),e.maxSize),e.whiteSpace=e.multiLine&&e.currentFontSize===e.minSize?"normal":"nowrap"},c=function(e){return e.dirty!==r.DIRTY_LAYOUT||e.dirty===r.DIRTY_LAYOUT&&e.element.parentNode.clientWidth!==e.availableWidth},s=function(e){var t=n.getComputedStyle(e.element,null);e.currentFontSize=parseInt(t.getPropertyValue("font-size"),10),e.display=t.getPropertyValue("display"),e.whiteSpace=t.getPropertyValue("white-space")},f=function(e){var t=!1;return!e.preStyleTestCompleted&&(/inline-/.test(e.display)||(t=!0,e.display="inline-block"),"nowrap"!==e.whiteSpace&&(t=!0,e.whiteSpace="nowrap"),e.preStyleTestCompleted=!0,t)},d=function(e){e.originalStyle||(e.originalStyle=e.element.getAttribute("style")||""),e.element.style.cssText=e.originalStyle+";white-space:"+e.whiteSpace+";display:"+e.display+";font-size:"+e.currentFontSize+"px"},p=function(e){e.element.dispatchEvent(new CustomEvent("fit",{detail:{oldValue:e.previousFontSize,newValue:e.currentFontSize,scaleFactor:e.currentFontSize/e.previousFontSize}}))},v=function(e,t){return function(){e.dirty=t,e.active&&o()}},m=function(e){b(e),e.newbie=!0,e.dirty=!0,i.push(e)},y=function(t){return function(){i=i.filter(function(e){return e.element!==t.element}),t.observeMutations&&t.observer.disconnect(),t.element.style.cssText=t.originalStyle}},h=function(e){return function(){e.active||(e.active=!0,o())}},S=function(e){return function(){return e.active=!1}},b=function(e){e.observeMutations&&(e.observer=new MutationObserver(v(e,r.DIRTY_CONTENT)),e.observer.observe(e.element,e.observeMutations))},w={minSize:16,maxSize:512,multiLine:!0,observeMutations:"MutationObserver"in n&&{subtree:!0,childList:!0,characterData:!0}},T=null,z=function(){n.clearTimeout(T),T=n.setTimeout(t(r.DIRTY_LAYOUT),D.observeWindowDelay)},F=["resize","orientationchange"];return Object.defineProperty(D,"observeWindow",{set:function(e){var t=(e?"add":"remove")+"EventListener";F.forEach(function(e){n[t](e,z)})}}),D.observeWindow=!0,D.observeWindowDelay=100,D.fitAll=t(r.DIRTY),D}function g(e,t){var n=E({},w,t),i=e.map(function(e){var t=E({},n,{element:e,active:!0});return m(t),{element:e,fit:v(t,r.DIRTY),unfreeze:h(t),freeze:S(t),unsubscribe:y(t)}});return o(),i}function D(e){var t,n=1<arguments.length&&void 0!==arguments[1]?arguments[1]:{};return"string"==typeof e?g((t=document.querySelectorAll(e),[].slice.call(t)),n):g([e],n)[0]}}("undefined"==typeof window?null:window),e.exports=t.default});