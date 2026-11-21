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

for (const video of document.querySelectorAll("video[muted][loop]")) {
  let visible = !("IntersectionObserver" in window);

  function updatePlayback() {
    if (visible && !reducedMotion.matches && !document.hidden) {
      // A browser that blocks autoplay can still display the poster.
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }

  reducedMotion.addEventListener("change", updatePlayback);
  document.addEventListener("visibilitychange", updatePlayback);

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.intersectionRatio >= 0.15;
      updatePlayback();
    }, { threshold: [0, 0.15] });
    observer.observe(video);
  } else {
    updatePlayback();
  }
}
