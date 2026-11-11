'use strict';
// Enhancement only: all content and navigation remain available without JavaScript.
// Hover to preview silently, or tap / use Enter or Space without player chrome.
const previews = [...document.querySelectorAll('.motion-preview')];
if (previews.length) {
  for (const video of previews) {
    const media = video.closest('.paper-media') || video;
    let playbackRequested = false;
    let pendingPlay = null;
    video.defaultMuted = true;
    video.muted = true;
    video.playsInline = true;
    const playPreview = () => {
      if (!playbackRequested || document.hidden || pendingPlay) return;
      video.muted = true;
      pendingPlay = video.play().then(() => {
        delete media.dataset.playbackError;
        if (!playbackRequested || document.hidden) video.pause();
      }).catch(error => {
        if (error.name !== 'AbortError') {
          media.dataset.playbackError = error.name;
          console.warn('Hover preview playback failed:', error.name, video.currentSrc);
        }
      }).finally(() => { pendingPlay = null; });
    };
    // Hover is an explicit preview request, including when OS animations are off.
    // Listen on the wrapper so the whole preview is a hover target.
    media.addEventListener('mouseenter', event => {
      if (event.sourceCapabilities?.firesTouchEvents) return;
      playbackRequested = true;
      playPreview();
    });
    media.addEventListener('mouseleave', () => {
      playbackRequested = false;
      video.pause();
    });
    video.addEventListener('canplay', playPreview);
    const togglePreview = () => {
      playbackRequested = video.paused && !pendingPlay;
      if (playbackRequested) playPreview();
      else video.pause();
    };
    video.addEventListener('click', togglePreview);
    video.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      if (!event.repeat) togglePreview();
    });
    for (const event of ['play', 'pause']) {
      video.addEventListener(event, () => video.setAttribute('aria-pressed', String(!video.paused)));
    }
  }
  // Scrolling into view never starts playback. Scrolling away stops any playback.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (!entry.isIntersecting) entry.target.pause();
    });
    previews.forEach(video => observer.observe(video));
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) previews.forEach(video => video.pause());
  });
}

const filterBar = document.querySelector('.filters');
if (filterBar) {
  filterBar.hidden = false;
  const search = document.querySelector('#publication-search');
  const buttons = [...document.querySelectorAll('[data-filter]')];
  const papers = [...document.querySelectorAll('[data-publication]')];
  const groups = [...document.querySelectorAll('.publication-group')];
  const resultLabel = document.querySelector('#results-label');
  const heading = document.querySelector('#publication-heading');
  let activeFilter = 'all';
  function update() {
    const query = search.value.trim().toLocaleLowerCase();
    let count = 0;
    for (const paper of papers) {
      const matchesFilter = activeFilter === 'all' || paper.dataset.topic === activeFilter;
      paper.hidden = !(matchesFilter && paper.textContent.toLocaleLowerCase().includes(query));
      if (paper.hidden) paper.querySelectorAll('.motion-preview').forEach(video => video.pause());
      if (!paper.hidden) count++;
    }
    for (const group of groups) group.hidden = ![...group.querySelectorAll('[data-publication]')].some(p => !p.hidden);
    resultLabel.textContent = `${count} ${count === 1 ? 'work' : 'works'} shown`;
    document.querySelector('#no-results').hidden = count > 0;
  }
  for (const button of buttons) button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    heading.textContent = button.dataset.heading;
    for (const item of buttons) item.setAttribute('aria-pressed', String(item === button));
    update();
  });
  search.addEventListener('input', update);
  update();
}
