const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

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
