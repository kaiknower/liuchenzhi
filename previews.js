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
  let running = false;
  let timer;
  let generation = 0;

  function syncProject() {
    if (projectSeconds && running && !video.paused) {
      showProject(video, video.currentTime >= projectSeconds ? 1 : 0);
    }
  }

  function animateFallback(index) {
    if (video.dataset.nextFallback) {
      poster.onload = () => {
        showProject(video, index);
        timer = setTimeout(() => animateFallback(1 - index), projectSeconds * 1000);
      };
    }
    poster.src = index === 0 ? video.dataset.fallback : video.dataset.nextFallback;
  }

  video.addEventListener("timeupdate", syncProject);
  video.addEventListener("playing", () => {
    if (running && !video.paused) {
      syncProject();
      video.classList.add("is-playing");
    }
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
    }, 120);
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
