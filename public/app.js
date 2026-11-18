const homeStatus = document.querySelector("#home-status");
const landing = document.querySelector("#landing");
const hero = document.querySelector("#hero");
const community = document.querySelector("#community");
const communityContent = document.querySelector("#community-content");
const startTest = document.querySelector("#start-test");
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

async function request({ test, ratings } = {}) {
  const url = ratings ? "/api/benchmark" : test ? `/api/benchmark?test=${encodeURIComponent(test)}` : "/api/benchmark";
  const result = await fetch(url, ratings ? {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ testId: test, ratings }),
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
  const saved = storedDraft(test.id);
  const label = completed ? "View your results" : saved ? "Resume test" : "Start test";
  startTest.innerHTML = `${label} <span class="arrow" aria-hidden="true"></span>`;
  startTest.disabled = false;
  openCommunity.disabled = false;
  homeStatus.textContent = "";
}

function showCommunity(show) {
  if (show) {
    communityContent.innerHTML = board("Model rankings", home.community, true);
  }
  landing.classList.toggle("show-community", show);
  hero.hidden = show;
  community.hidden = !show;
  if (show) document.querySelector("#community-title").focus({ preventScroll: true });
  else openCommunity.focus({ preventScroll: true });
}

function storedDraft(id) {
  try { return JSON.parse(localStorage.getItem(draftKey(id)) ?? "null"); } catch { return null; }
}

function saveDraft() {
  try { localStorage.setItem(draftKey(review.test.id), JSON.stringify({ ratings: review.ratings, index: review.index })); } catch {}
}

function shuffled(images) {
  const result = images.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const other = Math.floor(Math.random() * (i + 1));
    [result[i], result[other]] = [result[other], result[i]];
  }
  return result;
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
  dialog.querySelector("#rating-label").textContent = `Rating for image ${review.active + 1}`;
  for (const [index, button] of [...dialog.querySelectorAll(".option")].entries()) {
    button.setAttribute("aria-current", index === review.active ? "true" : "false");
    const score = review.ratings[prompt.images[index].id];
    button.querySelector("span").hidden = !score;
    button.querySelector("span").textContent = score ? `★ ${score}` : "";
  }
  for (const input of dialog.querySelectorAll(".stars input")) {
    input.checked = Number(input.value) === review.ratings[image.id];
    input.parentElement.classList.toggle("filled", Number(input.value) <= (review.ratings[image.id] ?? 0));
  }
  const next = dialog.querySelector("[data-next]");
  next.textContent = final ? "View results" : rated === prompt.images.length ? "Next" : "Skip";
  next.disabled = review.saving;
  dialog.querySelector("[data-finish]").disabled = review.saving;
}

function imageZoom(stage) {
  const image = stage.querySelector("img");
  const touches = new Map();
  let scale = 1;
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
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    stage.setPointerCapture(event.pointerId);
  });

  stage.addEventListener("pointermove", (event) => {
    if (!touches.has(event.pointerId) || !image.naturalWidth) return;
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

  for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) {
    stage.addEventListener(name, (event) => touches.delete(event.pointerId));
  }

  return () => {
    touches.clear();
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
}

function renderPrompt() {
  const { test, index } = review;
  const prompt = test.prompts[index];
  dialog.innerHTML = `<div class="review-grid">
    <header class="review-head">
      <div class="prompt"><p class="quiet">${escapeHtml(test.title)} · Prompt ${index + 1}/${test.prompts.length}</p>
        <button type="button" class="prompt-title" aria-expanded="false" aria-controls="full-prompt" data-prompt><span>${escapeHtml(prompt.title)}</span></button>
        <div class="prompt-text" id="full-prompt" tabindex="0">${escapeHtml(prompt.prompt)}</div>
      </div>
      <button type="button" class="icon-button" data-close aria-label="Back to home">✕</button>
    </header>
    <progress class="prompt-progress" value="${index + 1}" max="${test.prompts.length}" aria-label="Prompt progress"></progress>
    <div class="image-stage">
      <img id="active-image" alt="" fetchpriority="high" draggable="false">
      <p class="stage-status" id="image-status" role="status">Loading image…</p>
      <button type="button" class="icon-button image-only-toggle" data-image-only aria-label="Image-only view" aria-pressed="false" title="Hide controls">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <path class="expand-icon" d="M9 4H4v5m11-5h5v5m0 6v5h-5m-6 0H4v-5"/>
          <path class="restore-icon" d="M4 9h5V4m11 5h-5V4m5 11h-5v5M4 15h5v5"/>
        </svg>
      </button>
    </div>
    <footer class="review-foot">
      <div class="review-strip">
        <button type="button" class="icon-button" data-back aria-label="Previous prompt" ${index === 0 ? "disabled" : ""}>‹</button>
        <div class="options" role="group" aria-label="Images for this prompt">${prompt.images.map(({ id }, i) => `<button type="button" class="option" data-image="${i}" aria-label="Image ${i + 1}"><img src="${imageUrl(id)}" alt="" loading="lazy"><span hidden></span></button>`).join("")}</div>
        <p id="rating-progress" class="quiet" role="status"></p>
      </div>
      <div class="review-actions">
        <button class="finish-link" type="button" data-finish>Finish test</button>
        <fieldset class="stars"><legend id="rating-label" class="sr-only">Image rating</legend>
        ${stars.map((score) => `<label><input type="radio" value="${score}" name="stars"><span aria-hidden="true">★</span><span class="sr-only">${score} ${score === 1 ? "star" : "stars"}</span></label>`).join("")}</fieldset>
        <button type="button" class="action" data-next>Skip</button>
      </div>
      <p id="review-error" class="warning" role="status"></p>
    </footer>
  </div>`;
  resetImageZoom = imageZoom(dialog.querySelector(".image-stage"));
  selectImage(0);
  dialog.querySelector("[data-prompt]").focus();
}

async function openTest() {
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
    const test = { ...result.test, prompts: result.test.prompts.map((prompt) => ({ ...prompt, images: shuffled(prompt.images) })) };
    const saved = storedDraft(test.id);
    const validIds = new Set(test.prompts.flatMap(({ images }) => images.map(({ id }) => id)));
    const ratings = Object.fromEntries(Object.entries(saved?.ratings ?? {}).filter(([id, value]) => validIds.has(id) && stars.includes(value)));
    review = { test, index: Number.isInteger(saved?.index) ? Math.max(0, Math.min(saved.index, test.prompts.length - 1)) : 0, active: 0, ratings, saving: false };
    renderPrompt();
  } catch (error) {
    homeStatus.textContent = error.message || "Could not open the test. Try again.";
  } finally {
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
    const result = await request({ test: current.test.id, ratings: current.ratings });
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

dialog.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if ("close" in button.dataset) { dialog.close(); return; }
  if ("imageOnly" in button.dataset) {
    setImageOnly(button, button.getAttribute("aria-pressed") === "false");
    return;
  }
  if (!review || review.saving) return;
  if ("prompt" in button.dataset) button.setAttribute("aria-expanded", button.getAttribute("aria-expanded") === "false" ? "true" : "false");
  if ("image" in button.dataset) selectImage(Number(button.dataset.image));
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
  const image = review.test.prompts[review.index].images[review.active];
  review.ratings[image.id] = Number(event.target.value);
  saveDraft();
  updateControls();
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

try { home = await request(); renderHome(); }
catch (error) { homeStatus.textContent = error.message || "Could not load the test. Reload the page to try again."; }
