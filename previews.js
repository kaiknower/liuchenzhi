const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const connection = navigator.connection;
const videos = document.querySelectorAll("video[data-src]");
const visible = new Set();

function showProject(video, index) {
  const card = video.closest(".direction-card");
  if (!card) return;
  const links = card.querySelectorAll(".resources a");
  const project = links[index];
  if (project.hasAttribute("aria-current")) return;
  for (const link of links) link.removeAttribute("aria-current");
  project.setAttribute("aria-current", "true");
  const preview = video.parentElement;
  preview.href = project.href;
  preview.setAttribute("aria-label", "View " + project.textContent.trim());
}

function setupPreview(video) {
  const poster = video.previousElementSibling;
  const still = poster.getAttribute("src");
  const projectSeconds = Number(video.dataset.projectSeconds);
  // data-cover-seconds holds the still (a title cover) on screen before each play-through.
  const coverMs = (Number(video.dataset.coverSeconds) || 0) * 1000;
  // data-next-fallback may list several space-separated images, one per later project.
  const fallbacks = [video.dataset.fallback, ...(video.dataset.nextFallback || "").split(/\s+/)].filter(Boolean);
  const card = video.closest(".direction-card");
  const projectCount = card ? card.querySelectorAll(".resources a").length : 1;
  let running = false;
  let timer;
  let generation = 0;

  function syncProject() {
    if (projectSeconds && running && !video.paused) {
      showProject(video, Math.min(Math.floor(video.currentTime / projectSeconds), projectCount - 1));
    }
  }

  function animateFallback(index) {
    if (fallbacks.length > 1) {
      poster.onload = () => {
        showProject(video, index);
        timer = setTimeout(() => animateFallback((index + 1) % fallbacks.length), projectSeconds * 1000);
      };
    }
    poster.src = fallbacks[index];
  }

  video.addEventListener("timeupdate", syncProject);
  video.addEventListener("playing", () => {
    if (running && !video.paused) {
      syncProject();
      video.classList.add("is-playing");
    }
  });
  // Only videos without the loop attribute end: show the cover again, then replay.
  video.addEventListener("ended", () => {
    if (!running) return;
    video.classList.remove("is-playing");
    const request = generation;
    timer = setTimeout(() => {
      if (generation === request) video.play().catch(() => {});
    }, coverMs);
  });

  return function refreshPreview() {
    const wanted = visible.has(video) && !document.hidden && !reducedMotion.matches && !connection?.saveData;
    if (wanted === running) return;
    running = wanted;
    const request = ++generation;
    clearTimeout(timer);

    if (!running) {
      video.pause();
      video.classList.remove("is-playing");
      poster.onload = null;
      if (poster.getAttribute("src") !== still) poster.src = still;
      if (projectSeconds) showProject(video, 0);
      return;
    }

    // Skip downloads for thumbnails that just pass through the viewport.
    timer = setTimeout(() => {
      if (!video.hasAttribute("src")) video.src = video.dataset.src;
      video.play().catch(() => {
        if (generation === request && video.paused && video.dataset.fallback) animateFallback(0);
      });
    }, Math.max(120, coverMs));
  };
}

if ("IntersectionObserver" in window) {
  const previews = Array.from(videos, setupPreview);
  const refresh = () => previews.forEach(update => update());
  const observer = new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) {
      if (isIntersecting) visible.add(target);
      else visible.delete(target);
    }
    refresh();
  });
  for (const video of videos) observer.observe(video);
  reducedMotion.addEventListener("change", refresh);
  connection?.addEventListener("change", refresh);
  document.addEventListener("visibilitychange", refresh);
}
