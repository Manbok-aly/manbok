// Static site builder.
//   posts/<slug>.md  +  images/<slug>/*   ->   _site/
// index.html is the design template: the home page is index.html with post cards
// filled into each category section, and every post page reuses its head, nav and footer.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import MarkdownIt from 'markdown-it';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POSTS_DIR = path.join(ROOT, 'posts');
const IMAGES_DIR = path.join(ROOT, 'images');
const OUT_DIR = path.join(ROOT, '_site');
const TEMPLATE = path.join(ROOT, 'index.html');

// Section ids in index.html -> [label, unit used in the section's count badge].
const CATEGORIES = {
  dev: ['개발', 'projects'],
  ctf: ['CTF / Wargame', 'writeups'],
  bugbounty: ['Bug Bounty', 'reports'],
  blog: ['블로그 · 기술문서', 'posts'],
  papers: ['논문 · 컨퍼런스', 'entries'],
  awards: ['공모전 · 자격증', 'items'],
};
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const EXTERNAL_RE = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
const EXCERPT_LENGTH = 140;

// "/" for a user site or local preview, "/<repo>/" for a project site.
// In CI this comes from actions/configure-pages (e.g. "/manbok" or "").
const BASE = normalizeBase(process.env.BASE_PATH);

function normalizeBase(value) {
  const trimmed = (value || '').trim().replace(/^\/+|\/+$/g, '');
  if (/[\s?#]/.test(trimmed)) fail([`BASE_PATH "${value}" 에 공백이나 ?, # 를 넣을 수 없습니다.`]);
  return trimmed ? `/${trimmed}/` : '/';
}

function fail(errors) {
  console.error(`\n빌드 실패: 문제 ${errors.length}건\n`);
  errors.forEach((message) => console.error(`  ✖ ${message}`));
  console.error('');
  process.exit(1);
}

const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/');
const encodePath = (p) => p.split('/').map(encodeURIComponent).join('/');
const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeZone: 'UTC' });

// Windows and macOS ignore filename case, GitHub Pages does not. Check each path
// segment against the real directory listing so "01.PNG" vs "01.png" fails locally too.
function existsExactCase(absolute) {
  const parts = path.relative(ROOT, absolute).split(path.sep);
  let current = ROOT;
  for (const part of parts) {
    let entries;
    try { entries = fs.readdirSync(current); } catch { return false; }
    if (!entries.includes(part)) return false;
    current = path.join(current, part);
  }
  return fs.statSync(current).isFile();
}

// ---------------------------------------------------------------- posts

// YAML core schema: dates stay plain strings (no silent "2026-02-30" -> March 2),
// and only true/false become booleans.
const matterOptions = {
  engines: { yaml: (text) => yaml.load(text, { schema: yaml.CORE_SCHEMA }) ?? {} },
};

const md = new MarkdownIt({ html: false, linkify: true });

// Turn an image path written relative to posts/<slug>.md (as Obsidian expects)
// into a site URL, and remember the file so it gets copied. Returns null on error.
function resolveImage(src, where, errors, assets) {
  if (EXTERNAL_RE.test(src)) return src;
  if (src.startsWith('/')) {
    errors.push(`${where}: 이미지 경로 "${src}" 는 / 로 시작할 수 없습니다. 글 파일 기준 상대경로(../images/<slug>/파일명)로 적어 주세요.`);
    return null;
  }
  let decoded;
  try { decoded = decodeURIComponent(src.split(/[?#]/)[0]); } catch { decoded = src; }
  const absolute = path.resolve(POSTS_DIR, decoded);
  const inImages = path.relative(IMAGES_DIR, absolute);
  if (!inImages || inImages.startsWith('..') || path.isAbsolute(inImages)) {
    errors.push(`${where}: 이미지 "${src}" 가 images/ 폴더 밖을 가리킵니다. ../images/<slug>/파일명 형식으로 적어 주세요.`);
    return null;
  }
  if (!existsExactCase(absolute)) {
    errors.push(`${where}: 이미지 파일이 없습니다 → ${rel(absolute)} (대소문자까지 같아야 합니다)`);
    return null;
  }
  const sitePath = `images/${encodePath(inImages.split(path.sep).join('/'))}`;
  assets.add(absolute);
  return BASE + sitePath;
}

function plainText(tokens) {
  const text = [];
  for (const token of tokens) {
    if (token.type !== 'inline') continue;
    for (const child of token.children) {
      if (child.type === 'text' || child.type === 'code_inline') text.push(child.content);
      else if (child.type === 'softbreak' || child.type === 'hardbreak') text.push(' ');
    }
    text.push(' ');
  }
  return text.join('').replace(/\s+/g, ' ').trim();
}

function validDate(value) {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

function loadPost(file, errors, assets) {
  const where = rel(file);
  const slug = path.basename(file, '.md');
  let parsed;
  try {
    parsed = matter(fs.readFileSync(file, 'utf8'), matterOptions);
  } catch (error) {
    errors.push(`${where}: frontmatter(YAML)를 읽을 수 없습니다 — ${error.reason || error.message}`);
    return null;
  }
  const data = parsed.data || {};
  if (data.draft !== undefined && typeof data.draft !== 'boolean') {
    errors.push(`${where}: draft 는 true 또는 false 여야 합니다 (현재: ${JSON.stringify(data.draft)})`);
    return null;
  }
  if (data.draft === true) return { slug, draft: true };

  const before = errors.length;
  if (!SLUG_RE.test(slug)) {
    errors.push(`${where}: 파일 이름(slug)은 영문 소문자, 숫자, 하이픈(-)만 쓸 수 있습니다. 예: posts/dreamhack-web-01.md`);
  }
  if (Object.keys(parsed.data || {}).length === 0) {
    errors.push(`${where}: frontmatter 가 없습니다. 파일 맨 위에 --- 로 감싼 title, category, date 를 적어 주세요.`);
    return null;
  }
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  if (!title) errors.push(`${where}: title 이 비어 있거나 없습니다 (필수)`);
  if (data.category === undefined || data.category === null || data.category === '') {
    errors.push(`${where}: category 가 없습니다 (필수). 사용 가능: ${Object.keys(CATEGORIES).join(', ')}`);
  } else if (!Object.hasOwn(CATEGORIES, data.category)) {
    errors.push(`${where}: category "${data.category}" 는 없는 카테고리입니다. 사용 가능: ${
      Object.entries(CATEGORIES).map(([id, [label]]) => `${id}(${label})`).join(', ')}`);
  }
  const date = data.date === undefined || data.date === null ? '' : String(data.date).trim();
  if (!date) errors.push(`${where}: date 가 없습니다 (필수, YYYY-MM-DD)`);
  else if (!validDate(date)) errors.push(`${where}: date "${date}" 는 올바른 YYYY-MM-DD 날짜가 아닙니다`);
  if (data.summary !== undefined && data.summary !== null && typeof data.summary !== 'string') {
    errors.push(`${where}: summary 는 문자열이어야 합니다`);
  }
  let cover = null;
  if (data.cover !== undefined && data.cover !== null && data.cover !== '') {
    if (typeof data.cover !== 'string') errors.push(`${where}: cover 는 이미지 경로 문자열이어야 합니다`);
    else cover = resolveImage(md.normalizeLink(data.cover.trim()), `${where} (cover)`, errors, assets);
  }

  const env = {};
  const tokens = md.parse(parsed.content, env);
  let imageCount = 0;
  const visit = (list) => list.forEach((token) => {
    if (token.type === 'image') {
      imageCount += 1;
      const src = resolveImage(token.attrGet('src'), where, errors, assets);
      if (src) token.attrSet('src', src);
      token.attrSet('loading', 'lazy');
    } else if (token.type === 'text' && token.content.includes('![[')) {
      errors.push(`${where}: Obsidian 위키링크 이미지(![[...]])는 사이트에서 보이지 않습니다. ![설명](../images/${slug}/파일명) 형식으로 바꿔 주세요.`);
    }
    if (token.children) visit(token.children);
  });
  visit(tokens);
  if (errors.length > before) return null;

  const text = plainText(tokens);
  const summary = typeof data.summary === 'string' ? data.summary.trim() : '';
  const excerpt = text.length > EXCERPT_LENGTH ? `${text.slice(0, EXCERPT_LENGTH)}…` : text;
  return {
    slug, title, date, cover, imageCount,
    category: data.category,
    summary: summary || excerpt,
    html: md.renderer.render(tokens, md.options, env),
    url: `${BASE}posts/${slug}/`,
  };
}

// ---------------------------------------------------------------- pages

function loadTemplate(errors, assets) {
  const $ = cheerio.load(fs.readFileSync(TEMPLATE, 'utf8'));
  for (const id of Object.keys(CATEGORIES)) {
    const section = $(`section#${id}`);
    if (!section.length || !section.find('.grid').length || !section.find('.count').length) {
      errors.push(`index.html: 카테고리 섹션 #${id} 의 .grid 또는 .count 를 찾을 수 없습니다`);
    }
  }
  // Prefix local asset paths (posts.css, profile.png, ...) with the base path so
  // they also resolve from /posts/<slug>/ and from a /<repo>/ project site.
  $('[src], link[href], a[href]').each((_, node) => {
    const attr = node.attribs.src !== undefined ? 'src' : 'href';
    const value = node.attribs[attr];
    if (!value || value.startsWith('#') || value.startsWith('/') || EXTERNAL_RE.test(value)) return;
    const file = path.resolve(ROOT, decodeURIComponent(value.split(/[?#]/)[0]));
    if (!existsExactCase(file)) {
      errors.push(`index.html: <${node.name} ${attr}="${value}"> 가 가리키는 파일이 없습니다`);
      return;
    }
    assets.add(file);
    $(node).attr(attr, BASE + value);
  });
  return $.html();
}

function card($, post) {
  const article = $('<article class="card post-card"></article>');
  if (post.cover) article.append($('<img class="post-cover" alt="" loading="lazy">').attr('src', post.cover));
  article.append($('<span class="post-category"></span>').text(CATEGORIES[post.category][0]));
  article.append($('<h3></h3>').text(post.title));
  article.append($('<p class="post-excerpt"></p>').text(post.summary || '사진으로 남긴 기록입니다.'));
  if (post.imageCount) article.append($('<p class="post-meta"></p>').text(`사진 ${post.imageCount}장`));
  const foot = $('<div class="foot"></div>');
  foot.append($('<time class="date"></time>').attr('datetime', post.date).text(dateFormat.format(new Date(post.date))));
  foot.append($('<a class="read-post">자세히 보기 →</a>')
    .attr('href', post.url).attr('aria-label', `${post.title} 자세히 보기`));
  article.append(foot);
  return article;
}

function homePage(template, posts) {
  const $ = cheerio.load(template);
  for (const [id, [, unit]] of Object.entries(CATEGORIES)) {
    const section = $(`section#${id}`);
    const entries = posts.filter((post) => post.category === id);
    section.find('.count').text(`${entries.length} ${unit}`);
    $(`[data-count="${id}"]`).text(String(entries.length));
    if (!entries.length) continue;
    const grid = section.find('.grid');
    grid.find('.empty').remove();
    entries.forEach((post) => grid.append(card($, post)));
  }
  return $.html();
}

function postPage(template, post) {
  const $ = cheerio.load(template);
  const [label] = CATEGORIES[post.category];
  const listUrl = `${BASE}#${post.category}`;
  $('title').text(`${post.title} · Manbok`);
  $('meta[name="description"]').attr('content', post.summary);
  $('meta[property="og:title"]').attr('content', post.title);
  $('meta[property="og:description"]').attr('content', post.summary);
  $('meta[property="og:type"]').attr('content', 'article');
  // In-page anchors in the nav (#about, #ctf, #top, ...) now point back to the home page.
  $('header.nav a[href^="#"]').each((_, a) => {
    const hash = a.attribs.href;
    $(a).attr('href', hash === '#top' ? BASE : BASE + hash);
  });
  const article = $('<article class="post-article"></article>');
  const heading = $('<div class="post-heading"></div>');
  heading.append($('<a class="post-category"></a>').attr('href', listUrl).text(label));
  heading.append($('<a class="post-back">← 목록으로</a>').attr('href', listUrl));
  article.append(heading);
  article.append($('<h1 class="reader-title"></h1>').text(post.title));
  article.append($('<p class="field-hint"></p>').append(
    $('<time></time>').attr('datetime', post.date).text(dateFormat.format(new Date(post.date)))));
  article.append($('<div class="reader-body"></div>').html(post.html));
  $('main').empty().append($('<section class="sec wrap"></section>').append(article));
  return $.html();
}

// ---------------------------------------------------------------- main

function writeFile(target, content) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function main() {
  const errors = [];
  const assets = new Set();
  const template = loadTemplate(errors, assets);

  const files = fs.existsSync(POSTS_DIR)
    ? fs.readdirSync(POSTS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
      .map((entry) => path.join(POSTS_DIR, entry.name))
    : [];
  for (const file of files) {
    if (!file.endsWith('.md')) errors.push(`${rel(file)}: 확장자는 소문자 .md 여야 합니다`);
  }
  const loaded = files.filter((file) => file.endsWith('.md')).map((file) => loadPost(file, errors, assets));
  if (errors.length) fail(errors);

  const drafts = loaded.filter((post) => post.draft);
  const posts = loaded.filter((post) => !post.draft)
    .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  writeFile(path.join(OUT_DIR, 'index.html'), homePage(template, posts));
  posts.forEach((post) => writeFile(path.join(OUT_DIR, 'posts', post.slug, 'index.html'), postPage(template, post)));
  // Only files referenced by published pages are copied, so draft images stay off the site.
  assets.forEach((file) => {
    const target = path.join(OUT_DIR, path.relative(ROOT, file));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(file, target);
  });

  console.log(`빌드 완료 → ${rel(OUT_DIR)}/  (base path: ${BASE})`);
  console.log(`  게시물 ${posts.length}개, 파일 ${assets.size}개 복사${drafts.length ? `, draft 제외 ${drafts.length}개 (${drafts.map((d) => d.slug).join(', ')})` : ''}`);
  posts.forEach((post) => console.log(`  - [${post.category}] ${post.date} ${post.title}  ${post.url}`));
}

main();
