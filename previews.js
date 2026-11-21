const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

for (const card of document.querySelectorAll(".direction-card")) {
  const preview = card.querySelector(".direction-preview");
  const reel = preview.querySelector("video");
  const projects = card.querySelectorAll(".resources a");
  const seconds = Number(reel.dataset.projectSeconds);
  let active = 0;

  function syncProject() {
    const index = Math.min(Math.floor(reel.currentTime / seconds), projects.length - 1);
    if (index === active) return;
    projects[active].removeAttribute("aria-current");
    const project = projects[index];
    project.setAttribute("aria-current", "true");
    preview.href = project.href;
    preview.setAttribute("aria-label", "View " + project.textContent.trim());
    active = index;
  }

  reel.addEventListener("timeupdate", syncProject);
  preview.addEventListener("click", syncProject);
}

const videos = document.querySelectorAll("video[data-src]");
const visibleVideos = new Set();
let pageReady = document.readyState === "complete";

function updatePlayback(video) {
  if (!pageReady || !visibleVideos.has(video) || reducedMotion.matches || document.hidden) {
    video.pause();
    return;
  }

  if (!video.hasAttribute("src")) {
    video.src = video.dataset.src;
  }
  video.play().catch(() => {}); // Keep the poster if the browser blocks autoplay.
}

function refreshVisible() {
  visibleVideos.forEach(updatePlayback);
}

window.addEventListener("load", () => {
  pageReady = true;
  requestAnimationFrame(refreshVisible);
}, { once: true });
reducedMotion.addEventListener("change", refreshVisible);
document.addEventListener("visibilitychange", refreshVisible);

if ("IntersectionObserver" in window) {
  const posters = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.poster = entry.target.dataset.poster;
        posters.unobserve(entry.target);
      }
    }
  }, { rootMargin: "96px 0px" });

  const playback = new IntersectionObserver(entries => {
    for (const { target, intersectionRatio } of entries) {
      if (intersectionRatio >= 0.15) visibleVideos.add(target);
      else visibleVideos.delete(target);
      updatePlayback(target);
    }
  }, { threshold: [0, 0.15] });

  for (const video of videos) {
    posters.observe(video);
    playback.observe(video);
  }
} else {
  for (const video of videos) {
    video.poster = video.dataset.poster;
    visibleVideos.add(video);
  }
  refreshVisible();
}
