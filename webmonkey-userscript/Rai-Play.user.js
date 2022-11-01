// ==UserScript==
// @name         Rai Play
// @description  Watch videos in external player.
// @version      1.0.1
// @include      /^https?:\/\/(?:[^\.\/]*\.)*raiplay\.it\/.*$/
// @icon         https://www.raiplay.it/dl/components/img/logo-app.png
// @run-at       document-end
// @grant        unsafeWindow
// @homepage     https://github.com/warren-bank/crx-Rai-Play/tree/webmonkey-userscript/es5
// @supportURL   https://github.com/warren-bank/crx-Rai-Play/issues
// @downloadURL  https://github.com/warren-bank/crx-Rai-Play/raw/webmonkey-userscript/es5/webmonkey-userscript/Rai-Play.user.js
// @updateURL    https://github.com/warren-bank/crx-Rai-Play/raw/webmonkey-userscript/es5/webmonkey-userscript/Rai-Play.user.js
// @namespace    warren-bank
// @author       Warren Bank
// @copyright    Warren Bank
// ==/UserScript==

// ----------------------------------------------------------------------------- constants

var user_options = {
  "webmonkey": {
    "post_intent_redirect_to_url":  "about:blank"
  },
  "greasemonkey": {
    "redirect_to_webcast_reloaded": true,
    "force_http":                   true,
    "force_https":                  false
  }
}

// ----------------------------------------------------------------------------- URL links to tools on Webcast Reloaded website

var get_webcast_reloaded_url = function(video_url, caption_url, referer_url, force_http, force_https) {
  force_http  = (typeof force_http  === 'boolean') ? force_http  : user_options.greasemonkey.force_http
  force_https = (typeof force_https === 'boolean') ? force_https : user_options.greasemonkey.force_https

  var encoded_video_url, encoded_caption_url, encoded_referer_url, webcast_reloaded_base, webcast_reloaded_url

  encoded_video_url     = encodeURIComponent(encodeURIComponent(btoa(video_url)))
  encoded_caption_url   = caption_url ? encodeURIComponent(encodeURIComponent(btoa(caption_url))) : null
  referer_url           = referer_url ? referer_url : unsafeWindow.location.href
  encoded_referer_url   = encodeURIComponent(encodeURIComponent(btoa(referer_url)))

  webcast_reloaded_base = {
    "https": "https://warren-bank.github.io/crx-webcast-reloaded/external_website/index.html",
    "http":  "http://webcast-reloaded.surge.sh/index.html"
  }

  webcast_reloaded_base = (force_http)
                            ? webcast_reloaded_base.http
                            : (force_https)
                               ? webcast_reloaded_base.https
                               : (video_url.toLowerCase().indexOf('http:') === 0)
                                  ? webcast_reloaded_base.http
                                  : webcast_reloaded_base.https

  webcast_reloaded_url  = webcast_reloaded_base + '#/watch/' + encoded_video_url + (encoded_caption_url ? ('/subtitle/' + encoded_caption_url) : '') + '/referer/' + encoded_referer_url
  return webcast_reloaded_url
}

// ----------------------------------------------------------------------------- URL redirect

var process_video_data = function(data) {
  if (!data.video_url) return

  if (!data.referer_url)
    data.referer_url = unsafeWindow.location.href

  if (typeof GM_startIntent === 'function') {
    // running in Android-WebMonkey: open Intent chooser

    if (!data.video_type)
      data.video_type = get_video_type(data.video_url)

    var args = [
      /* action = */ 'android.intent.action.VIEW',
      /* data   = */ data.video_url,
      /* type   = */ data.video_type
    ]

    // extras:
    if (data.caption_url) {
      args.push('textUrl')
      args.push(data.caption_url)
    }
    if (data.referer_url) {
      args.push('referUrl')
      args.push(data.referer_url)
    }
    if (data.drm instanceof Object) {
      if (data.drm.scheme) {
        args.push('drmScheme')
        args.push(data.drm.scheme)
      }
      if (data.drm.server) {
        args.push('drmUrl')
        args.push(data.drm.server)
      }
      if (data.drm.headers instanceof Object) {
        var drm_header_keys, drm_header_key, drm_header_val

        drm_header_keys = Object.keys(data.drm.headers)
        for (var i=0; i < drm_header_keys.length; i++) {
          drm_header_key = drm_header_keys[i]
          drm_header_val = data.drm.headers[drm_header_key]

          args.push('drmHeader')
          args.push(drm_header_key + ': ' + drm_header_val)
        }
      }
    }

    GM_startIntent.apply(this, args)
    process_webmonkey_post_intent_redirect_to_url()
    return true
  }
  else if (user_options.greasemonkey.redirect_to_webcast_reloaded) {
    // running in standard web browser: redirect URL to top-level tool on Webcast Reloaded website

    redirect_to_url(get_webcast_reloaded_url(data.video_url, data.caption_url, data.referer_url))
    return true
  }
  else {
    return false
  }
}

var process_webmonkey_post_intent_redirect_to_url = function() {
  var url = null

  if (typeof user_options.webmonkey.post_intent_redirect_to_url === 'string')
    url = user_options.webmonkey.post_intent_redirect_to_url

  if (typeof user_options.webmonkey.post_intent_redirect_to_url === 'function')
    url = user_options.webmonkey.post_intent_redirect_to_url()

  if (typeof url === 'string')
    redirect_to_url(url)
}

var redirect_to_url = function(url) {
  if (!url) return

  if (typeof GM_loadUrl === 'function') {
    if (typeof GM_resolveUrl === 'function')
      url = GM_resolveUrl(url, unsafeWindow.location.href) || url

    GM_loadUrl(url, 'Referer', unsafeWindow.location.href)
  }
  else {
    try {
      unsafeWindow.top.location = url
    }
    catch(e) {
      unsafeWindow.window.location = url
    }
  }
}

var get_video_type = function(video_url) {
  video_url = video_url.toLowerCase()

  return (video_url.indexOf('.m3u8') >= 0)
    ? 'application/x-mpegurl'
    : (video_url.indexOf('.mpd') >= 0)
      ? 'application/dash+xml'
      : 'video/mp4'
}

// -------------------------------------

var process_video_url = function(video_url, video_type, caption_url, referer_url) {
  var data = {
    drm: {
      scheme:    null,
      server:    null,
      headers:   null
    },
    video_url:   video_url   || null,
    video_type:  video_type  || null,
    caption_url: caption_url || null,
    referer_url: referer_url || null
  }

  process_video_data(data)
}

// ------------------------------------- helpers (unused)

var process_hls_data = function(data) {
  data.video_type = 'application/x-mpegurl'
  process_video_data(data)
}

var process_dash_data = function(data) {
  data.video_type = 'application/dash+xml'
  process_video_data(data)
}

var process_mp4_data = function(data) {
  data.video_type = 'video/mp4'
  process_video_data(data)
}

// ------------------------------------- helpers (unused)

var process_hls_url = function(video_url, caption_url, referer_url) {
  process_video_url(video_url, /* video_type= */ 'application/x-mpegurl', caption_url, referer_url)
}

var process_dash_url = function(video_url, caption_url, referer_url) {
  process_video_url(video_url, /* video_type= */ 'application/dash+xml', caption_url, referer_url)
}

var process_mp4_url = function(video_url, caption_url, referer_url) {
  process_video_url(video_url, /* video_type= */ 'video/mp4', caption_url, referer_url)
}

// ----------------------------------------------------------------------------- process video

var get_video_url = function() {
  var scripts, script, data

  scripts = unsafeWindow.document.querySelectorAll('script[type="application/ld+json"]')
  for (var i=0; i < scripts.length; i++) {
    try {
      script = scripts[i]
      data = JSON.parse(script.innerText)

      if (data && (typeof data === "object") && (data["@type"] === "VideoObject") && data.contentUrl) {
        return (data.contentUrl + "#video.m3u8")
      }
    }
    catch(e) {}
  }

  return null
}

// ----------------------------------------------------------------------------- bootstrap

var init = function() {
  // on page load
  if (is_video_page(unsafeWindow.location.href)) {
    process_video_url(
      get_video_url()
    )
  }

  if (unsafeWindow.history) {
    var real = {
      pushState:    unsafeWindow.history.pushState,
      replaceState: unsafeWindow.history.replaceState
    }

    unsafeWindow.history.pushState = function(state, title, url) {
      process_site_url(url)
      real.pushState.apply(unsafeWindow.history, [state, title, url])
    }

    unsafeWindow.history.replaceState = function(state, title, url) {
      process_site_url(url)
      real.replaceState.apply(unsafeWindow.history, [state, title, url])
    }
  }

  unsafeWindow.document.body.classList.add("rai-player-opened")
}

var is_video_page = function(url) {
  var url_regex = /^https?:\/\/(?:[^\.\/]*\.)*raiplay\.it\/video\/.+$/

  return url_regex.test(url)
}

var process_site_url = function(url) {
  url = resolve_url(url)

  if (is_video_page(url))
    redirect_to_url(url)
}

var resolve_url = function(url) {
  if (url.substring(0, 4).toLowerCase() === 'http')
    return url

  if (url.substring(0, 2) === '//')
    return unsafeWindow.location.protocol + url

  if (url.substring(0, 1) === '/')
    return unsafeWindow.location.protocol + '//' + unsafeWindow.location.host + url

  return unsafeWindow.location.protocol + '//' + unsafeWindow.location.host + unsafeWindow.location.pathname.replace(/[^\/]+$/, '') + url
}

init()
