const dashboard = document.querySelector("#dashboard");
const homeStatus = document.querySelector("#home-status");
const dialog = document.querySelector("#review");
const stars = [1, 2, 3, 4, 5];
const number = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });
const integer = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });
let home;
let review;
let opener;

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const imageUrl = (id) => `/media/${encodeURIComponent(id)}.webp`;
const draftKey = (id) => `public-model-test-draft:${id}`;

async function request({ test, ratings } = {}) {
  const url = ratings ? "/api/benchmark" : test ? `/api/benchmark?test=${encodeURIComponent(test)}` : "/api/benchmark";
  const result = await fetch(url, ratings ? {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ testId: test, ratings }),
  } : {});
  const body = await result.json();
  if (!result.ok) throw new Error(body.error);
  return body;
}

function board(title, rows, isCommunity = false) {
  return `<section class="surface" aria-label="${title}">
    <header><h2>${title}</h2>${isCommunity && home.participants ? `<p class="quiet">${integer.format(home.participants)} katılımcı</p>` : ""}</header>
    ${rows.length ? `<div class="scroll-table" tabindex="0"><table>
      <thead><tr><th scope="col">Model</th><th scope="col">Ort. yıldız</th><th scope="col">Puan</th>${isCommunity ? '<th scope="col">Katılımcı</th>' : ""}</tr></thead>
      <tbody>${rows.map((entry) => `<tr><th scope="row">${escapeHtml(entry.model)}</th><td class="score">${number.format(entry.average)} / 5</td><td>${integer.format(entry.votes)}</td>${isCommunity ? `<td>${integer.format(entry.participants)}</td>` : ""}</tr>`).join("")}</tbody>
    </table></div>` : `<p class="empty">${isCommunity ? "İlk değerlendirmeler geldikçe sıralama burada görünecek." : "Puan verdiğin modeller burada sıralanacak."}</p>`}
  </section>`;
}

function renderHome() {
  homeStatus.hidden = true;
  dashboard.hidden = false;
  dashboard.innerHTML = `<section class="surface" aria-labelledby="archive-title">
    <header><h2 id="archive-title">Test arşivi</h2><p class="quiet">${home.tests.length} test · ${integer.format(home.tests.reduce((sum, test) => sum + test.images, 0))} görsel</p></header>
    <ul class="tests">${home.tests.map((test) => `<li>
      <div class="test-info"><h3>${escapeHtml(test.title)}</h3><p class="topics" title="${escapeHtml(test.topics.join(" · "))}">${escapeHtml(test.topics.join(" · "))}</p>
      <p class="quiet">${test.prompts} prompt · ${test.images} görsel</p></div>
      <button type="button" class="action ${home.completed.includes(test.id) ? "secondary" : ""}" data-test="${escapeHtml(test.id)}">${home.completed.includes(test.id) ? "Sonuçları gör" : "Teste başla"}</button>
    </li>`).join("")}</ul>
  </section><div class="boards">${board("Topluluk sıralaması", home.community, true)}${board("Kişisel sıralaman", home.personal)}</div>`;
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
  const ranked = test.prompts.flatMap((prompt) => prompt.images.map((image) => ({ ...image, prompt: prompt.title })))
    .sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0));
  dialog.innerHTML = `<div class="result"><main class="result-inner">
    <header class="result-top"><div><p class="quiet">${escapeHtml(test.title)}</p><h2 tabindex="-1">Test sonuçların</h2></div><button class="action secondary" type="button" data-close>Arşive dön</button></header>
    <div class="result-boards">${board("Kişisel sıralaman", home.personal)}${board("Topluluk sıralaması", home.community, true)}</div>
    <h3 class="gallery-heading">Görsel sıralaması</h3>
    <div class="result-grid">${ranked.map((image) => `<figure><img loading="lazy" src="${imageUrl(image.id)}" alt="${escapeHtml(image.model)}">
      <figcaption><strong>${escapeHtml(image.model)}</strong> · ${image.stars ? `${image.stars} / 5` : "Puanlanmadı"}<br><span class="quiet">${escapeHtml(image.prompt)}</span></figcaption></figure>`).join("")}</div>
  </main></div>`;
  dialog.querySelector("h2").focus();
}

function updateControls() {
  const prompt = review.test.prompts[review.index];
  const image = prompt.images[review.active];
  const rated = prompt.images.filter(({ id }) => review.ratings[id]).length;
  const final = review.index === review.test.prompts.length - 1;
  dialog.querySelector("#rating-progress").textContent = `${rated}/${prompt.images.length} puanlandı`;
  dialog.querySelector("#rating-label").textContent = `Görsel ${review.active + 1} için yıldız`;
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
  next.textContent = final ? "Sonuçları gör" : rated === prompt.images.length ? "Sonraki" : "Geç";
  next.disabled = review.saving || (final && !Object.keys(review.ratings).length);
}

function selectImage(index) {
  const prompt = review.test.prompts[review.index];
  if (!prompt.images[index]) return;
  review.active = index;
  const image = dialog.querySelector("#active-image");
  const status = dialog.querySelector("#image-status");
  status.hidden = false;
  status.textContent = "Görsel yükleniyor…";
  image.onload = () => { status.hidden = true; dialog.querySelector(".stars").disabled = false; };
  image.onerror = () => { status.textContent = "Görsel yüklenemedi."; };
  dialog.querySelector(".stars").disabled = true;
  image.alt = `Görsel ${index + 1}`;
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
        <button type="button" class="prompt-title" aria-expanded="false" aria-controls="full-prompt" data-prompt>${escapeHtml(prompt.title)}</button>
        <div class="prompt-text" id="full-prompt" tabindex="0">${escapeHtml(prompt.prompt)}</div>
      </div>
      <button type="button" class="icon-button" data-close aria-label="Arşive dön">✕</button>
    </header>
    <div class="image-stage"><img id="active-image" alt="" fetchpriority="high"><p class="stage-status" id="image-status" role="status">Görsel yükleniyor…</p></div>
    <footer class="review-foot">
      <div class="options" role="group" aria-label="Bu promptun görselleri">${prompt.images.map(({ id }, i) => `<button type="button" class="option" data-image="${i}" aria-label="Görsel ${i + 1}"><img src="${imageUrl(id)}" alt="" loading="lazy"><span hidden></span></button>`).join("")}</div>
      <div class="review-actions">
        <button type="button" class="icon-button" data-back aria-label="Önceki prompt" ${index === 0 ? "disabled" : ""}>‹</button>
        <fieldset class="stars"><legend id="rating-label" class="sr-only">Görsel için yıldız</legend>
        ${stars.map((score) => `<label><input type="radio" value="${score}" name="stars"><span aria-hidden="true">★</span><span class="sr-only">${score} yıldız</span></label>`).join("")}</fieldset>
        <button type="button" class="action" data-next>Geç</button>
      </div>
      <p id="rating-progress" class="quiet" role="status" style="text-align:center"></p>
      <p id="review-error" class="warning" role="status"></p>
    </footer>
  </div>`;
  selectImage(0);
  dialog.querySelector("[data-prompt]").focus();
}

async function openTest(button) {
  opener = button;
  button.disabled = true;
  try {
    const result = await request({ test: button.dataset.test });
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
    homeStatus.hidden = false;
    homeStatus.textContent = error.message || "Test açılamadı.";
  } finally {
    button.disabled = false;
  }
}

async function advance() {
  if (!review || review.saving) return;
  if (review.index < review.test.prompts.length - 1) {
    review.index++;
    saveDraft();
    renderPrompt();
    return;
  }
  if (!Object.keys(review.ratings).length) return;
  const current = review;
  current.saving = true;
  updateControls();
  const status = dialog.querySelector("#review-error");
  status.textContent = "Puanlar kaydediliyor…";
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
      status.textContent = error.message || "Puanlar kaydedilemedi. Tekrar dene.";
      updateControls();
    }
  }
}

dashboard.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-test]");
  if (button) void openTest(button);
});

dialog.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if ("close" in button.dataset) { dialog.close(); return; }
  if (!review || review.saving) return;
  if ("prompt" in button.dataset) button.setAttribute("aria-expanded", button.getAttribute("aria-expanded") === "false" ? "true" : "false");
  if ("image" in button.dataset) selectImage(Number(button.dataset.image));
  if ("back" in button.dataset && review.index) {
    review.index--;
    saveDraft();
    renderPrompt();
  }
  if ("next" in button.dataset) void advance();
});

dialog.addEventListener("change", (event) => {
  if (!review || review.saving || event.target.name !== "stars") return;
  const image = review.test.prompts[review.index].images[review.active];
  review.ratings[image.id] = Number(event.target.value);
  saveDraft();
  updateControls();
});

dialog.addEventListener("cancel", (event) => {
  const prompt = dialog.querySelector("[data-prompt][aria-expanded='true']");
  if (prompt) {
    event.preventDefault();
    prompt.setAttribute("aria-expanded", "false");
    prompt.focus();
  }
});

dialog.addEventListener("close", () => {
  review = null;
  if (home) {
    const id = opener?.dataset.test;
    renderHome();
    [...dashboard.querySelectorAll("[data-test]")].find((button) => button.dataset.test === id)?.focus();
  }
});

try { home = await request(); renderHome(); }
catch (error) { homeStatus.textContent = error.message || "Test arşivi yüklenemedi."; }
