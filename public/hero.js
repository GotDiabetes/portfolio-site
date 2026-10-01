/* ============================================================================
   Hero loop — plays the living version of the hero photograph.

   The <video class="hero-loop"> sits over the photo with no source. If its
   data-src is set, this loads the clip and fades it in once it is actually
   playing; until then, and whenever it can't play, the drifting photo is
   what shows. Skipped for reduced motion and for Save-Data connections,
   and paused while the hero is off screen so it costs nothing below the fold.
   ========================================================================== */

(function () {
  "use strict";

  var video = document.querySelector(".hero-loop");
  if (!video) return;
  var src = video.getAttribute("data-src");
  if (!src) return;

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var saveData = navigator.connection && navigator.connection.saveData;
  if (reduce || saveData) return;

  var frame = video.closest(".hero-photo");
  video.muted = true;   // the attribute alone isn't enough for every autoplay policy
  video.src = src;

  video.addEventListener("playing", function () { frame.classList.add("has-loop"); }, { once: true });
  video.addEventListener("error", function () { frame.classList.remove("has-loop"); });

  var playing = false;
  function play() {
    var p = video.play();
    playing = true;
    if (p && p.catch) p.catch(function () { playing = false; });   // autoplay refused: the photo stays
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) play();
      else if (playing) { video.pause(); playing = false; }
    }).observe(frame);
  } else {
    play();
  }
})();
