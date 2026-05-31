/* ==========================================================================
   ADMIN — éditeur du portfolio
   Modifie content.json en direct via le serveur local.
   ========================================================================== */

/* --- Redirige automatiquement file:// vers http://localhost:8765 ---
   L'admin a besoin du serveur Python pour fonctionner. Si l'utilisateur a
   ouvert admin.html en double-cliquant sur le fichier (file://), on le
   redirige sur le bon URL. */
if (location.protocol === 'file:') {
  const path = location.pathname.split(/[\\/]/).pop() || 'admin.html';
  location.replace('http://localhost:8765/' + path + location.search + location.hash);
}

(() => {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  let DATA = null;
  let isDirty = false;
  let availableImages = [];

  /* ----------  STATUS + TOAST  ---------- */
  const statusEl = $('#status');
  const toastEl = $('#toast');

  function setStatus(state, text) {
    statusEl.className = 'status ' + (state ? `is-${state}` : '');
    statusEl.textContent = text;
  }
  function toast(msg, type = '') {
    toastEl.textContent = msg;
    toastEl.className = 'toast is-show ' + (type ? `is-${type}` : '');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove('is-show'), 2200);
  }

  /* ----------  GET / SET by path  ---------- */
  function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  }
  function setPath(obj, path, val) {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((o, k) => (o[k] = o[k] ?? {}), obj);
    target[last] = val;
  }

  /* ----------  TEMPLATES ---------- */
  const TPL = {
    social: () => ({ label: '', url: '' }),
    project: () => ({
      id: 'new-' + Date.now().toString(36),
      title: 'Nouveau projet',
      client: '',
      year: new Date().getFullYear().toString(),
      role: '',
      description: '',
      tags: [],
      thumbnail: '',
      gallery: []
    })
  };

  /* ----------  DIRTY TRACKING  ---------- */
  function markDirty() {
    isDirty = true;
    setStatus('dirty', 'Modifications non enregistrées');
  }
  window.addEventListener('beforeunload', (e) => {
    if (isDirty) { e.preventDefault(); e.returnValue = ''; }
  });

  /* ----------  BIND SIMPLE FIELDS  ---------- */
  function bindField(input) {
    const path = input.dataset.bind;
    const pathArr = input.dataset.bindArr;
    const pathLines = input.dataset.bindLines;

    if (path) {
      const val = getPath(DATA, path);
      input.value = val == null ? '' : val;
      input.addEventListener('input', () => { setPath(DATA, path, input.value); markDirty(); });
    }
    if (pathArr) {
      const val = getPath(DATA, pathArr);
      input.value = Array.isArray(val) ? val.join(', ') : '';
      input.addEventListener('input', () => {
        const arr = input.value.split(',').map(s => s.trim()).filter(Boolean);
        setPath(DATA, pathArr, arr);
        markDirty();
      });
    }
    if (pathLines) {
      const val = getPath(DATA, pathLines);
      input.value = Array.isArray(val) ? val.join('\n') : '';
      input.addEventListener('input', () => {
        const arr = input.value.split('\n').map(s => s.trim()).filter(Boolean);
        setPath(DATA, pathLines, arr);
        markDirty();
      });
    }
  }

  function bindAllFields(root = document) {
    $$('[data-bind], [data-bind-arr], [data-bind-lines]', root).forEach(bindField);
  }

  /* ----------  TAGS EDITOR (marquee)  ---------- */
  function renderTagsEditor(container) {
    const path = container.dataset.list;
    const arr = getPath(DATA, path) || [];
    container.innerHTML = '';
    arr.forEach((val, i) => {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.innerHTML = `<span>${escapeHTML(val)}</span><button title="Supprimer">✕</button>`;
      tag.querySelector('button').addEventListener('click', () => {
        arr.splice(i, 1);
        setPath(DATA, path, arr);
        markDirty();
        renderTagsEditor(container);
      });
      container.appendChild(tag);
    });
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Ajouter… (Entrée)';
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        e.preventDefault();
        arr.push(input.value.trim());
        setPath(DATA, path, arr);
        markDirty();
        renderTagsEditor(container);
      }
    });
    container.appendChild(input);
    input.focus();
  }

  /* ----------  REPEATERS  ---------- */
  function renderRepeater(container) {
    const path = container.dataset.list;
    const tplName = container.dataset.template;
    const arr = getPath(DATA, path) || [];
    container.innerHTML = '';
    arr.forEach((item, i) => {
      const el = spawnRepeaterItem(tplName, path, i);
      container.appendChild(el);
    });
  }

  function spawnRepeaterItem(tplName, path, index) {
    const tpl = $('#tpl-' + tplName);
    const frag = tpl.content.cloneNode(true);
    const item = frag.querySelector('[data-item]');

    // Bind each sub-field to arr[index].<key>
    $$('[data-bind], [data-bind-arr], [data-bind-lines]', item).forEach(input => {
      const subPath = input.dataset.bind || input.dataset.bindArr || input.dataset.bindLines;
      const full = `${path}.${index}.${subPath}`;
      if (input.dataset.bind) {
        input.dataset.bind = full;
      } else if (input.dataset.bindArr) {
        input.dataset.bindArr = full;
      } else {
        input.dataset.bindLines = full;
      }
      bindField(input);
    });

    // Image pickers
    $$('.img-picker', item).forEach(picker => {
      const input = picker.querySelector('input[data-bind]');
      const preview = picker.querySelector('[data-preview]');
      const pickBtn = picker.querySelector('[data-pick]');
      const updatePreview = () => {
        const val = input.value;
        if (val) {
          preview.style.backgroundImage = `url("${val}")`;
          preview.classList.add('has-image');
        } else {
          preview.style.backgroundImage = '';
          preview.classList.remove('has-image');
        }
      };
      input.addEventListener('input', updatePreview);
      updatePreview();
      pickBtn.addEventListener('click', () => openPicker((src) => {
        input.value = src;
        input.dispatchEvent(new Event('input'));
      }));
    });

    // Gallery editors (multi-images) — chemin complet arr[index].gallery
    $$('[data-gallery]', item).forEach(g => {
      const sub = g.dataset.gallery;
      const full = `${path}.${index}.${sub}`;
      g.dataset.gallery = full;
      renderGalleryEditor(g, full);
    });

    // Remove button
    const removeBtn = item.querySelector('[data-remove]');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        if (!confirm('Supprimer cet élément ?')) return;
        const arr = getPath(DATA, path);
        arr.splice(index, 1);
        markDirty();
        // re-render parent
        const parent = removeBtn.closest('.repeater');
        renderRepeater(parent);
      });
    }

    return item;
  }

  function bindAddButtons() {
    $$('[data-add]').forEach(btn => {
      btn.addEventListener('click', () => {
        const path = btn.dataset.add;
        const tplName = btn.dataset.template;
        const arr = getPath(DATA, path) || [];
        arr.push(TPL[tplName]());
        setPath(DATA, path, arr);
        markDirty();
        const container = document.querySelector(`.repeater[data-list="${path}"]`);
        renderRepeater(container);
      });
    });
  }

  /* ----------  TABS ---------- */
  $$('.tabs__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.tab;
      $$('.tabs__btn').forEach(b => b.classList.toggle('is-active', b === btn));
      $$('.panel').forEach(p => p.classList.toggle('is-active', p.dataset.panel === name));
      if (name === 'media') refreshMediaGrid();
    });
  });

  /* ----------  SAVE ---------- */
  async function save() {
    setStatus('', 'Enregistrement…');
    try {
      const res = await fetch('/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(DATA)
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      isDirty = false;
      setStatus('saved', 'Enregistré ✓');
      toast('Modifications enregistrées', 'success');
    } catch (e) {
      setStatus('error', 'Erreur d\'enregistrement');
      toast('Erreur : ' + e.message, 'error');
    }
  }

  $('#saveBtn').addEventListener('click', save);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      save();
    }
  });

  /* ----------  UPLOAD ---------- */
  const dropzone = $('#dropzone');
  const fileInput = $('#fileInput');

  ['dragenter', 'dragover'].forEach(ev => dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropzone.classList.add('is-drag');
  }));
  ['dragleave', 'drop'].forEach(ev => dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropzone.classList.remove('is-drag');
  }));
  dropzone.addEventListener('drop', (e) => {
    handleFiles(e.dataTransfer.files);
  });
  fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    toast(`Import de ${files.length} fichier${files.length > 1 ? 's' : ''}…`);
    for (const f of files) {
      try {
        const b64 = await fileToBase64(f);
        const res = await fetch('/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: f.name, data: b64 })
        });
        if (!res.ok) throw new Error('upload failed');
        const j = await res.json();
        if (!j.ok) throw new Error(j.error || 'upload failed');
      } catch (e) {
        toast(`Erreur sur ${f.name}`, 'error');
      }
    }
    toast('Import terminé ✓', 'success');
    await refreshMediaGrid();
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  /* ----------  MEDIA GRID ---------- */
  async function refreshMediaGrid() {
    const grid = $('#mediaGrid');
    try {
      const r = await fetch('/list-images?t=' + Date.now());
      const j = await r.json();
      availableImages = j.images || [];
      if (availableImages.length === 0) {
        grid.innerHTML = `<p class="media-empty">Aucune image — déposez des fichiers ci-dessus pour commencer.</p>`;
        return;
      }
      grid.innerHTML = availableImages.map(img => `
        <div class="media-item" data-src="${escapeAttr(img)}">
          ${isVideo(img)
            ? `<video src="${escapeAttr(img)}" muted></video>`
            : `<img src="${escapeAttr(img)}" alt="" loading="lazy" />`}
          <span class="media-item__copy">Copier</span>
          <span class="media-item__path">${escapeHTML(img)}</span>
        </div>
      `).join('');
      $$('.media-item', grid).forEach(el => {
        el.addEventListener('click', () => {
          const src = el.dataset.src;
          navigator.clipboard?.writeText(src).catch(() => {});
          toast('Chemin copié : ' + src, 'success');
        });
      });
    } catch (e) {
      grid.innerHTML = `<p class="media-empty">Impossible de charger la médiathèque.</p>`;
    }
  }

  function isVideo(path) {
    return /\.(mp4|webm|mov)$/i.test(path);
  }

  /* ----------  PICKER ---------- */
  const picker = $('#picker');
  const pickerGrid = $('#pickerGrid');
  let pickerCallback = null;

  async function openPicker(cb) {
    pickerCallback = cb;
    if (availableImages.length === 0) await refreshMediaGrid();
    pickerGrid.innerHTML = availableImages.length
      ? availableImages.map(img => `
          <div class="media-item" data-src="${escapeAttr(img)}">
            ${isVideo(img)
              ? `<video src="${escapeAttr(img)}" muted></video>`
              : `<img src="${escapeAttr(img)}" alt="" loading="lazy" />`}
            <span class="media-item__path">${escapeHTML(img)}</span>
          </div>
        `).join('')
      : `<p class="media-empty">Aucune image disponible — importez-en depuis l'onglet Médiathèque.</p>`;
    $$('.media-item', pickerGrid).forEach(el => {
      el.addEventListener('click', () => {
        pickerCallback?.(el.dataset.src);
        closePicker();
      });
    });
    picker.classList.add('is-open');
  }
  function closePicker() { picker.classList.remove('is-open'); pickerCallback = null; }
  $('#pickerClose').addEventListener('click', closePicker);
  picker.addEventListener('click', (e) => { if (e.target === picker) closePicker(); });

  /* ----------  HELPERS ---------- */
  function escapeHTML(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  function escapeAttr(s) { return escapeHTML(s); }

  /* ----------  INIT ---------- */
  async function init() {
    setStatus('', 'Chargement…');
    try {
      const r = await fetch('content.json?t=' + Date.now());
      DATA = await r.json();
    } catch (e) {
      setStatus('error', 'Impossible de charger content.json');
      return;
    }

    bindAllFields();
    $$('.tags-editor[data-list]').forEach(renderTagsEditor);
    $$('.repeater[data-list]').forEach(renderRepeater);
    bindAddButtons();

    setStatus('saved', 'À jour');
    refreshMediaGrid();
  }

  init();
})();
