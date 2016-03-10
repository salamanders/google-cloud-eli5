/* jshint esversion: 6, multistr: true */
/* global require:false, phantom:false */
/* 
Simplified example using phantomjs directly
A local web service that determines google ad coverage of a URL
http://127.0.0.1:8585/?url=http://espn.go.com,http://blogs.disney.com
*/
//includes web server modules
var server = require('webserver').create();
require('system');
require('webpage');

phantom.onError = function(msg, trace) {
  console.error(msg);
  /*
   * var msgStack = ['PHANTOM ERROR: ' + msg]; if (trace && trace.length) { msgStack.push('TRACE:');
   * trace.forEach(function(t) { msgStack.push(' -> ' + (t.file || t.sourceURL) + ': ' + t.line + (t.function ? ' in
   * function ' + t.function+' ' : '')); }); } console.error(msgStack.join('\n'));
   */
  phantom.exit(1);
};


console.info('set up onError');

// define ip and port to web service
var port = '8080';

phantom.injectJs('es6-promise.js');
console.info('injected requirements.');

/*
 * Recursively overwriting properties of obj2 into obj1
 */
function mergeObjects(obj1, obj2) {
  Object.keys(obj2).forEach(function(obj2key) {
    if (obj2key in obj1) {
      if (obj1[obj2key].constructor == Object) {
        // Recurse
        mergeObjects(obj1[obj2key], obj2[obj2key]);
      } else {
        // Merge value
        obj1[obj2key] = obj2[obj2key];
      }
    } else {
      // Can merge entire subtree
      obj1[obj2key] = obj2[obj2key];
    }
  });
}




/** Easy param getting for the server GET call */
function getParameterByName(name, loc) {
  var match = RegExp('[?&]' + name + '=([^&]*)').exec(loc);
  return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

/**
 * Promise-wrapped page inspection looking for visible google ad areas
 */
function inspectPage(url, userOptions) {

  var options = {
    query: '[id*="google_ads"]'
  };

  // Browser defaults, good place to expand to android, iphone6s, etc.
  switch (userOptions.browser) {
    case 'iphone5':
      mergeObjects(options, {
        page: {
          viewportSize: {
            width: 320,
            height: 568
          },
          settings: {
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1'
          }
        }
      });
      break;

    default:
      mergeObjects(options, {
        page: {
          viewportSize: {
            width: 1500,
            height: 900
          },
          settings: {
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.97 Safari/537.36'
          }
        }
      });
  }

  // Direct override
  mergeObjects(options, userOptions || {});

  return new Promise(function(resolve, reject) {
    // console.log('Inspecting page (in promise):' + url);
    var page = require('webpage').create();
    page.viewportSize = {
      width: options.page.viewportSize.width,
      height: options.page.viewportSize.height
    };
    page.settings.userAgent = options.page.settings.userAgent;


    // Try to figure out when the network is finished. WORK IN PROGRESS
    var pendingRequests = 0;
    page.onResourceRequested = function(request) {
      pendingRequests++;
      //console.log("NETWORK REQUEST\t" + pendingRequests + "\t" + request.url);
    };
    page.onResourceReceived = function(response) {
      if (response.url.indexOf('data:image') === 0) {
        // skip local inline images
        return;
      }
      pendingRequests--;
      //console.log("NETWORK COMPLETE\t" + pendingRequests + "\t" + response.url);
    };



    page.open(url, function(status) {
      // console.log('Inspecting page (loaded page):' + url);
      if (status !== 'success') {
        console.log('Unable to load URL' + status);
        page.close();
        reject(status);
      } else {
        console.info('Loaded page, starting timer.');
        setTimeout(function() {
          console.log('Timeout finished, time to dig in.');
          // console.log('About to eval:' + JSON.stringify(options));
          var result = page.evaluate(function(options) {

            console.error('INTERNAL OPTIONS:' + JSON.stringify(options));

            var result = {
              page: {
                window: {
                  innerHeight: window.innerHeight,
                  innerWidth: window.innerWidth
                },
                documentHeight: Math.max(document.body.scrollHeight, document.body.offsetHeight,
                  document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight)
              },
              elts: {}
            };

            [].forEach.call(
              document.querySelectorAll(options.query),
              function(el) {
                // http://youmightnotneedjquery.com/
                var elH = el.offsetHeight,
                  elW = el.offsetWidth,
                  H = window.innerHeight,
                  W = window.innerWidth,
                  r = el.getBoundingClientRect();
                // console.info('GEOM', elH, elW, H, W, r);
                var area = Math.max(0, r.top > 0 ? Math.min(elH, H - r.top) : (r.bottom < H ? r.bottom : H)) *
                  Math.max(0, r.left > 0 ? Math.min(elW, W - r.left) : (r.right < W ? r.right : W));
                // console.log('AREA', el.id, area);
                result.elts[el.id] = {
                  'area_visible': area,
                  'rect': r
                };
              }
            );
            return result;
          }, options);
          page.close();
          resolve(result);

        }, 5000);

      }
    });
  });
}

console.info('Starting web service...');

server.listen(port, function(request, response) {
  try {

    if (request.url.indexOf('favicon.ico') > -1) {
      response.closeGracefully();
      return;
    }

    console.info('API request');

    response.statusCode = 200;
    response.headers = {
      'Cache': 'no-cache',
      'Content-Type': 'application/json'
    };

    // http://espn.go.com,http://blogs.disney.com,http://home.bt.com
    var urlsString = getParameterByName('urls', request.url),
      browser = getParameterByName('browser', request.url),
      options = {};

    if (!urlsString || urlsString.length < 4) {
      throw "No valid URLs passed in 'urls' parameter";
    }
    var urls = urlsString.split(',');

    // TODO: Parameter validation
    if (browser) {
      options.browser = browser;
    }
    var inspectionCalls = urls.filter(function(url) {
      if (url && url.length > 4 && url.toLowerCase().indexOf('http') === 0) {
        return true;
      }
      console.error('Discarding URL:' + url);
      return false;
    }).map(function(url) {
      return inspectPage(url, options);
    });

    Promise.all(inspectionCalls).then(function(arr) {
      var result = {};
      for (var i = 0; i < urls.length; i++) {
        result[urls[i]] = arr[i];
      }
      console.log('FULL RESULT:' + JSON.stringify(result, null, 2));
      response.write(JSON.stringify(result, null, 2));
      response.closeGracefully();
      // console.log('Exiting phantom');
      // phantom.exit();
    }).catch(function(error) {
      console.error("inspectionCalls Failed", error);
    });
  } catch (err) {
    console.log(err);
    var result = {
      error: err
    };
    response.write(JSON.stringify(result, null, 2));
    response.closeGracefully();
    return;
  }
});

console.log('Web server listening:' + port);