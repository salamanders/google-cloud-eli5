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
  var msgStack = ['PHANTOM ERROR: ' + msg];
  if (trace && trace.length) {
    msgStack.push('TRACE:');
    trace.forEach(function(t) {
      msgStack.push(' -> ' +
        (t.file || t.sourceURL) +
        ': ' +
        t.line +
        (t.function ? ' in function ' + t.function+' ' : ''));
    });
  }
  console.error(msgStack.join('\n'));
  phantom.exit(1);
};


console.info('set up onError');

// define ip and port to web service
var port = '8080';

phantom.injectJs('es6-promise.js');
console.info('injected requirements.');


function getParameterByName(name, loc) {
  var match = RegExp('[?&]' + name + '=([^&]*)').exec(loc);
  return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

function getAdArea() {
  var result = {};
  [].forEach.call(
    document.querySelectorAll('[id*="google_ads"]'),
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
      if (area) {
        result[el.id] = {
          'area_visible': area,
          'rect': r
        };
      }
    }
  );
  return result;
}

/**
 * Promise-wrapped page inspection looking for visible google ad areas
 */
function inspectPage(url) {
  return new Promise(function(resolve, reject) {
    console.log('Inspecting page (in promise):' + url);
    var page = require('webpage').create();
    page.viewportSize = {
      width: 1500,
      height: 900
    };
    page.settings.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.97 Safari/537.36';

    page.open(url, function(status) {
      console.log('Inspecting page (loaded page):' + url);
      if (status !== 'success') {
        console.log('Unable to load URL' + status);
        page.close();
        reject(status);
      } else {
        console.log('Loaded page ok');
        var result = page.evaluate(getAdArea);
        page.close();
        resolve(result);
      }
    });
  });
}

console.info('Starting web service...');

server.listen(port, function(request, response) {

  response.statusCode = 200;
  response.headers = {
    'Cache': 'no-cache',
    'Content-Type': 'application/json'
  };

  // http://espn.go.com,http://blogs.disney.com,http://home.bt.com
  var urls = getParameterByName('url', request.url).split(',');
  var inspectionCalls = urls.map(function(url) {
    return inspectPage(url);
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
  });

});

console.log('Web server listening:' + port);