(() => {
  'use strict';

  const categories = {
    dev: ['개발', 'projects'], ctf: ['CTF / Wargame', 'writeups'],
    bugbounty: ['Bug Bounty', 'reports'], blog: ['블로그 · 기술문서', 'posts'],
    papers: ['논문 · 컨퍼런스', 'entries'], awards: ['공모전 · 자격증', 'items']
  };
  const $ = (id) => document.getElementById(id);
  const editor = $('post-editor');
  const reader = $('post-reader');
  const form = $('post-form');
  const fields = $('editor-fields');
  const maxFileSize = 5 * 1024 * 1024;
  const maxTotalSize = 20 * 1024 * 1024;
  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
  let db;
  let posts = [];
  let attachments = [];
  let editingId = null;
  let readingId = null;
  let busy = false;
  let dirty = false;
  let previewUrls = [];
  let cardUrls = [];
  let readerUrls = [];

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function release(urls) {
    urls.forEach((url) => URL.revokeObjectURL(url));
    urls.length = 0;
  }

  function imageFor(photo, urls) {
    const image = element('img');
    const url = URL.createObjectURL(photo.blob);
    urls.push(url);
    image.src = url;
    image.alt = photo.name;
    image.loading = 'lazy';
    return image;
  }

  function status(message, error = false) {
    $('post-status').textContent = message;
    $('post-status').classList.toggle('is-error', error);
  }

  function setBusy(value) {
    busy = value;
    fields.disabled = value;
    ['post-submit', 'editor-cancel', 'editor-close'].forEach((id) => { $(id).disabled = value; });
  }

  function storageError(error) {
    return error?.name === 'QuotaExceededError'
      ? '브라우저 저장 공간이 부족합니다. 첨부 사진을 줄이거나 이전 게시물을 삭제해 주세요.'
      : '브라우저에 저장하지 못했습니다. 저장소 접근 설정과 남은 공간을 확인한 뒤 다시 시도해 주세요.';
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('manbok-portfolio', 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('posts', { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => status('저장소를 열려면 이 사이트의 다른 탭을 닫고 새로고침해 주세요.', true);
    });
  }

  // Resolve only after the transaction commits, including all attached image blobs.
  function transact(mode, action) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('posts', mode);
      const request = action(transaction.objectStore('posts'));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error || request.error);
      transaction.onabort = () => reject(transaction.error || request.error);
    });
  }

  function renderPosts() {
    release(cardUrls);
    Object.entries(categories).forEach(([category, [, unit]]) => {
      const section = $(category);
      const grid = section.querySelector('.grid');
      grid.querySelectorAll('.post-card').forEach((card) => card.remove());
      const entries = posts.filter((post) => post.category === category)
        .sort((a, b) => b.createdAt - a.createdAt);
      grid.querySelector('.empty').hidden = entries.length > 0;
      section.querySelector('.count').textContent = `${entries.length} ${unit}`;
      entries.forEach((post) => {
        const card = element('article', 'card post-card');
        if (post.images.length) {
          const image = imageFor(post.images[0], cardUrls);
          image.className = 'post-cover';
          card.append(image);
        }
        card.append(element('span', 'post-category', categories[category][0]));
        card.append(element('h3', '', post.title));
        const excerpt = post.body.length > 140 ? `${post.body.slice(0, 140)}…` : post.body;
        card.append(element('p', 'post-excerpt', excerpt || '사진으로 남긴 기록입니다.'));
        if (post.images.length) card.append(element('p', 'post-meta', `사진 ${post.images.length}장`));
        const foot = element('div', 'foot');
        const time = element('time', 'date', dateFormat.format(post.createdAt));
        time.dateTime = new Date(post.createdAt).toISOString();
        const read = element('button', 'read-post', '자세히 보기 →');
        read.type = 'button';
        read.setAttribute('aria-label', `${post.title} 자세히 보기`);
        read.addEventListener('click', () => openReader(post.id));
        foot.append(time, read);
        card.append(foot);
        grid.append(card);
      });
    });
  }

  function renderPreviews() {
    release(previewUrls);
    $('image-previews').replaceChildren();
    $('image-count').textContent = `${attachments.length} / 6장`;
    attachments.forEach((photo, index) => {
      const item = element('li', 'image-preview');
      const remove = element('button', 'icon-button', '✕');
      remove.type = 'button';
      remove.setAttribute('aria-label', `${photo.name} 첨부 제거`);
      remove.addEventListener('click', () => {
        attachments.splice(index, 1);
        dirty = true;
        renderPreviews();
        const next = $('image-previews').querySelectorAll('button');
        (next[Math.min(index, next.length - 1)] || $('post-images')).focus();
      });
      item.append(imageFor(photo, previewUrls), remove, element('p', '', photo.name));
      $('image-previews').append(item);
    });
  }

  function openEditor(category, post = null) {
    form.reset();
    editingId = post?.id ?? null;
    attachments = post ? [...post.images] : [];
    $('post-category').value = post?.category || category;
    $('post-title').value = post?.title || '';
    $('post-body').value = post?.body || '';
    $('editor-title').textContent = post ? '게시물 수정' : '새 글 작성';
    $('post-submit').textContent = post ? '수정 저장' : '게시하기';
    $('editor-message').textContent = '';
    dirty = false;
    renderPreviews();
    editor.showModal();
    $('post-title').focus();
  }

  function requestEditorClose() {
    if (busy) return;
    if (dirty && !window.confirm('작성 중인 내용을 저장하지 않고 닫을까요?')) return;
    editor.close();
  }

  function openReader(id) {
    const post = posts.find((entry) => entry.id === id);
    if (!post) return;
    readingId = id;
    release(readerUrls);
    $('reader-category').textContent = categories[post.category][0];
    $('reader-title').textContent = post.title;
    $('reader-date').textContent = `${dateFormat.format(post.createdAt)} 작성${post.updatedAt !== post.createdAt ? ` · ${dateFormat.format(post.updatedAt)} 수정` : ''}`;
    $('reader-body').textContent = post.body;
    $('reader-images').replaceChildren(...post.images.map((photo) => imageFor(photo, readerUrls)));
    reader.showModal();
  }

  function validateImage(file) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => { URL.revokeObjectURL(url); resolve({ name: file.name, blob: file }); };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`“${file.name}” 사진을 읽을 수 없습니다. 다른 파일을 선택해 주세요.`)); };
      image.src = url;
    });
  }

  $('post-images').addEventListener('change', async (event) => {
    const files = [...event.target.files];
    event.target.value = '';
    if (!files.length) return;
    $('editor-message').textContent = '';
    if (attachments.length + files.length > 6) {
      $('editor-message').textContent = '사진은 최대 6장까지 첨부할 수 있습니다.';
      return;
    }
    if (files.some((file) => !allowedTypes.has(file.type) || file.size > maxFileSize)) {
      $('editor-message').textContent = 'JPG, PNG, WebP, GIF 형식의 5MB 이하 사진만 첨부해 주세요.';
      return;
    }
    if ([...attachments.map((photo) => photo.blob), ...files].reduce((sum, file) => sum + file.size, 0) > maxTotalSize) {
      $('editor-message').textContent = '첨부 사진의 합계 크기는 20MB 이하여야 합니다.';
      return;
    }
    setBusy(true);
    $('editor-message').textContent = '사진을 확인하는 중입니다…';
    try {
      const images = await Promise.all(files.map(validateImage));
      attachments.push(...images);
      dirty = true;
      renderPreviews();
      $('editor-message').textContent = '';
    } catch (error) {
      $('editor-message').textContent = error.message;
    } finally {
      setBusy(false);
    }
  });

  form.addEventListener('input', () => { dirty = true; });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    const title = $('post-title').value.trim();
    const body = $('post-body').value.trim();
    if (!title || (!body && !attachments.length)) {
      $('editor-message').textContent = !title ? '제목을 입력해 주세요.' : '내용이나 사진을 하나 이상 추가해 주세요.';
      (!title ? $('post-title') : $('post-body')).focus();
      return;
    }
    setBusy(true);
    const previous = posts.find((post) => post.id === editingId);
    const now = Date.now();
    const post = {
      id: editingId || crypto.randomUUID(), category: $('post-category').value,
      title, body, images: [...attachments], createdAt: previous?.createdAt || now, updatedAt: now
    };
    $('editor-message').textContent = '저장하는 중입니다…';
    try {
      await transact('readwrite', (store) => store.put(post));
      posts = posts.filter((entry) => entry.id !== post.id);
      posts.push(post);
      renderPosts();
      dirty = false;
      editor.close();
      status(previous ? '게시물을 수정했습니다. 이 브라우저에 저장되었습니다.' : '게시물을 등록했습니다. 이 브라우저에 저장되었습니다.');
      $(post.category).scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      $('editor-message').textContent = storageError(error);
    } finally {
      setBusy(false);
    }
  });

  $('editor-close').addEventListener('click', requestEditorClose);
  $('editor-cancel').addEventListener('click', requestEditorClose);
  editor.addEventListener('cancel', (event) => { event.preventDefault(); requestEditorClose(); });
  editor.addEventListener('close', () => { release(previewUrls); attachments = []; });
  $('reader-close').addEventListener('click', () => reader.close());
  reader.addEventListener('close', () => { release(readerUrls); $('reader-images').replaceChildren(); });
  $('post-edit').addEventListener('click', () => {
    const post = posts.find((entry) => entry.id === readingId);
    reader.close();
    if (post) openEditor(post.category, post);
  });
  $('post-delete').addEventListener('click', async () => {
    if (!window.confirm('이 게시물과 첨부 사진을 삭제할까요? 삭제한 내용은 복구할 수 없습니다.')) return;
    const id = readingId;
    $('post-delete').disabled = true;
    $('post-edit').disabled = true;
    try {
      await transact('readwrite', (store) => store.delete(id));
      posts = posts.filter((post) => post.id !== id);
      reader.close();
      renderPosts();
      status('게시물을 삭제했습니다.');
    } catch (error) {
      window.alert(storageError(error));
    } finally {
      $('post-delete').disabled = false;
      $('post-edit').disabled = false;
    }
  });

  Object.keys(categories).forEach((category) => {
    const section = $(category);
    const actions = element('div', 'section-post-actions');
    const write = element('button', 'btn btn-ghost post-write', '+ 글쓰기');
    write.type = 'button';
    write.dataset.write = category;
    write.disabled = true;
    write.setAttribute('aria-label', `${categories[category][0]} 글쓰기`);
    section.querySelector('.sec-head').append(actions);
    actions.append(section.querySelector('.count'), write);
  });
  document.querySelectorAll('[data-write]').forEach((button) => {
    button.addEventListener('click', () => {
      $('menu').classList.remove('open');
      openEditor(button.dataset.write);
    });
  });

  (async () => {
    try {
      db = await openDatabase();
      db.onversionchange = () => {
        db.close();
        document.querySelectorAll('[data-write]').forEach((button) => { button.disabled = true; });
        status('저장소가 변경되었습니다. 페이지를 새로고침해 주세요.', true);
      };
      posts = await transact('readonly', (store) => store.getAll());
      renderPosts();
      document.querySelectorAll('[data-write]').forEach((button) => { button.disabled = false; });
      status(posts.length ? `저장된 게시물 ${posts.length}개를 불러왔습니다.` : '각 카테고리의 글쓰기 버튼으로 첫 기록을 남겨 보세요.');
    } catch (error) {
      status('게시물 저장소를 열 수 없습니다. 브라우저의 사이트 데이터 저장을 허용한 뒤 새로고침해 주세요.', true);
    }
  })();
})();
