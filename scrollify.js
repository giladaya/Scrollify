/*!
 * Scrollify (non jQuery version)
 * Version 1.0.4
 *
 * Requires:
 * - there are no dependencies!
 *
 * https://github.com/giladaya/Scrollify
 * 
 * Original Project (and copyright)
 * https://github.com/lukehaas/Scrollify
 *
 * Copyright 2016, Luke Haas
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.



 If section being scrolled to is an interstitialSection and the last section on page

 then value to scroll to is current position plus height of interstitialSection

 */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['window', 'document'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(window, document);
    } else {
        // Browser globals (root is window)
        root.Scrollify = factory(window, document);
    }
}(this, function (window, document) {
  "use strict";
  var heights = [],
    names = [],
    elements = [],
    overflow = [],
    index = 0,
    currentIndex = 0,
    interstitialIndex = 1,
    hasLocation = false,
    timeoutId,
    timeoutId2,
    top = window.pageyofFset,
    scrollable = false,
    locked = false,
    scrolled = false,
    manualScroll,
    swipeScroll,
    util,
    disabled = false,
    scrollSamples = [],
    scrollTime = new Date().getTime(),
    firstLoad = true,
    initialised = false,
    wheelEvent = 'onwheel' in document ? 'wheel' : document.onmousewheel !== undefined ? 'mousewheel' : 'DOMMouseScroll',
    targetsArr = [],
    settings = {
      //section should be an identifier that is the same for each section
      section: ".section",
      sectionName: "section-name",
      interstitialSection: "",
      easing: "easeOutExpo", //this is ignored for now
      scrollSpeed: 1100,
      offset : 0,
      scrollbars: true,
      axis:"y",
      target:"html,body",
      standardScrollElements: "",
      setHeights: true,
      overflowScroll:true,
      before:function() {},
      after:function() {},
      afterResize:function() {},
      afterRender:function() {}
    };
  function animateScroll(index,instant,callbacks) {
    if(currentIndex===index) {
      callbacks = false;
    }
    if(disabled===true) {
      return true;
    }
    if(names[index]) {
      scrollable = false;
      if(callbacks) {
        settings.before(index,elements);
      }
      interstitialIndex = 1;
      if(settings.sectionName && !(firstLoad===true && index===0)) {
        if(history.pushState) {
            try {
              history.replaceState(null, null, names[index]);
            } catch (e) {
              if(window.console) {
                console.warn("Scrollify warning: This needs to be hosted on a server to manipulate the hash value.");
              }
            }

        } else {
          window.location.hash = names[index];
        }
      }
      if(instant) {
        animate.stop();
        document.querySelectorAll(settings.target).forEach(
          function(el){
            el.scrollTop = heights[index];
        });
        if(callbacks) {
          settings.after(index,elements);
        }
      } else {
        locked = true;
        var el = document.querySelector(settings.target);
        animate.stop();
        animate.start(el, heights[index], settings.scrollSpeed, function(){
          console.log('stopped');
          currentIndex = index;
          locked = false;
          firstLoad = false;
          if(callbacks) {
            settings.after(index,elements);
          }
        });

        if(window.location.hash.length && settings.sectionName && window.console) {
          if(document.querySelector(window.location.hash) !== null) {
            console.warn("Scrollify warning: There are IDs on the page that match the hash value - this will cause the page to anchor.");
          }
        }
      }

    }
  }

  function isAccelerating(samples) {
        function average(num) {
          var sum = 0;

          var lastElements = samples.slice(Math.max(samples.length - num, 1));

          for(var i = 0; i < lastElements.length; i++){
              sum += lastElements[i];
          }

          return Math.ceil(sum/num);
        }

        var avEnd = average(10);
        var avMiddle = average(70);

        if(avEnd >= avMiddle) {
          return true;
        } else {
          return false;
        }
  }

  //setup polyfills
  (function(window) {
    console.log('setting up polyfills');
    // matches polyfill
    window.Element && function(ElementPrototype) {
        ElementPrototype.matches = ElementPrototype.matches ||
        ElementPrototype.matchesSelector ||
        ElementPrototype.webkitMatchesSelector ||
        ElementPrototype.msMatchesSelector ||
        function(selector) {
            var node = this, nodes = (node.parentNode || node.document).querySelectorAll(selector), i = -1;
            while (nodes[++i] && nodes[i] != node);
            return !!nodes[i];
        }
    }(Element.prototype);

    // closest polyfill
    window.Element && function(ElementPrototype) {
        ElementPrototype.closest = ElementPrototype.closest ||
        function(selector) {
            var el = this;
            while (el.matches && !el.matches(selector)) el = el.parentNode;
            return el.matches ? el : null;
        }
    }(Element.prototype);
  })(window);

  //Extend a JavaScript object with the key/value pairs of another
  function extend(obj, src) {
      Object.keys(src).forEach(function(key) { obj[key] = src[key]; });
      return obj;
  }

  var animate = (function(){
    var exp = {};

    var PROP = 'scrollTop';
    var isRunning = false;
    var startTime = 0;
    var initialVal, delta;

    function step() {
      if (!isRunning) {
        return;
      }

      var elapsed = Date.now() - startTime;
      if (elapsed >= animate.duration){
        animate.stop();
        return;
      }

      requestAnimationFrame(step);
      animate.el[PROP] = ease(null, elapsed, initialVal, delta, animate.duration);
    }

    //easeOutExpo
    function ease(x, t, b, c, d) {
      return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
    };

    // el - element to animate
    // toVal - target value
    // duration - duration of transition
    exp.start = function(el, toVal, duration, cb) {
      if (isRunning) {
        return;
      }
      animate.el = el;
      animate.duration = duration;
      animate.cb = cb;

      initialVal = el[PROP];
      delta = toVal - initialVal;
      isRunning = true;
      startTime = Date.now();
      requestAnimationFrame(step);      
    }

    exp.stop = function() {
      if (isRunning && typeof animate.cb == 'function'){
        animate.cb();
      }
      isRunning = false;
    }

    return exp;
  })();

  var Scrollify = function(options) {
    initialised = true;

    manualScroll = {
      handleMousedown:function() {
        if(disabled===true) {
          return true;
        }
        scrollable = false;
        scrolled = false;
      },
      handleMouseup:function() {
        if(disabled===true) {
          return true;
        }
        scrollable = true;
        if(scrolled) {
          manualScroll.calculateNearest();
        }
      },
      handleScroll:function() {
        if(disabled===true) {
          return true;
        }
        if(timeoutId){
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(function(){

          scrolled = true;
          if(scrollable===false) {
            return false;
          }
          scrollable = false;
          manualScroll.calculateNearest();

        }, 200);
      },
      calculateNearest:function() {
        top = window.pageyofFset;
        var i =1,
          max = heights.length,
          closest = 0,
          prev = Math.abs(heights[0] - top),
          diff;
        for(;i<max;i++) {
          diff = Math.abs(heights[i] - top);

          if(diff < prev) {
            prev = diff;
            closest = i;
          }
        }
        if(atBottom() || atTop()) {
          index = closest;
          animateScroll(closest,false,true);
        }
      },
      wheelHandler:function(e,delta) {
        if(disabled===true) {
          return true;
        } else if(settings.standardScrollElements.length > 0) {
          if (e.target.matches(settings.standardScrollElements) || 
              e.target.closest(settings.standardScrollElements).length) {
            return true;
          }
        }
        if(!overflow[index]) {
          e.preventDefault();
        }
        var currentScrollTime = new Date().getTime();



        e = e || window.event;
        var value = e.wheelDelta || -e.deltaY || -e.detail;
        var delta = Math.max(-1, Math.min(1, value));



        //delta = delta || -e.detail / 3 || e.wheelDelta / 120;


        if(scrollSamples.length > 149){
          scrollSamples.shift();
        }
        //scrollSamples.push(Math.abs(delta*10));
        scrollSamples.push(Math.abs(value));

        if((currentScrollTime-scrollTime) > 200){
          scrollSamples = [];
        }
        scrollTime = currentScrollTime;


        if(locked) {
          return false;
        }

        if(delta<0) {
          if(index<heights.length-1) {
            if(atBottom()) {
              if(isAccelerating(scrollSamples)) {
                e.preventDefault();
                index++;
                locked = true;
                animateScroll(index,false,true);
              } else {
                return false;
              }
            }
          }
        } else if(delta>0) {
          if(index>0) {
            if(atTop()) {
              if(isAccelerating(scrollSamples)) {
                e.preventDefault();
                index--;
                locked = true;
                animateScroll(index,false,true);
              } else {
                return false
              }
            }
          }
        }

      },
      keyHandler:function(e) {
        if(disabled===true) {
          return true;
        }
        if(locked===true) {
          return false;
        }
        if(e.keyCode==38) {
          if(index>0) {
            if(atTop()) {
              e.preventDefault();
              index--;
              animateScroll(index,false,true);
            }
          }
        } else if(e.keyCode==40) {
          if(index<heights.length-1) {
            if(atBottom()) {
              e.preventDefault();
              index++;
              animateScroll(index,false,true);
            }
          }
        }
      },
      init:function() {
        targetsArr = document.querySelectorAll(settings.target);
        if(settings.scrollbars) {
          window.addEventListener("mousedown", manualScroll.handleMousedown, false);
          window.addEventListener("mouseup", manualScroll.handleMouseup, false);
          window.addEventListener("scroll", manualScroll.handleScroll, false);
        } else {
          document.querySelector('body').style.overflow = "hidden";
        }
        document.addEventListener(wheelEvent, manualScroll.wheelHandler, false);
        document.addEventListener("keydown", manualScroll.keyHandler, false);
      }
    };

    swipeScroll = {
      touches : {
        "touchstart": {"y":-1,"x":-1},
        "touchmove" : {"y":-1,"x":-1},
        "touchend"  : false,
        "direction" : "undetermined"
      },
      options:{
        "distance" : 30,
        "timeGap" : 800,
        "timeStamp" : new Date().getTime()
      },
      touchHandler: function(event) {
        if(disabled===true) {
          return true;
        } else if(settings.standardScrollElements.length > 0) {
          if(event.target.matches(settings.standardScrollElements) || 
             event.target.closest(settings.standardScrollElements).length) {
            return true;
          }
        }
        var touch;
        if (typeof event !== 'undefined'){
          if (typeof event.touches !== 'undefined') {
            touch = event.touches[0];
            switch (event.type) {
              case 'touchstart':
                swipeScroll.touches.touchstart.y = touch.pageY;
                swipeScroll.touches.touchmove.y = -1;

                swipeScroll.touches.touchstart.x = touch.pageX;
                swipeScroll.touches.touchmove.x = -1;

                swipeScroll.options.timeStamp = new Date().getTime();
                swipeScroll.touches.touchend = false;
              case 'touchmove':
                swipeScroll.touches.touchmove.y = touch.pageY;
                swipeScroll.touches.touchmove.x = touch.pageX;
                if(swipeScroll.touches.touchstart.y!==swipeScroll.touches.touchmove.y && (Math.abs(swipeScroll.touches.touchstart.y-swipeScroll.touches.touchmove.y)>Math.abs(swipeScroll.touches.touchstart.x-swipeScroll.touches.touchmove.x))) {
                  //if(!overflow[index]) {
                    event.preventDefault();
                  //}
                  swipeScroll.touches.direction = "y";
                  if((swipeScroll.options.timeStamp+swipeScroll.options.timeGap)<(new Date().getTime()) && swipeScroll.touches.touchend == false) {

                    swipeScroll.touches.touchend = true;
                    if (swipeScroll.touches.touchstart.y > -1) {

                      if(Math.abs(swipeScroll.touches.touchmove.y-swipeScroll.touches.touchstart.y)>swipeScroll.options.distance) {
                        if(swipeScroll.touches.touchstart.y < swipeScroll.touches.touchmove.y) {

                          swipeScroll.up();

                        } else {
                          swipeScroll.down();

                        }
                      }
                    }
                  }
                }
                break;
              case 'touchend':
                if(swipeScroll.touches[event.type]===false) {
                  swipeScroll.touches[event.type] = true;
                  if (swipeScroll.touches.touchstart.y > -1 && swipeScroll.touches.touchmove.y > -1 && swipeScroll.touches.direction==="y") {

                    if(Math.abs(swipeScroll.touches.touchmove.y-swipeScroll.touches.touchstart.y)>swipeScroll.options.distance) {
                      if(swipeScroll.touches.touchstart.y < swipeScroll.touches.touchmove.y) {
                        swipeScroll.up();

                      } else {
                        swipeScroll.down();

                      }
                    }
                    swipeScroll.touches.touchstart.y = -1;
                    swipeScroll.touches.touchstart.x = -1;
                    swipeScroll.touches.direction = "undetermined";
                  }
                }
              default:
                break;
            }
          }
        }
      },
      down: function() {
        if(index<=heights.length-1) {

          if(atBottom() && index<heights.length-1) {

            index++;
            animateScroll(index,false,true);
          } else {
            if(Math.floor(elements[index].clientHeight / window.innerHeight) > interstitialIndex) {

              interstitialScroll(parseInt(heights[index]) + (window.innerHeight*interstitialIndex));
              interstitialIndex += 1;

            } else {
              interstitialScroll(parseInt(heights[index]) + (elements[index].clientHeight - window.innerHeight));
            }

          }
        }
      },
      up: function() {
        if(index>=0) {
          if(atTop() && index>0) {

            index--;
            animateScroll(index,false,true);
          } else {

            if(interstitialIndex>2) {

              interstitialIndex -= 1;
              interstitialScroll(parseInt(heights[index])+(window.innerHeight*interstitialIndex));

            } else {

              interstitialIndex = 1;
              interstitialScroll(parseInt(heights[index]));
            }
          }

        }
      },
      init: function() {
        if (document.addEventListener) {
          document.addEventListener('touchstart', swipeScroll.touchHandler, false);
          document.addEventListener('touchmove', swipeScroll.touchHandler, false);
          document.addEventListener('touchend', swipeScroll.touchHandler, false);
        }
      }
    };


    util = {
      refresh:function(withCallback) {
        clearTimeout(timeoutId2);
        timeoutId2 = setTimeout(function() {
          sizePanels();
          calculatePositions(true);
          if(withCallback) {
              settings.afterResize();
          }
        },400);
      },
      handleUpdate:function() {
        targetsArr = document.querySelectorAll(settings.target);
        util.refresh(false);
      },
      handleResize:function() {
        util.refresh(true);
      }
    };
    settings = extend(settings, options);

    sizePanels();

    calculatePositions(false);

    if(true===hasLocation) {
      animateScroll(index,false,true);
    } else {
      setTimeout(function() {
        animateScroll(0,false,true);
      },200);
    }
    if(heights.length) {
      manualScroll.init();
      swipeScroll.init();

      window.addEventListener("resize", util.handleResize, false);
      if (document.addEventListener) {
        window.addEventListener("orientationchange", util.handleResize, false);
      }
    }
    function interstitialScroll(pos) {
      var el = document.querySelector(settings.target);
      animate.stop();
      animate.start(el, pos, settings.scrollSpeed);
    }

    function sizePanels() {
      var selector = settings.section;
      overflow = [];
      if(settings.interstitialSection.length) {
        selector += "," + settings.interstitialSection;
      }

      var elements = document.querySelectorAll(selector);
      var len = elements.length;
      for (var i = 0; i < len; i++) {
        var el = elements[i];
        if(settings.setHeights) {
          if(settings.interstitialSection.length > 0 && el.matches(settings.interstitialSection)) {
            overflow[i] = false;
          } else {
            // getComputedStyle for modern browsers, currentStyle for IE
            var style = window.getComputedStyle ? getComputedStyle(el, null) : el.currentStyle;
            el.style.height = 'auto';
            if(el.clientHeight < window.innerHeight || style.overflow ==="hidden") {
              el.style.height = window.innerHeight+'px';

              overflow[i] = false;
            } else {
              el.style.height = el.clientHeight+'px';

              if(settings.overflowScroll) {
                  overflow[i] = true;
              } else {
                overflow[i] = false;
              }
            }

          }

        } else {

          if(el.clientHeight < window.innerHeight || (settings.overflowScroll===false)) {
            overflow[i] = false;
          } else {
            overflow[i] = true;
          }
        }
      }
    }
    function calculatePositions(resize) {
      var selector = settings.section;
      if(settings.interstitialSection.length) {
        selector += "," + settings.interstitialSection;
      }
      heights = [];
      names = [];
      elements = [];

      var selected = document.querySelectorAll(selector);
      var len = selected.length;
      for (var i = 0; i < len; i++) {
          var el = selected[i];

          var rect = el.getBoundingClientRect();
          var top = rect.top + document.body.scrollTop;
          if(i>0) {
            heights[i] = parseInt(top) + settings.offset;
          } else {
            heights[i] = parseInt(top);
          }
          if(settings.sectionName && el.getAttribute('data-'+settings.sectionName)) {
            names[i] = "#" + el.getAttribute('data-'+settings.sectionName).replace(/ /g,"-");
          } else {
            if(settings.interstitialSection.length == 0 || el.matches(settings.interstitialSection)===false) {
              names[i] = "#" + (i + 1);
            } else {
              names[i] = "#";
              if(i===len-1 && i>1) {
                heights[i] = heights[i-1]+parseInt(el.clientHeight);
              }
            }
          }
          elements[i] = el;
          try {
            if(document.querySelector(names[i]) !== null && window.console) {
              console.warn("Scrollify warning: Section names can't match IDs on the page - this will cause the browser to anchor.");
            }
          } catch (e) {}

          if(window.location.hash===names[i]) {
            index = i;
            hasLocation = true;
          }

      }

      if(true===resize) {
        animateScroll(index,false,false);
      } else {
        settings.afterRender();
      }
    }

    function atTop() {
      if(!overflow[index]) {
        return true;
      }
      top = window.pageyofFset;
      if(top>parseInt(heights[index])) {
        return false;
      } else {
        return true;
      }
    }
    function atBottom() {
      if(!overflow[index]) {
        return true;
      }
      top = window.pageyofFset;

      if(top < parseInt(heights[index]) + (elements[index].offsetHeight - window.innerHeight) - 28) {

        return false;

      } else {
        return true;
      }
    }
  }

  function move(panel,instant) {
    var z = names.length;
    for(;z>=0;z--) {
      if(typeof panel === 'string') {
        if (names[z]===panel) {
          index = z;
          animateScroll(z,instant,true);
        }
      } else {
        if(z===panel) {
          index = z;
          animateScroll(z,instant,true);
        }
      }
    }
  }
  Scrollify.move = function(panel) {
    if(panel===undefined) {
      return false;
    }
    if(panel.originalEvent) {
      panel = this.getAttribute("href");
    }
    move(panel,false);
  };
  Scrollify.instantMove = function(panel) {
    if(panel===undefined) {
      return false;
    }
    move(panel,true);
  };
  Scrollify.next = function() {
    if(index<names.length) {
      index += 1;
      animateScroll(index,false,true);
    }
  };
  Scrollify.previous = function() {
    if(index>0) {
      index -= 1;
      animateScroll(index,false,true);
    }
  };
  Scrollify.instantNext = function() {
    if(index<names.length) {
      index += 1;
      animateScroll(index,true,true);
    }
  };
  Scrollify.instantPrevious = function() {
    if(index>0) {
      index -= 1;
      animateScroll(index,true,true);
    }
  };
  Scrollify.destroy = function() {
    if(!initialised) {
      return false;
    }

    if(settings.setHeights) {
      var sections = document.querySelectorAll(settings.section);
      for (var i = sections.length - 1; i >= 0; i--) {
        sections[i].style.height = 'auto';
      }
    }

    window.removeEventListener('resize', util.handleResize, false);
    if(settings.scrollbars) {
      window.removeEventListener('mousedown', manualScroll.handleMousedown, false);
      window.removeEventListener('mouseup', manualScroll.handleMouseup, false);
      window.removeEventListener('scroll', manualScroll.handleScroll, false);
    }
    document.removeEventListener(wheelEvent, manualScroll.wheelHandler, false);
    document.removeEventListener('keydown', manualScroll.keyHandler, false);

    if (document.addEventListener) {
      document.removeEventListener('touchstart', swipeScroll.touchHandler, false);
      document.removeEventListener('touchmove', swipeScroll.touchHandler, false);
      document.removeEventListener('touchend', swipeScroll.touchHandler, false);
    }
    heights = [];
    names = [];
    elements = [];
    overflow = [];
  };
  Scrollify.update = function() {
    if(!initialised) {
      return false;
    }
    util.handleUpdate();
  };
  Scrollify.current = function() {
    return elements[index];
  };
  Scrollify.disable = function() {
    disabled = true;
  };
  Scrollify.enable = function() {
    disabled = false;
  };
  Scrollify.isDisabled = function() {
    return disabled;
  };
  Scrollify.setOptions = function(updatedOptions) {
    if(!initialised) {
      return false;
    }
    if(typeof updatedOptions === "object") {
      settings = extend(settings, updatedOptions);
      util.handleUpdate();
    } else if(window.console) {
      console.warn("Scrollify warning: Options need to be in an object.");
    }
  };

  return Scrollify;
}));