const homeStatus = document.querySelector("#home-status");
const landing = document.querySelector("#landing");
const hero = document.querySelector("#hero");
const community = document.querySelector("#community");
const communityContent = document.querySelector("#community-content");
const startTest = document.querySelector("#start-test");
const promptCount = document.querySelector("#prompt-count");
const openCommunity = document.querySelector("#open-community");
const backHome = document.querySelector("#back-home");
const dialog = document.querySelector("#review");
const finishConfirmation = document.querySelector("#finish-confirmation");
const stars = [1, 2, 3, 4, 5];
const number = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });
const integer = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
let home;
let review;
let resetImageZoom;

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const imageUrl = (id) => `/media/${encodeURIComponent(id)}.webp`;
const draftKey = (id) => `public-model-test-draft:${id}`;

async function request({ test, ratings, revisions, action } = {}) {
  const url = ratings ? "/api/benchmark" : test ? `/api/benchmark?test=${encodeURIComponent(test)}` : "/api/benchmark";
  const result = await fetch(url, ratings ? {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ testId: test, ratings, revisions, action }), keepalive: action === "progress",
  } : {});
  const body = await result.json().catch(() => null);
  if (!result.ok || !body) throw new Error(body?.error || "The test is temporarily unavailable.");
  return body;
}

function board(title, rows, isCommunity = false) {
  return `<section class="surface" aria-label="${title}">
    <header><h3>${title}</h3>${isCommunity && home.participants ? `<p class="quiet">${integer.format(home.participants)} ${home.participants === 1 ? "participant" : "participants"}</p>` : ""}</header>
    ${rows.length ? `<div class="scroll-table" tabindex="0"><table>
      <thead><tr><th scope="col">Model</th><th scope="col">Avg. rating</th><th scope="col">Ratings</th>${isCommunity ? '<th scope="col">Voters</th>' : ""}</tr></thead>
      <tbody>${rows.map((entry) => `<tr><th scope="row">${escapeHtml(entry.model)}</th><td class="score">${number.format(entry.average)} / 5</td><td>${integer.format(entry.votes)}</td>${isCommunity ? `<td>${integer.format(entry.participants)}</td>` : ""}</tr>`).join("")}</tbody>
    </table></div>` : `<p class="empty">${isCommunity ? "No ratings yet. Take the test to add yours." : "The models you rate will appear here."}</p>`}
  </section>`;
}

function renderHome() {
  const test = home.tests[0];
  if (!test) {
    homeStatus.textContent = "The test is currently unavailable.";
    return;
  }
  const completed = home.completed.includes(test.id);
  const resumable = storedDraft(test.id) || home.inProgress?.includes(test.id);
  promptCount.hidden = Boolean(completed || resumable);
  const label = completed ? "View your results" : resumable ? "Resume test" : "Start test";
  document.querySelector("#autosave-notice").hidden = !home.inProgress;
  startTest.innerHTML = `${label} <span class="arrow" aria-hidden="true"></span>`;
  startTest.disabled = false;
  openCommunity.disabled = false;
  homeStatus.textContent = "";
}

async function showCommunity(show) {
  if (show) {
    communityContent.innerHTML = board("Model rankings", home.community, true);
  }
  landing.classList.toggle("show-community", show);
  hero.hidden = show;
  community.hidden = !show;
  if (show) document.querySelector("#community-title").focus({ preventScroll: true });
  else openCommunity.focus({ preventScroll: true });
  if (show) {
    try {
      const latest = await request();
      if (!community.hidden) {
        home = latest;
        communityContent.innerHTML = board("Model rankings", home.community, true);
      }
    } catch { /* The last loaded leaderboard is still available. */ }
  }
}

function storedDraft(id) {
  try { return JSON.parse(localStorage.getItem(draftKey(id)) ?? "null"); } catch { return null; }
}

function saveDraft() {
  const { test, ratings, revisions, index } = review;
  const draft = { ratings, revisions, index, promptCount: test.prompts.length, promptId: test.prompts[index].id, promptOrder: test.prompts.map(({ id }) => id) };
  try { localStorage.setItem(draftKey(test.id), JSON.stringify(draft)); } catch {}
}

// Keep unacknowledged changes independently of the navigation draft. Tabs editing
// different images can retry their own writes without replacing each other's data.
const pendingRatings = new Map();
let progressRetry;
let retryDelay = 2000;

const pendingPrefix = (testId) => `public-model-test-pending:${testId}:`;
function queueRating(testId, id, stars, revision) {
  const key = pendingPrefix(testId) + id;
  const change = { testId, id, stars, revision };
  pendingRatings.set(key, change);
  try { localStorage.setItem(key, JSON.stringify(change)); } catch {}
}

function restorePending(testId) {
  try {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith(pendingPrefix(testId))) continue;
      const change = JSON.parse(localStorage.getItem(key));
      if (change?.testId === testId && key === pendingPrefix(testId) + change.id &&
          stars.includes(change.stars) && Number.isSafeInteger(change.revision)) pendingRatings.set(key, change);
    }
  } catch {}
}

function acknowledge(change) {
  const key = pendingPrefix(change.testId) + change.id;
  if (pendingRatings.get(key)?.revision === change.revision) pendingRatings.delete(key);
  try {
    if (JSON.parse(localStorage.getItem(key))?.revision === change.revision) localStorage.removeItem(key);
  } catch {}
}

async function flushProgress() {
  const batch = [...pendingRatings.values()].filter(change => !change.sending);
  if (!batch.length || !home?.inProgress || !navigator.onLine) return;
  const ratings = {}, revisions = {};
  for (const change of batch) {
    change.sending = true;
    ratings[change.id] = change.stars;
    revisions[change.id] = change.revision;
  }
  try {
    await request({ test: batch[0].testId, ratings, revisions, action: "progress" });
    batch.forEach(acknowledge);
    retryDelay = 2000;
  } catch {
    for (const change of batch) change.sending = false;
    clearTimeout(progressRetry);
    progressRetry = setTimeout(flushProgress, retryDelay);
    retryDelay = Math.min(60000, retryDelay * 2);
  }
}

window.addEventListener("online", flushProgress);
document.addEventListener("visibilitychange", () => { if (document.hidden) void flushProgress(); });

function shuffled(items) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const other = Math.floor(Math.random() * (i + 1));
    [result[i], result[other]] = [result[other], result[i]];
  }
  return result;
}

function orderPrompts(prompts, draft) {
  if (!draft) return shuffled(prompts);
  if (!Array.isArray(draft.promptOrder)) return prompts;

  const remaining = new Map(prompts.map((prompt) => [prompt.id, prompt]));
  const ordered = [];
  for (const id of draft.promptOrder) {
    if (!remaining.has(id)) continue;
    ordered.push(remaining.get(id));
    remaining.delete(id);
  }
  return [...ordered, ...shuffled([...remaining.values()])];
}

function renderResult(test) {
  resetImageZoom = undefined;
  const ranked = test.prompts.flatMap((prompt) => prompt.images
    .filter((image) => Number.isInteger(image.stars))
    .map((image) => ({ ...image, prompt: prompt.title })))
    .sort((a, b) => b.stars - a.stars);
  dialog.innerHTML = `<div class="result"><main class="result-inner">
    <header class="result-top"><h2 tabindex="-1">Your results</h2><button class="action secondary" type="button" data-close>Back to home</button></header>
    ${ranked.length ? "" : '<p class="result-note">You didn’t rate any images, so no ratings were submitted.</p>'}
    <div class="result-boards">${board("Your rankings", home.personal)}${board("Community rankings", home.community, true)}</div>
    ${ranked.length ? `<h3 class="gallery-heading">Image rankings</h3>
    <div class="result-grid">${ranked.map((image) => `<figure><img loading="lazy" src="${imageUrl(image.id)}" alt="${escapeHtml(image.model)}">
      <figcaption><div><strong>${escapeHtml(image.model)}</strong><span class="result-score">${image.stars} / 5</span></div><p class="quiet">${escapeHtml(image.prompt)}</p></figcaption></figure>`).join("")}</div>` : ""}
  </main><footer class="result-footer"><a class="project-credit" href="https://craftedanomaly.com/">Crafted Anomaly Project</a></footer></div>`;
  dialog.querySelector("h2").focus();
}

function updateControls() {
  const prompt = review.test.prompts[review.index];
  const image = prompt.images[review.active];
  const rated = prompt.images.filter(({ id }) => review.ratings[id]).length;
  const final = review.index === review.test.prompts.length - 1;
  dialog.querySelector("#rating-progress").textContent = `${rated}/${prompt.images.length} rated`;
  dialog.querySelector("#rating-label").textContent = `Rate image ${String(review.active + 1).padStart(2, "0")}`;
  for (const [index, button] of [...dialog.querySelectorAll(".option")].entries()) {
    button.setAttribute("aria-current", index === review.active ? "true" : "false");
    const score = review.ratings[prompt.images[index].id];
    button.querySelector("span").hidden = !score;
    button.querySelector("span").textContent = score || "";
    button.setAttribute("aria-description", score ? `Rated ${score} out of 5` : "Unrated");
  }
  for (const input of dialog.querySelectorAll(".stars input")) {
    input.checked = Number(input.value) === review.ratings[image.id];
    input.parentElement.classList.toggle("filled", Number(input.value) <= (review.ratings[image.id] ?? 0));
  }
  const next = dialog.querySelector("[data-next]");
  next.querySelector("span").textContent = final ? "View results" : "Next";
  next.disabled = review.saving;
  dialog.querySelector("[data-finish]").disabled = review.saving;
}

function imageZoom(stage, onSwipe) {
  const image = stage.querySelector("img");
  const touches = new Map();
  let scale = 1;
  let swipeOrigin;
  let x = 0;
  let y = 0;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function gesture() {
    const [first, second] = touches.values();
    if (!second) return { ...first, distance: 0 };
    return {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2,
      distance: Math.hypot(first.x - second.x, first.y - second.y),
    };
  }

  stage.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch" || event.target.closest("button") || touches.size >= 2) return;
    swipeOrigin = touches.size === 0 && scale === 1 ? { x: event.clientX, y: event.clientY } : undefined;
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    stage.setPointerCapture(event.pointerId);
  });

  stage.addEventListener("pointermove", (event) => {
    if (!touches.has(event.pointerId) || !image.naturalWidth || (scale === 1 && touches.size === 1)) return;
    const before = gesture();
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const after = gesture();
    const nextScale = before.distance ? clamp(scale * after.distance / before.distance, 1, 4) : scale;
    const ratio = nextScale / scale;
    const { left, top, width, height } = stage.getBoundingClientRect();
    const fit = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const maxX = Math.max(0, (image.naturalWidth * fit * nextScale - width) / 2);
    const maxY = Math.max(0, (image.naturalHeight * fit * nextScale - height) / 2);
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    x = clamp((x + centerX - before.x) * ratio + after.x - centerX, -maxX, maxX);
    y = clamp((y + centerY - before.y) * ratio + after.y - centerY, -maxY, maxY);
    scale = nextScale;
    image.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  });

  function endTouch(event) {
    if (!touches.delete(event.pointerId)) return;
    const origin = swipeOrigin;
    swipeOrigin = undefined;
    if (!origin || event.type !== "pointerup") return;
    const dx = event.clientX - origin.x;
    const dy = event.clientY - origin.y;
    if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.4) onSwipe(dx < 0 ? 1 : -1);
  }

  for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) stage.addEventListener(name, endTouch);

  return () => {
    touches.clear();
    swipeOrigin = undefined;
    x = y = 0;
    scale = 1;
    image.style.removeProperty("transform");
  };
}

function selectImage(index) {
  const prompt = review.test.prompts[review.index];
  if (!prompt.images[index]) return;
  review.active = index;
  resetImageZoom?.();
  const image = dialog.querySelector("#active-image");
  const status = dialog.querySelector("#image-status");
  status.hidden = false;
  status.textContent = "Loading image…";
  image.onload = () => { status.hidden = true; dialog.querySelector(".stars").disabled = false; };
  image.onerror = () => { status.textContent = "Could not load this image."; };
  dialog.querySelector(".stars").disabled = true;
  image.alt = `Image ${index + 1}`;
  image.src = imageUrl(prompt.images[index].id);
  if (image.complete && image.naturalWidth) image.onload();
  updateControls();
  dialog.querySelector('[data-image][aria-current="true"]').scrollIntoView({ block: "nearest", inline: "nearest" });
}

function focusReview() {
  dialog.querySelector(".review-grid").focus({ preventScroll: true });
}

function reviewIcon(path, className = "") {
  return `<svg class="${className}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
}

function renderPrompt() {
  const { test, index } = review;
  const prompt = test.prompts[index];
  dialog.innerHTML = `<div class="review-grid" tabindex="-1">
    <div class="image-stage">
      <img id="active-image" alt="" fetchpriority="high" draggable="false">
      <p class="stage-status" id="image-status" role="status">Loading image…</p>
    </div>
    <header class="prompt-card">
      <button type="button" class="tool-button" data-back aria-label="Previous prompt" title="Previous prompt" ${index === 0 ? "disabled" : ""}>${reviewIcon("M15 5l-7 7 7 7")}</button>
      <div class="prompt">
        <div class="prompt-meta"><span>Prompt ${index + 1} / ${test.prompts.length}</span><progress value="${index + 1}" max="${test.prompts.length}" aria-label="Prompt progress"></progress></div>
        <button type="button" class="prompt-title" aria-expanded="false" aria-controls="full-prompt" data-prompt><span>${escapeHtml(prompt.title)}</span>${reviewIcon("m6 9 6 6 6-6")}</button>
        <div class="prompt-text" id="full-prompt" tabindex="0">${escapeHtml(prompt.prompt)}</div>
      </div>
    </header>
    <div class="view-tools">
      <button type="button" class="tool-button image-only-toggle" data-image-only aria-label="Image-only view" aria-pressed="false" title="Hide controls">
        ${reviewIcon("M9 4H4v5m11-5h5v5m0 6v5h-5m-6 0H4v-5","expand-icon")}
        ${reviewIcon("M4 9h5V4m11 5h-5V4m5 11h-5v5M4 15h5v5","restore-icon")}
      </button>
      <button type="button" class="tool-button" data-close aria-label="Back to home" title="Back to home">${reviewIcon("m6 6 12 12M18 6 6 18")}</button>
    </div>
    <div class="options" role="group" aria-label="Images for this prompt" aria-keyshortcuts="ArrowLeft ArrowRight">
      ${prompt.images.map(({ id }, i) => `<button type="button" class="option" data-image="${i}" aria-label="Image ${i + 1}"><img src="${imageUrl(id)}" alt="" loading="lazy"><span hidden></span></button>`).join("")}
    </div>
    <footer class="review-foot">
      <button class="session-link" type="button" data-finish>Finish test</button>
      <div class="rating-dock">
        <div class="rating-caption"><strong id="rating-label"></strong><span id="rating-progress" role="status"></span></div>
        <fieldset class="stars" aria-labelledby="rating-label">
          ${stars.map((score) => `<label><input type="radio" value="${score}" name="stars">${reviewIcon("m12 2.8 2.85 5.78 6.38.93-4.62 4.5 1.09 6.36L12 17.37l-5.7 3 1.09-6.36-4.62-4.5 6.38-.93Z")}<span class="sr-only">${score} ${score === 1 ? "star" : "stars"}</span></label>`).join("")}
        </fieldset>
      </div>
      <button type="button" class="session-link" data-next ${index < test.prompts.length - 1 ? 'aria-keyshortcuts="Space"' : ""}><span>Next</span>${reviewIcon("M4 12h15m-6-6 6 6-6 6")}</button>
      <p id="review-error" class="warning" role="status"></p>
    </footer>
  </div>`;
  resetImageZoom = imageZoom(dialog.querySelector(".image-stage"), (direction) => {
    if (!review.saving) selectImage(review.active + direction);
  });
  const firstUnrated = prompt.images.findIndex(({ id }) => !review.ratings[id]);
  selectImage(Math.max(0, firstUnrated));
  focusReview();
}

async function openTest() {
  const selectedCount = Number(promptCount.querySelector(":checked").value);
  promptCount.disabled = true;
  startTest.disabled = true;
  openCommunity.disabled = true;
  homeStatus.textContent = "Opening the test…";
  try {
    const result = await request({ test: home.tests[0].id });
    homeStatus.textContent = "";
    home = result;
    dialog.showModal();
    if (result.test.completed) {
      review = null;
      renderResult(result.test);
      return;
    }
    const saved = storedDraft(result.test.id);
    // Legacy drafts and server-only resumes use the whole catalog so existing ratings stay in view.
    const fullCount = result.test.prompts.length;
    const savedCount = Number.isInteger(saved?.promptCount) && saved.promptCount > 0 ? saved.promptCount : fullCount;
    const count = saved ? savedCount : result.draft ? fullCount : selectedCount;
    const prompts = orderPrompts(result.test.prompts, saved)
      .slice(0, count)
      .map((prompt) => ({ ...prompt, images: shuffled(prompt.images) }));
    const test = { ...result.test, prompts };
    const validIds = new Set(test.prompts.flatMap(({ images }) => images.map(({ id }) => id)));
    const ratings = Object.fromEntries(Object.entries(saved?.ratings ?? {}).filter(([id, value]) => validIds.has(id) && stars.includes(value)));
    const revisions = {};
    for (const [id, value] of Object.entries(result.draft ?? {})) {
      if (!validIds.has(id)) continue;
      const localRevision = saved?.revisions?.[id] ?? 0;
      if (!ratings[id] || value.revision >= localRevision) ratings[id] = value.stars;
      revisions[id] = Math.max(value.revision ?? 0, localRevision);
    }
    for (const [id, score] of Object.entries(ratings)) {
      const revision = revisions[id] ?? saved?.revisions?.[id] ?? 0;
      revisions[id] = revision;
      if (!result.draft?.[id] || revision > result.draft[id].revision) queueRating(test.id, id, score, revision);
    }
    void flushProgress();
    const savedIndex = prompts.findIndex(({ id }) => id === saved?.promptId);
    const fallbackIndex = Number.isInteger(saved?.index) ? Math.max(0, Math.min(saved.index, prompts.length - 1)) : 0;
    review = { test, index: savedIndex >= 0 ? savedIndex : fallbackIndex, active: 0, ratings, revisions, saving: false };
    saveDraft();
    renderPrompt();
  } catch (error) {
    homeStatus.textContent = error.message || "Could not open the test. Try again.";
  } finally {
    promptCount.disabled = false;
    startTest.disabled = false;
    openCommunity.disabled = false;
  }
}

function advance() {
  if (!review || review.saving) return;
  if (review.index < review.test.prompts.length - 1) {
    review.index++;
    saveDraft();
    renderPrompt();
    return;
  }
  requestFinish();
}

function requestFinish() {
  if (!review || review.saving) return;
  const imageCount = review.test.prompts.reduce((total, prompt) => total + prompt.images.length, 0);
  const remaining = imageCount - Object.keys(review.ratings).length;
  if (!remaining) {
    void finishTest();
    return;
  }
  const label = remaining === 1 ? "image" : "images";
  finishConfirmation.querySelector("#finish-remaining").textContent = `You still have ${integer.format(remaining)} unrated ${label}.`;
  finishConfirmation.returnValue = "";
  finishConfirmation.showModal();
}

async function finishTest() {
  if (!review || review.saving) return;
  const current = review;
  if (!Object.keys(current.ratings).length) {
    try { localStorage.removeItem(draftKey(current.test.id)); } catch {}
    review = null;
    renderResult(current.test);
    return;
  }
  current.saving = true;
  updateControls();
  const status = dialog.querySelector("#review-error");
  status.textContent = "Saving ratings…";
  try {
    const result = await request({ test: current.test.id, ratings: current.ratings, revisions: current.revisions, action: "finish" });
    for (const change of pendingRatings.values()) if (change.testId === current.test.id) acknowledge(change);
    home = result;
    try { localStorage.removeItem(draftKey(current.test.id)); } catch {}
    if (dialog.open && current === review) {
      review = null;
      renderResult(result.test);
    } else {
      renderHome();
    }
  } catch (error) {
    current.saving = false;
    if (current === review) {
      status.textContent = error.message || "Could not save your ratings. Try again.";
      updateControls();
    }
  }
}

startTest.addEventListener("click", openTest);
openCommunity.addEventListener("click", () => showCommunity(true));
backHome.addEventListener("click", () => showCommunity(false));
community.addEventListener("keydown", (event) => {
  if (event.key === "Escape") showCommunity(false);
});

finishConfirmation.addEventListener("close", () => {
  if (finishConfirmation.returnValue === "finish") void finishTest();
});

function setImageOnly(button, enabled) {
  resetImageZoom?.();
  button.setAttribute("aria-pressed", String(enabled));
  button.title = enabled ? "Show controls (Esc)" : "Hide controls";
  button.focus({ preventScroll: true });
}

dialog.addEventListener("keydown", (event) => {
  if (!review || review.saving || finishConfirmation.open || event.defaultPrevented || event.isComposing ||
      event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.target.closest("input, .prompt-text")) return;

  if (event.key === " ") {
    if (event.target.closest("button, a")) return;
    event.preventDefault();
    if (!event.repeat && review.index < review.test.prompts.length - 1) advance();
    return;
  }

  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  const index = review.active + (event.key === "ArrowRight" ? 1 : -1);
  const option = dialog.querySelector(`[data-image="${index}"]`);
  if (!option) return;
  selectImage(index);
  if (event.target.closest("[data-image]")) option.focus({ preventScroll: true });
});

dialog.addEventListener("click", (event) => {
  if (review && !review.saving && event.detail > 0 && event.target.matches('input[name="stars"]')) focusReview();
  const button = event.target.closest("button");
  if (!button) return;
  if ("close" in button.dataset) { dialog.close(); return; }
  if ("imageOnly" in button.dataset) {
    setImageOnly(button, button.getAttribute("aria-pressed") === "false");
    return;
  }
  if (!review || review.saving) return;
  if ("prompt" in button.dataset) button.setAttribute("aria-expanded", button.getAttribute("aria-expanded") === "false" ? "true" : "false");
  if ("image" in button.dataset) {
    selectImage(Number(button.dataset.image));
    if (event.detail > 0) focusReview();
  }
  if ("back" in button.dataset && review.index) {
    review.index--;
    saveDraft();
    renderPrompt();
  }
  if ("next" in button.dataset) advance();
  if ("finish" in button.dataset) requestFinish();
});

dialog.addEventListener("change", (event) => {
  if (!review || review.saving || event.target.name !== "stars") return;
  const { index, active, test, ratings } = review;
  const { images } = test.prompts[index];
  const imageId = images[active].id;
  const wasUnrated = !ratings[imageId];
  ratings[imageId] = Number(event.target.value);
  const revision = Math.max(Date.now() * 1000 + Math.floor(Math.random() * 1000), (review.revisions[imageId] ?? 0) + 1);
  review.revisions[imageId] = revision;
  queueRating(test.id, imageId, ratings[imageId], revision);
  void flushProgress();

  const nextUnrated = images.findIndex(({ id }, position) => position > active && !ratings[id]);
  const firstUnrated = nextUnrated >= 0 ? nextUnrated : images.findIndex(({ id }) => !ratings[id]);
  if (firstUnrated < 0 && wasUnrated && index < test.prompts.length - 1) {
    advance();
    return;
  }

  saveDraft();
  if (firstUnrated >= 0) {
    selectImage(firstUnrated);
    focusReview();
  } else {
    updateControls();
  }
});

dialog.addEventListener("cancel", (event) => {
  const imageOnly = dialog.querySelector('[data-image-only][aria-pressed="true"]');
  if (imageOnly) {
    event.preventDefault();
    setImageOnly(imageOnly, false);
    return;
  }
  const prompt = dialog.querySelector("[data-prompt][aria-expanded='true']");
  if (prompt) {
    event.preventDefault();
    prompt.setAttribute("aria-expanded", "false");
    prompt.focus();
  }
});

dialog.addEventListener("close", () => {
  review = null;
  resetImageZoom = undefined;
  renderHome();
  startTest.focus({ preventScroll: true });
});

window.addEventListener("resize", () => resetImageZoom?.());

try {
  home = await request();
  renderHome();
  const testId = home.tests[0]?.id;
  if (testId) {
    restorePending(testId);
    if (home.completed.includes(testId)) pendingRatings.forEach(acknowledge);
    else void flushProgress();
  }
}
catch (error) { homeStatus.textContent = error.message || "Could not load the test. Reload the page to try again."; }
