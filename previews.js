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

for (const video of document.querySelectorAll("video[data-preview-start]")) {
  // Open on the same action as the animated cover. The project link opens the full film.
  video.addEventListener("loadedmetadata", () => {
    const start = Number(video.dataset.previewStart);
    if (start < video.duration) video.currentTime = start;
  }, { once: true });

  function revealFilm() {
    if (!video.paused && !video.seeking && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      video.classList.add("has-frames");
    }
  }

  if ("requestVideoFrameCallback" in video) {
    video.addEventListener("playing", () => video.requestVideoFrameCallback(revealFilm));
  } else {
    video.addEventListener("timeupdate", revealFilm);
  }
  for (const event of ["waiting", "seeking", "pause", "error", "emptied"]) {
    video.addEventListener(event, () => video.classList.remove("has-frames"));
  }
}

function preparePreview(video) {
  video.poster = video.dataset.poster;
  const cover = video.parentElement.querySelector("img[data-motion]");
  if (cover) {
    // Keep the embedded still painted while the browser swaps image sources.
    cover.style.backgroundImage = 'url("' + cover.getAttribute("src") + '")';
    cover.src = cover.dataset.motion;
  }
}

function updatePlayback(video) {
  if (!visibleVideos.has(video) || reducedMotion.matches || document.hidden) {
    video.pause();
    return;
  }

  if (!video.hasAttribute("src")) {
    video.src = video.dataset.src;
  }
  video.play().catch(() => video.classList.remove("has-frames"));
}

function refreshVisible() {
  visibleVideos.forEach(updatePlayback);
}

reducedMotion.addEventListener("change", refreshVisible);
document.addEventListener("visibilitychange", refreshVisible);

if ("IntersectionObserver" in window) {
  const posters = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        preparePreview(entry.target);
        posters.unobserve(entry.target);
      }
    }
  }, { rootMargin: "220px 0px" });

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
    preparePreview(video);
    visibleVideos.add(video);
  }
  refreshVisible();
}

function loadVisitBadge() {
  const link = document.querySelector(".visit-count");
  if (!link || location.protocol === "file:") return;
  const badge = new Image();
  badge.alt = "Homepage visits";
  badge.referrerPolicy = "no-referrer";
  badge.addEventListener("load", () => link.replaceChildren(badge), { once: true });
  badge.src = link.dataset.badge;
}

if (document.readyState === "complete") loadVisitBadge();
else window.addEventListener("load", loadVisitBadge, { once: true });
