console.clear();
/* The encoding is super important here to enable frame-by-frame scrubbing. */

// ffmpeg -i ~/Downloads/Toshiba\ video/original.mov -movflags faststart -vcodec libx264 -crf 23 -g 1 -pix_fmt yuv420p output.mp4
// ffmpeg -i ~/Downloads/Toshiba\ video/original.mov -vf scale=960:-1 -movflags faststart -vcodec libx264 -crf 20 -g 1 -pix_fmt yuv420p output_960.mp4

const video = document.querySelector(".video-background");
let src = video.currentSrc || video.src;
console.log(video, src);

/* Make sure the video is 'activated' on iOS */
function once(el, event, fn, opts) {
  var onceFn = function (e) {
    el.removeEventListener(event, onceFn);
    fn.apply(this, arguments);
  };
  el.addEventListener(event, onceFn, opts);
  return onceFn;
}

once(document.documentElement, "touchstart", function (e) {
  video.play();
  video.pause();
});

/* ---------------------------------- */
/* Scroll Control! */

gsap.registerPlugin(ScrollTrigger);

/* Progress bar on the bottom edge of the site header (see style.css) */
const progressBar = document.getElementById("scrub-progress");
const navWrapper = document.querySelector(".nav-wrapper");
function measureNav() {
  const h = navWrapper ? navWrapper.getBoundingClientRect().height : 0;
  document.documentElement.style.setProperty("--nav-h", (h || 88) + "px");
}
measureNav();
window.addEventListener("resize", measureNav);
window.addEventListener("load", measureNav);

/* The trigger is the video block itself (#gaita: sticky video + 500vh spacer).
   It used to be "#container", an element that does not exist, so GSAP fell back to
   the whole page and the video kept scrubbing long after it had scrolled out of view. */
let tl = gsap.timeline({
  defaults: { duration: 1 },
  scrollTrigger: {
    trigger: "#gaita",
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onUpdate: (self) => {
      progressBar.style.transform = "scaleX(" + self.progress + ")";
    },
    onLeave: () => progressBar.classList.add("idle"),
    onEnterBack: () => progressBar.classList.remove("idle")
  }
});

once(video, "loadedmetadata", () => {
  tl.fromTo(
    video,
    {
      currentTime: 0
    },
    {
      currentTime: video.duration || 1
    }
  );
});

/* When first coded, the Blobbing was important to ensure the browser wasn't dropping previously played segments, but it doesn't seem to be a problem now. Possibly based on memory availability? */
setTimeout(function () {
  if (window["fetch"]) {
    fetch(src)
      .then((response) => response.blob())
      .then((response) => {
        var blobURL = URL.createObjectURL(response);

        var t = video.currentTime;
        once(document.documentElement, "touchstart", function (e) {
          video.play();
          video.pause();
        });

        video.setAttribute("src", blobURL);
        video.currentTime = t + 0.01;
      });
  }
}, 1000);

/* ---------------------------------- */