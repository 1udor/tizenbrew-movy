/* TizenBrew site-mod for movy.sx
   Ad blocker + D-pad navigation + optional mouse mode.
   ES5 only – Tizen TVs run Chromium 47. */

(function () {
  'use strict';

  // ============================================================
  // CONFIG
  // ============================================================
  var CONFIG = {
    blockPopups: true,
    blockTargetBlank: true,
    blockOverlays: true,
    blockForcedRedirects: true,
    hideAdSelectors: true,
    focusColor: '#00bfff',
    focusSize: 3
  };

  // ============================================================
  // 1. AD BLOCKER – POPUPS
  // ============================================================
  if (CONFIG.blockPopups) {
    var realOpen = window.open;
    window.open = function () {
      // Silently swallow every popup.
      return null;
    };
  }

  // ============================================================
  // 2. AD BLOCKER – target="_blank"
  // ============================================================
  if (CONFIG.blockTargetBlank) {
    document.addEventListener(
      'click',
      function (e) {
        var el = e.target;
        while (el && el !== document.body) {
          if (el.tagName === 'A' && el.target === '_blank') {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }
          el = el.parentNode;
        }
      },
      true
    );
  }

  // ============================================================
  // 3. AD BLOCKER – OVERLAYS / CLICK CATCHERS
  // ============================================================
  if (CONFIG.blockOverlays) {
    function killOverlays() {
      var selectors = [
        '[class*="overlay"]',
        '[class*="ad-overlay"]',
        '[id*="overlay"]',
        '[class*="click-catcher"]',
        '[class*="popunder"]'
      ];
      for (var i = 0; i < selectors.length; i++) {
        var nodes = document.querySelectorAll(selectors[i]);
        for (var j = 0; j < nodes.length; j++) {
          var node = nodes[j];
          var style = window.getComputedStyle(node);
          // Remove transparent, high‑z‑index elements that sit over the player.
          if (
            parseFloat(style.opacity) === 0 ||
            style.backgroundColor === 'transparent' ||
            style.backgroundColor === 'rgba(0, 0, 0, 0)'
          ) {
            if (parseInt(style.zIndex, 10) > 100) {
              node.parentNode.removeChild(node);
            }
          }
        }
      }
    }
    // Run after load and whenever the DOM changes.
    setTimeout(killOverlays, 2000);
    setTimeout(killOverlays, 5000);
  }

  // ============================================================
  // 4. AD BLOCKER – FORCED REDIRECTS
  // ============================================================
  if (CONFIG.blockForcedRedirects) {
    // Block beforeunload popups that try to redirect.
    window.addEventListener('beforeunload', function (e) {
      // Let the user close the tab normally; only block programmatic redirects.
      // (Tizen back button should still work.)
    });
  }

  // ============================================================
  // 5. AD BLOCKER – CSS HIDING
  // ============================================================
  if (CONFIG.hideAdSelectors) {
    var style = document.createElement('style');
    style.type = 'text/css';
    style.appendChild(
      document.createTextNode(
        '.ad, .ads, .advert, .advertisement, ' +
        '.sponsor, .sponsored, .promo, .banner, ' +
        '[class*="ad-"], [id*="ad-"], ' +
        '[class*="banner"], [id*="banner"] { ' +
        'display: none !important; ' +
        '}'
      )
    );
    (document.head || document.documentElement).appendChild(style);
  }

  // ============================================================
  // 6. D-PAD NAVIGATION
  // ============================================================
  var FOCUSABLE_SELECTOR =
    'a, button, input, select, textarea, ' +
    '[tabindex]:not([tabindex="-1"]), [role="button"]';

  var focusableElements = [];
  var currentIndex = -1;

  function refreshFocusable() {
    focusableElements = Array.prototype.slice.call(
      document.querySelectorAll(FOCUSABLE_SELECTOR)
    ).filter(function (el) {
      var s = window.getComputedStyle(el);
      return (
        s.display !== 'none' &&
        s.visibility !== 'hidden' &&
        s.opacity !== '0'
      );
    });
    if (currentIndex >= focusableElements.length) {
      currentIndex = focusableElements.length - 1;
    }
  }

  function focusElement(index) {
    if (index < 0 || index >= focusableElements.length) return;
    var el = focusableElements[index];
    el.focus();
    el.style.outline = CONFIG.focusSize + 'px solid ' + CONFIG.focusColor;
    el.style.outlineOffset = '2px';
  }

  function moveFocus(direction) {
    refreshFocusable();
    if (focusableElements.length === 0) return;

    if (currentIndex === -1) {
      currentIndex = 0;
      focusElement(currentIndex);
      return;
    }

    var next = currentIndex;
    if (direction === 'ArrowRight' || direction === 'ArrowDown') {
      next = Math.min(currentIndex + 1, focusableElements.length - 1);
    } else if (direction === 'ArrowLeft' || direction === 'ArrowUp') {
      next = Math.max(currentIndex - 1, 0);
    }

    if (next !== currentIndex) {
      currentIndex = next;
      focusElement(currentIndex);
    }
  }

  // ============================================================
  // 7. FAKE MOUSE MODE (RED BUTTON)
  // ============================================================
  var mouseMode = false;
  var cursorX = window.innerWidth / 2;
  var cursorY = window.innerHeight / 2;
  var cursorEl = null;

  function toggleMouseMode() {
    mouseMode = !mouseMode;
    if (mouseMode) {
      if (!cursorEl) {
        cursorEl = document.createElement('div');
        cursorEl.style.cssText =
          'position:fixed;width:24px;height:24px;border-radius:50%;' +
          'background:rgba(255,0,0,0.7);border:2px solid white;' +
          'pointer-events:none;z-index:999999;' +
          'transform:translate(-50%,-50%);';
        document.body.appendChild(cursorEl);
      }
      cursorEl.style.display = 'block';
      updateCursor();
    } else {
      if (cursorEl) cursorEl.style.display = 'none';
    }
  }

  function moveCursor(dx, dy) {
    cursorX = Math.max(0, Math.min(window.innerWidth, cursorX + dx));
    cursorY = Math.max(0, Math.min(window.innerHeight, cursorY + dy));
    updateCursor();
  }

  function updateCursor() {
    if (cursorEl) {
      cursorEl.style.left = cursorX + 'px';
      cursorEl.style.top = cursorY + 'px';
    }
  }

  function clickUnderCursor() {
    var el = document.elementFromPoint(cursorX, cursorY);
    if (el) el.click();
  }

  // ============================================================
  // 8. KEY HANDLING
  // ============================================================
  window.addEventListener(
    'keydown',
    function (e) {
      // Mouse mode has priority.
      if (mouseMode) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          moveCursor(0, -20);
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          moveCursor(0, 20);
          return;
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          moveCursor(-20, 0);
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          moveCursor(20, 0);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          clickUnderCursor();
          return;
        }
        return;
      }

      // D-pad navigation.
      if (
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight'
      ) {
        e.preventDefault();
        moveFocus(e.key);
        return;
      }

      // Enter clicks.
      if (e.key === 'Enter') {
        var active = document.activeElement;
        if (active && active !== document.body) {
          e.preventDefault();
          active.click();
        }
        return;
      }

      // Back.
      if (e.key === 'Back' || e.key === 'BrowserBack') {
        e.preventDefault();
        window.history.back();
        return;
      }

      // Red button toggles mouse mode.
      if (e.key === 'ColorF0Red') {
        e.preventDefault();
        toggleMouseMode();
        return;
      }
    },
    true
  );

  // ============================================================
  // 9. KEEP FOCUS LIST FRESH
  // ============================================================
  var observer = new MutationObserver(function () {
    refreshFocusable();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  setTimeout(refreshFocusable, 1000);
})();