const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const connection = navigator.connection;
const videos = Array.from(document.querySelectorAll("video[data-src]"));
const visible = new Set();
const fallbackDurationMs = 10_000;
let active = null;
let timer;
let fallbackPoster;
let usingFallback = false;

function allowPlayback() {
  return !document.hidden && !reducedMotion.matches && !connection?.saveData;
}

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

function stopPreview() {
  clearTimeout(timer);
  if (!active) return;
  active.pause();
  active.classList.remove("is-playing");
  if (fallbackPoster) {
    active.previousElementSibling.src = fallbackPoster;
    fallbackPoster = null;
  }
  usingFallback = false;
  showProject(active, 0);
  active = null;
}

function playPreview(video) {
  stopPreview();
  if (!video || !visible.has(video) || !allowPlayback()) return;
  active = video;
  if (!video.hasAttribute("src")) video.src = video.dataset.src;
  if (video.currentTime > 0) video.currentTime = 0;
  video.play().catch(() => {
    if (active !== video || !video.paused || !allowPlayback()) return;
    usingFallback = true;
    // Browsers that require a gesture can still animate the selected publication.
    if (video.dataset.fallback) {
      const poster = video.previousElementSibling;
      fallbackPoster = poster.getAttribute("src");
      poster.src = video.dataset.fallback;
    }
    timer = setTimeout(advance, fallbackDurationMs);
  });
}

function advance() {
  const choices = videos.filter(video => visible.has(video));
  if (choices.length === 1 && usingFallback && allowPlayback()) {
    timer = setTimeout(advance, fallbackDurationMs);
    return;
  }
  const index = choices.indexOf(active);
  playPreview(choices.length ? choices[(index + 1) % choices.length] : null);
}

function refresh() {
  if (allowPlayback() && visible.has(active)) return;
  stopPreview();
  // A fast scroll past a thumbnail should not start a download.
  if (visible.size && allowPlayback()) timer = setTimeout(advance, 160);
}

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => {
    for (const { target, intersectionRatio } of entries) {
      if (intersectionRatio >= 0.5) visible.add(target);
      else visible.delete(target);
    }
    refresh();
  }, { threshold: [0, 0.5] });

  for (const video of videos) {
    observer.observe(video);
    video.addEventListener("playing", () => {
      if (active === video && !video.paused) video.classList.add("is-playing");
    });
    video.addEventListener("ended", () => {
      if (active === video) advance();
    });
    if (video.dataset.projectSeconds) {
      video.addEventListener("timeupdate", () => {
        if (active === video) showProject(video, video.currentTime >= Number(video.dataset.projectSeconds) ? 1 : 0);
      });
    }
    const prefer = () => {
      if (active !== video && visible.has(video) && allowPlayback()) playPreview(video);
    };
    video.parentElement.addEventListener("focus", prefer);
    video.parentElement.addEventListener("pointerenter", event => {
      if (event.pointerType === "mouse") prefer();
    });
  }
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
