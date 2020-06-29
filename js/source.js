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
 * enquire.js v2.1.6 - Awesome Media Queries in JavaScript
 * Copyright (c) 2017 Nick Williams - http://wicky.nillia.ms/enquire.js
 * License: MIT */

!function(a){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=a();else if("function"==typeof define&&define.amd)define([],a);else{var b;b="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this,b.enquire=a()}}(function(){return function a(b,c,d){function e(g,h){if(!c[g]){if(!b[g]){var i="function"==typeof require&&require;if(!h&&i)return i(g,!0);if(f)return f(g,!0);var j=new Error("Cannot find module '"+g+"'");throw j.code="MODULE_NOT_FOUND",j}var k=c[g]={exports:{}};b[g][0].call(k.exports,function(a){var c=b[g][1][a];return e(c?c:a)},k,k.exports,a,b,c,d)}return c[g].exports}for(var f="function"==typeof require&&require,g=0;g<d.length;g++)e(d[g]);return e}({1:[function(a,b,c){function d(a,b){this.query=a,this.isUnconditional=b,this.handlers=[],this.mql=window.matchMedia(a);var c=this;this.listener=function(a){c.mql=a.currentTarget||a,c.assess()},this.mql.addListener(this.listener)}var e=a(3),f=a(4).each;d.prototype={constuctor:d,addHandler:function(a){var b=new e(a);this.handlers.push(b),this.matches()&&b.on()},removeHandler:function(a){var b=this.handlers;f(b,function(c,d){if(c.equals(a))return c.destroy(),!b.splice(d,1)})},matches:function(){return this.mql.matches||this.isUnconditional},clear:function(){f(this.handlers,function(a){a.destroy()}),this.mql.removeListener(this.listener),this.handlers.length=0},assess:function(){var a=this.matches()?"on":"off";f(this.handlers,function(b){b[a]()})}},b.exports=d},{3:3,4:4}],2:[function(a,b,c){function d(){if(!window.matchMedia)throw new Error("matchMedia not present, legacy browsers require a polyfill");this.queries={},this.browserIsIncapable=!window.matchMedia("only all").matches}var e=a(1),f=a(4),g=f.each,h=f.isFunction,i=f.isArray;d.prototype={constructor:d,register:function(a,b,c){var d=this.queries,f=c&&this.browserIsIncapable;return d[a]||(d[a]=new e(a,f)),h(b)&&(b={match:b}),i(b)||(b=[b]),g(b,function(b){h(b)&&(b={match:b}),d[a].addHandler(b)}),this},unregister:function(a,b){var c=this.queries[a];return c&&(b?c.removeHandler(b):(c.clear(),delete this.queries[a])),this}},b.exports=d},{1:1,4:4}],3:[function(a,b,c){function d(a){this.options=a,!a.deferSetup&&this.setup()}d.prototype={constructor:d,setup:function(){this.options.setup&&this.options.setup(),this.initialised=!0},on:function(){!this.initialised&&this.setup(),this.options.match&&this.options.match()},off:function(){this.options.unmatch&&this.options.unmatch()},destroy:function(){this.options.destroy?this.options.destroy():this.off()},equals:function(a){return this.options===a||this.options.match===a}},b.exports=d},{}],4:[function(a,b,c){function d(a,b){var c=0,d=a.length;for(c;c<d&&b(a[c],c)!==!1;c++);}function e(a){return"[object Array]"===Object.prototype.toString.apply(a)}function f(a){return"function"==typeof a}b.exports={isFunction:f,isArray:e,each:d}},{}],5:[function(a,b,c){var d=a(2);b.exports=new d},{2:2}]},{},[5])(5)});

/*
 * fitty v2.3.0 - Snugly resizes text to fit its parent container
 * Copyright (c) 2020 Rik Schennink <rik@pqina.nl> (https://pqina.nl/)
 */
!function(e,t){if("function"==typeof define&&define.amd)define(["module","exports"],t);else if("undefined"!=typeof exports)t(module,exports);else{var n={exports:{}};t(n,n.exports),e.fitty=n.exports}}(this,function(e,t){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var E=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var i in n)Object.prototype.hasOwnProperty.call(n,i)&&(e[i]=n[i])}return e};t.default=function(n){if(n){var r={IDLE:0,DIRTY_CONTENT:1,DIRTY_LAYOUT:2,DIRTY:3},i=[],e=null,o="requestAnimationFrame"in n?function(){n.cancelAnimationFrame(e),e=n.requestAnimationFrame(function(){return u(i.filter(function(e){return e.dirty&&e.active}))})}:function(){},t=function(t){return function(){i.forEach(function(e){return e.dirty=t}),o()}},u=function(e){e.filter(function(e){return!e.styleComputed}).forEach(function(e){e.styleComputed=s(e)}),e.filter(f).forEach(d);var t=e.filter(c);t.forEach(l),t.forEach(function(e){d(e),a(e)}),t.forEach(p)},a=function(e){return e.dirty=r.IDLE},l=function(e){e.availableWidth=e.element.parentNode.clientWidth,e.currentWidth=e.element.scrollWidth,e.previousFontSize=e.currentFontSize,e.currentFontSize=Math.min(Math.max(e.minSize,e.availableWidth/e.currentWidth*e.previousFontSize),e.maxSize),e.whiteSpace=e.multiLine&&e.currentFontSize===e.minSize?"normal":"nowrap"},c=function(e){return e.dirty!==r.DIRTY_LAYOUT||e.dirty===r.DIRTY_LAYOUT&&e.element.parentNode.clientWidth!==e.availableWidth},s=function(e){var t=n.getComputedStyle(e.element,null);e.currentFontSize=parseInt(t.getPropertyValue("font-size"),10),e.display=t.getPropertyValue("display"),e.whiteSpace=t.getPropertyValue("white-space")},f=function(e){var t=!1;return!e.preStyleTestCompleted&&(/inline-/.test(e.display)||(t=!0,e.display="inline-block"),"nowrap"!==e.whiteSpace&&(t=!0,e.whiteSpace="nowrap"),e.preStyleTestCompleted=!0,t)},d=function(e){e.originalStyle||(e.originalStyle=e.element.getAttribute("style")||""),e.element.style.cssText=e.originalStyle+";white-space:"+e.whiteSpace+";display:"+e.display+";font-size:"+e.currentFontSize+"px"},p=function(e){e.element.dispatchEvent(new CustomEvent("fit",{detail:{oldValue:e.previousFontSize,newValue:e.currentFontSize,scaleFactor:e.currentFontSize/e.previousFontSize}}))},v=function(e,t){return function(){e.dirty=t,e.active&&o()}},m=function(e){b(e),e.newbie=!0,e.dirty=!0,i.push(e)},y=function(t){return function(){i=i.filter(function(e){return e.element!==t.element}),t.observeMutations&&t.observer.disconnect(),t.element.style.cssText=t.originalStyle}},h=function(e){return function(){e.active||(e.active=!0,o())}},S=function(e){return function(){return e.active=!1}},b=function(e){e.observeMutations&&(e.observer=new MutationObserver(v(e,r.DIRTY_CONTENT)),e.observer.observe(e.element,e.observeMutations))},w={minSize:16,maxSize:512,multiLine:!0,observeMutations:"MutationObserver"in n&&{subtree:!0,childList:!0,characterData:!0}},T=null,z=function(){n.clearTimeout(T),T=n.setTimeout(t(r.DIRTY_LAYOUT),D.observeWindowDelay)},F=["resize","orientationchange"];return Object.defineProperty(D,"observeWindow",{set:function(e){var t=(e?"add":"remove")+"EventListener";F.forEach(function(e){n[t](e,z)})}}),D.observeWindow=!0,D.observeWindowDelay=100,D.fitAll=t(r.DIRTY),D}function g(e,t){var n=E({},w,t),i=e.map(function(e){var t=E({},n,{element:e,active:!0});return m(t),{element:e,fit:v(t,r.DIRTY),unfreeze:h(t),freeze:S(t),unsubscribe:y(t)}});return o(),i}function D(e){var t,n=1<arguments.length&&void 0!==arguments[1]?arguments[1]:{};return"string"==typeof e?g((t=document.querySelectorAll(e),[].slice.call(t)),n):g([e],n)[0]}}("undefined"==typeof window?null:window),e.exports=t.default});

/*!
Waypoints - 4.0.1
Copyright © 2011-2016 Caleb Troughton
Licensed under the MIT license.
https://github.com/imakewebthings/waypoints/blob/master/licenses.txt
*/
!function(){"use strict";function t(o){if(!o)throw new Error("No options passed to Waypoint constructor");if(!o.element)throw new Error("No element option passed to Waypoint constructor");if(!o.handler)throw new Error("No handler option passed to Waypoint constructor");this.key="waypoint-"+e,this.options=t.Adapter.extend({},t.defaults,o),this.element=this.options.element,this.adapter=new t.Adapter(this.element),this.callback=o.handler,this.axis=this.options.horizontal?"horizontal":"vertical",this.enabled=this.options.enabled,this.triggerPoint=null,this.group=t.Group.findOrCreate({name:this.options.group,axis:this.axis}),this.context=t.Context.findOrCreateByElement(this.options.context),t.offsetAliases[this.options.offset]&&(this.options.offset=t.offsetAliases[this.options.offset]),this.group.add(this),this.context.add(this),i[this.key]=this,e+=1}var e=0,i={};t.prototype.queueTrigger=function(t){this.group.queueTrigger(this,t)},t.prototype.trigger=function(t){this.enabled&&this.callback&&this.callback.apply(this,t)},t.prototype.destroy=function(){this.context.remove(this),this.group.remove(this),delete i[this.key]},t.prototype.disable=function(){return this.enabled=!1,this},t.prototype.enable=function(){return this.context.refresh(),this.enabled=!0,this},t.prototype.next=function(){return this.group.next(this)},t.prototype.previous=function(){return this.group.previous(this)},t.invokeAll=function(t){var e=[];for(var o in i)e.push(i[o]);for(var n=0,r=e.length;r>n;n++)e[n][t]()},t.destroyAll=function(){t.invokeAll("destroy")},t.disableAll=function(){t.invokeAll("disable")},t.enableAll=function(){t.Context.refreshAll();for(var e in i)i[e].enabled=!0;return this},t.refreshAll=function(){t.Context.refreshAll()},t.viewportHeight=function(){return window.innerHeight||document.documentElement.clientHeight},t.viewportWidth=function(){return document.documentElement.clientWidth},t.adapters=[],t.defaults={context:window,continuous:!0,enabled:!0,group:"default",horizontal:!1,offset:0},t.offsetAliases={"bottom-in-view":function(){return this.context.innerHeight()-this.adapter.outerHeight()},"right-in-view":function(){return this.context.innerWidth()-this.adapter.outerWidth()}},window.Waypoint=t}(),function(){"use strict";function t(t){window.setTimeout(t,1e3/60)}function e(t){this.element=t,this.Adapter=n.Adapter,this.adapter=new this.Adapter(t),this.key="waypoint-context-"+i,this.didScroll=!1,this.didResize=!1,this.oldScroll={x:this.adapter.scrollLeft(),y:this.adapter.scrollTop()},this.waypoints={vertical:{},horizontal:{}},t.waypointContextKey=this.key,o[t.waypointContextKey]=this,i+=1,n.windowContext||(n.windowContext=!0,n.windowContext=new e(window)),this.createThrottledScrollHandler(),this.createThrottledResizeHandler()}var i=0,o={},n=window.Waypoint,r=window.onload;e.prototype.add=function(t){var e=t.options.horizontal?"horizontal":"vertical";this.waypoints[e][t.key]=t,this.refresh()},e.prototype.checkEmpty=function(){var t=this.Adapter.isEmptyObject(this.waypoints.horizontal),e=this.Adapter.isEmptyObject(this.waypoints.vertical),i=this.element==this.element.window;t&&e&&!i&&(this.adapter.off(".waypoints"),delete o[this.key])},e.prototype.createThrottledResizeHandler=function(){function t(){e.handleResize(),e.didResize=!1}var e=this;this.adapter.on("resize.waypoints",function(){e.didResize||(e.didResize=!0,n.requestAnimationFrame(t))})},e.prototype.createThrottledScrollHandler=function(){function t(){e.handleScroll(),e.didScroll=!1}var e=this;this.adapter.on("scroll.waypoints",function(){(!e.didScroll||n.isTouch)&&(e.didScroll=!0,n.requestAnimationFrame(t))})},e.prototype.handleResize=function(){n.Context.refreshAll()},e.prototype.handleScroll=function(){var t={},e={horizontal:{newScroll:this.adapter.scrollLeft(),oldScroll:this.oldScroll.x,forward:"right",backward:"left"},vertical:{newScroll:this.adapter.scrollTop(),oldScroll:this.oldScroll.y,forward:"down",backward:"up"}};for(var i in e){var o=e[i],n=o.newScroll>o.oldScroll,r=n?o.forward:o.backward;for(var s in this.waypoints[i]){var a=this.waypoints[i][s];if(null!==a.triggerPoint){var l=o.oldScroll<a.triggerPoint,h=o.newScroll>=a.triggerPoint,p=l&&h,u=!l&&!h;(p||u)&&(a.queueTrigger(r),t[a.group.id]=a.group)}}}for(var c in t)t[c].flushTriggers();this.oldScroll={x:e.horizontal.newScroll,y:e.vertical.newScroll}},e.prototype.innerHeight=function(){return this.element==this.element.window?n.viewportHeight():this.adapter.innerHeight()},e.prototype.remove=function(t){delete this.waypoints[t.axis][t.key],this.checkEmpty()},e.prototype.innerWidth=function(){return this.element==this.element.window?n.viewportWidth():this.adapter.innerWidth()},e.prototype.destroy=function(){var t=[];for(var e in this.waypoints)for(var i in this.waypoints[e])t.push(this.waypoints[e][i]);for(var o=0,n=t.length;n>o;o++)t[o].destroy()},e.prototype.refresh=function(){var t,e=this.element==this.element.window,i=e?void 0:this.adapter.offset(),o={};this.handleScroll(),t={horizontal:{contextOffset:e?0:i.left,contextScroll:e?0:this.oldScroll.x,contextDimension:this.innerWidth(),oldScroll:this.oldScroll.x,forward:"right",backward:"left",offsetProp:"left"},vertical:{contextOffset:e?0:i.top,contextScroll:e?0:this.oldScroll.y,contextDimension:this.innerHeight(),oldScroll:this.oldScroll.y,forward:"down",backward:"up",offsetProp:"top"}};for(var r in t){var s=t[r];for(var a in this.waypoints[r]){var l,h,p,u,c,d=this.waypoints[r][a],f=d.options.offset,w=d.triggerPoint,y=0,g=null==w;d.element!==d.element.window&&(y=d.adapter.offset()[s.offsetProp]),"function"==typeof f?f=f.apply(d):"string"==typeof f&&(f=parseFloat(f),d.options.offset.indexOf("%")>-1&&(f=Math.ceil(s.contextDimension*f/100))),l=s.contextScroll-s.contextOffset,d.triggerPoint=Math.floor(y+l-f),h=w<s.oldScroll,p=d.triggerPoint>=s.oldScroll,u=h&&p,c=!h&&!p,!g&&u?(d.queueTrigger(s.backward),o[d.group.id]=d.group):!g&&c?(d.queueTrigger(s.forward),o[d.group.id]=d.group):g&&s.oldScroll>=d.triggerPoint&&(d.queueTrigger(s.forward),o[d.group.id]=d.group)}}return n.requestAnimationFrame(function(){for(var t in o)o[t].flushTriggers()}),this},e.findOrCreateByElement=function(t){return e.findByElement(t)||new e(t)},e.refreshAll=function(){for(var t in o)o[t].refresh()},e.findByElement=function(t){return o[t.waypointContextKey]},window.onload=function(){r&&r(),e.refreshAll()},n.requestAnimationFrame=function(e){var i=window.requestAnimationFrame||window.mozRequestAnimationFrame||window.webkitRequestAnimationFrame||t;i.call(window,e)},n.Context=e}(),function(){"use strict";function t(t,e){return t.triggerPoint-e.triggerPoint}function e(t,e){return e.triggerPoint-t.triggerPoint}function i(t){this.name=t.name,this.axis=t.axis,this.id=this.name+"-"+this.axis,this.waypoints=[],this.clearTriggerQueues(),o[this.axis][this.name]=this}var o={vertical:{},horizontal:{}},n=window.Waypoint;i.prototype.add=function(t){this.waypoints.push(t)},i.prototype.clearTriggerQueues=function(){this.triggerQueues={up:[],down:[],left:[],right:[]}},i.prototype.flushTriggers=function(){for(var i in this.triggerQueues){var o=this.triggerQueues[i],n="up"===i||"left"===i;o.sort(n?e:t);for(var r=0,s=o.length;s>r;r+=1){var a=o[r];(a.options.continuous||r===o.length-1)&&a.trigger([i])}}this.clearTriggerQueues()},i.prototype.next=function(e){this.waypoints.sort(t);var i=n.Adapter.inArray(e,this.waypoints),o=i===this.waypoints.length-1;return o?null:this.waypoints[i+1]},i.prototype.previous=function(e){this.waypoints.sort(t);var i=n.Adapter.inArray(e,this.waypoints);return i?this.waypoints[i-1]:null},i.prototype.queueTrigger=function(t,e){this.triggerQueues[e].push(t)},i.prototype.remove=function(t){var e=n.Adapter.inArray(t,this.waypoints);e>-1&&this.waypoints.splice(e,1)},i.prototype.first=function(){return this.waypoints[0]},i.prototype.last=function(){return this.waypoints[this.waypoints.length-1]},i.findOrCreate=function(t){return o[t.axis][t.name]||new i(t)},n.Group=i}(),function(){"use strict";function t(t){this.$element=e(t)}var e=window.jQuery,i=window.Waypoint;e.each(["innerHeight","innerWidth","off","offset","on","outerHeight","outerWidth","scrollLeft","scrollTop"],function(e,i){t.prototype[i]=function(){var t=Array.prototype.slice.call(arguments);return this.$element[i].apply(this.$element,t)}}),e.each(["extend","inArray","isEmptyObject"],function(i,o){t[o]=e[o]}),i.adapters.push({name:"jquery",Adapter:t}),i.Adapter=t}(),function(){"use strict";function t(t){return function(){var i=[],o=arguments[0];return t.isFunction(arguments[0])&&(o=t.extend({},arguments[1]),o.handler=arguments[0]),this.each(function(){var n=t.extend({},o,{element:this});"string"==typeof n.context&&(n.context=t(this).closest(n.context)[0]),i.push(new e(n))}),i}}var e=window.Waypoint;window.jQuery&&(window.jQuery.fn.waypoint=t(window.jQuery)),window.Zepto&&(window.Zepto.fn.waypoint=t(window.Zepto))}();

/*!
Waypoints Inview Shortcut - 4.0.1
Copyright © 2011-2016 Caleb Troughton
Licensed under the MIT license.
https://github.com/imakewebthings/waypoints/blob/master/licenses.txt
*/
!function(){"use strict";function t(){}function e(t){this.options=i.Adapter.extend({},e.defaults,t),this.axis=this.options.horizontal?"horizontal":"vertical",this.waypoints=[],this.element=this.options.element,this.createWaypoints()}var i=window.Waypoint;e.prototype.createWaypoints=function(){for(var t={vertical:[{down:"enter",up:"exited",offset:"100%"},{down:"entered",up:"exit",offset:"bottom-in-view"},{down:"exit",up:"entered",offset:0},{down:"exited",up:"enter",offset:function(){return-this.adapter.outerHeight()}}],horizontal:[{right:"enter",left:"exited",offset:"100%"},{right:"entered",left:"exit",offset:"right-in-view"},{right:"exit",left:"entered",offset:0},{right:"exited",left:"enter",offset:function(){return-this.adapter.outerWidth()}}]},e=0,i=t[this.axis].length;i>e;e++){var n=t[this.axis][e];this.createWaypoint(n)}},e.prototype.createWaypoint=function(t){var e=this;this.waypoints.push(new i({context:this.options.context,element:this.options.element,enabled:this.options.enabled,handler:function(t){return function(i){e.options[t[i]].call(e,i)}}(t),offset:t.offset,horizontal:this.options.horizontal}))},e.prototype.destroy=function(){for(var t=0,e=this.waypoints.length;e>t;t++)this.waypoints[t].destroy();this.waypoints=[]},e.prototype.disable=function(){for(var t=0,e=this.waypoints.length;e>t;t++)this.waypoints[t].disable()},e.prototype.enable=function(){for(var t=0,e=this.waypoints.length;e>t;t++)this.waypoints[t].enable()},e.defaults={context:window,enabled:!0,enter:t,entered:t,exit:t,exited:t},i.Inview=e}();


// /* Private */
// // https://github.com/imakewebthings/waypoints/issues/450
// // Just add this code after Waypoints import/inclusion
// Waypoint.Inview.prototype.createWaypoints = function() {
//     // same as jQuery.outerHeight() function, works for IE9+
//     function outerHeight(el) {
//       var height = el.offsetHeight;
//       var style = getComputedStyle(el);
  
//       height += parseInt(style.marginTop) + parseInt(style.marginBottom);
//       return height;
//     }
  
//     var configs = {
//       vertical: [{
//         down: 'enter',
//         up: 'exited',
//         offset: function() {
//           var _offset = this.options.offset && this.options.offset.bottom || 0;
//           return this.options.context.innerHeight - _offset;
//         }.bind( this )
//       }, {
//         down: 'entered',
//         up: 'exit',
//         offset: function() {
//           var _offset = this.options.offset && this.options.offset.bottom || 0;
//           return this.options.context.innerHeight - outerHeight(this.element) - _offset;
//         }.bind( this )
//       }, {
//         down: 'exit',
//         up: 'entered',
//         offset: function() {
//           var _offset = this.options.offset && this.options.offset.top || 0;
//           return _offset;
//         }.bind( this )
//       }, {
//         down: 'exited',
//         up: 'enter',
//         offset: function() {
//           var _offset = this.options.offset && this.options.offset.top || 0;
//           return _offset - outerHeight(this.element);
//         }.bind( this )
//       }],
//       horizontal: [{
//         right: 'enter',
//         left: 'exited',
//         offset: '100%'
//       }, {
//         right: 'entered',
//         left: 'exit',
//         offset: 'right-in-view'
//       }, {
//         right: 'exit',
//         left: 'entered',
//         offset: 0
//       }, {
//         right: 'exited',
//         left: 'enter',
//         offset: function() {
//           return -this.adapter.outerWidth()
//         }
//       }]
//     };
  
//     for (var i = 0, end = configs[this.axis].length; i < end; i++) {
//       var config = configs[this.axis][i]
//       this.createWaypoint(config)
//     }
//   };