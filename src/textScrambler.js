export function installTextScrambler() {
  // text-scramble animation (kept for GUI parity)
  (() => {
    var TextScrambler = (() => {
      var l = Object.defineProperty;
      var c = Object.getOwnPropertyDescriptor;
      var u = Object.getOwnPropertyNames;
      var m = Object.prototype.hasOwnProperty;
      var d = (n, t) => {
        for (var e in t) l(n, e, { get: t[e], enumerable: !0 });
      },
        f = (n, t, e, s) => {
          if ((t && typeof t == "object") || typeof t == "function")
            for (let i of u(t))
              !m.call(n, i) &&
                i !== e &&
                l(n, i, {
                  get: () => t[i],
                  enumerable: !(s = c(t, i)) || s.enumerable,
                });
          return n;
        };
      var g = (n) => f(l({}, "__esModule", { value: !0 }), n);
      var T = {};
      d(T, { default: () => r });
      function _(n) {
        let t = document.createTreeWalker(n, NodeFilter.SHOW_TEXT, {
            acceptNode: (s) => (s.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP),
          }),
          e = [];
        for (; t.nextNode(); ) (t.currentNode.nodeValue = t.currentNode.nodeValue.replace(/(\n|\r|\t)/gm, "")), e.push(t.currentNode);
        return e;
      }
      function p(n, t, e) {
        return t < 0 || t >= n.length ? n : n.substring(0, t) + e + n.substring(t + 1);
      }
      function M(n, t) {
        return n ? "x" : t[Math.floor(Math.random() * t.length)];
      }
      var r = class {
        constructor(t, e = {}) {
          (this.el = t);
          let s = {
            duration: 1e3,
            delay: 0,
            reverse: !1,
            absolute: !1,
            pointerEvents: !0,
            scrambleSymbols: "\u2014~\xB1\xA7|[].+$^@*()\u2022x%!?#",
            randomThreshold: null,
          };
          (this.config = Object.assign({}, s, e)),
            this.config.randomThreshold === null && (this.config.randomThreshold = this.config.reverse ? 0.1 : 0.8),
            (this.textNodes = _(this.el)),
            (this.nodeLengths = this.textNodes.map((i) => i.nodeValue.length)),
            (this.originalText = this.textNodes.map((i) => i.nodeValue).join("")),
            (this.mask = this.originalText
              .split(" ")
              .map((i) => "\xA0".repeat(i.length))
              .join(" ")),
            (this.currentMask = this.mask),
            (this.totalChars = this.originalText.length),
            (this.scrambleRange = Math.floor(this.totalChars * (this.config.reverse ? 0.25 : 1.5))),
            (this.direction = this.config.reverse ? -1 : 1),
            this.config.absolute && ((this.el.style.position = "absolute"), (this.el.style.top = "0")),
            this.config.pointerEvents || (this.el.style.pointerEvents = "none"),
            (this._animationFrame = null),
            (this._startTime = null),
            (this._running = !1);
        }
        initialize() {
          return (this.currentMask = this.mask), this;
        }
        _getEased(t) {
          let e = -(Math.cos(Math.PI * t) - 1) / 2;
          return (e = Math.pow(e, 2)), this.config.reverse ? 1 - e : e;
        }
        _updateScramble(t, e, s) {
          if (Math.random() < 0.5 && t > 0 && t < 1)
            for (let i = 0; i < 20; i++) {
              let o = i / 20,
                a;
              if (this.config.reverse) a = e - Math.floor((1 - Math.random()) * this.scrambleRange * o);
              else a = e + Math.floor((1 - Math.random()) * this.scrambleRange * o);
              if (!(a < 0 || a >= this.totalChars) && this.currentMask[a] !== " ") {
                let h = Math.random() > this.config.randomThreshold ? this.originalText[a] : M(this.config.reverse, this.config.scrambleSymbols);
                this.currentMask = p(this.currentMask, a, h);
              }
            }
        }
        _composeOutput(t, e, s) {
          let i = "";
          if (this.config.reverse) {
            let o = Math.max(e - s, 0);
            i = this.mask.slice(0, o) + this.currentMask.slice(o, e) + this.originalText.slice(e);
          } else i = this.originalText.slice(0, e) + this.currentMask.slice(e, e + s) + this.mask.slice(e + s);
          return i;
        }
        _updateTextNodes(t) {
          let e = 0;
          for (let s = 0; s < this.textNodes.length; s++) {
            let i = this.nodeLengths[s];
            (this.textNodes[s].nodeValue = t.slice(e, e + i)), (e += i);
          }
        }
        _tick = (t) => {
          this._startTime || (this._startTime = t);
          let e = t - this._startTime,
            s = Math.min(e / this.config.duration, 1),
            i = this._getEased(s),
            o = Math.floor(this.totalChars * s),
            a = Math.floor(2 * (0.5 - Math.abs(s - 0.5)) * this.scrambleRange);
          this._updateScramble(s, o, a);
          let h = this._composeOutput(s, o, a);
          this._updateTextNodes(h), s < 1 ? (this._animationFrame = requestAnimationFrame(this._tick)) : (this._running = !1);
        };
        start() {
          (this._running = !0),
            (this._startTime = null),
            this.config.delay
              ? setTimeout(() => {
                  this._animationFrame = requestAnimationFrame(this._tick);
                }, this.config.delay)
              : (this._animationFrame = requestAnimationFrame(this._tick));
        }
        stop() {
          this._animationFrame && (cancelAnimationFrame(this._animationFrame), (this._animationFrame = null)), (this._running = !1);
        }
      };
      return g(T);
    })();
    window.TextScrambler = TextScrambler.default || TextScrambler;
  })();
}

