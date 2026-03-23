import { getMetadata } from '../../scripts/aem.js';
import { isAuthorEnvironment } from '../../scripts/scripts.js';
import { getHostname } from '../../scripts/utils.js';

const GRAPHQL_QUERY = '/graphql/execute.json/ref-demo-eds/FetchArticleByPath';

function formatDateFr(raw) {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function cleanTag(t) {
  return String(t).replace(/^[^:]+:/i, '').trim();
}

function getArticleSlug(path) {
  return path?.split('/').filter(Boolean).pop() || '';
}

function buildArticleCard(article, baseUrl, isAuthor) {
  const imgUrl = isAuthor ? article.image?._authorUrl : article.image?._publishUrl;
  const tags = Array.isArray(article.tags) ? article.tags : [];
  const subTags = Array.isArray(article.subTag)
    ? article.subTag
    : (article.subTag ? [article.subTag] : []);
  const allTags = [...tags, ...subTags];
  const formattedDate = formatDateFr(article.date);
  const slug = getArticleSlug(article._path);
  const href = baseUrl ? `${baseUrl.replace(/\/$/, '')}/${slug}` : '#';

  const tagsHtml = allTags.length
    ? `<div class="al-card-tags">${allTags.map((t) => `<span class="al-card-tag">${cleanTag(t)}</span>`).join('')}</div>`
    : '';

  const dateHtml = formattedDate
    ? `<span class="al-card-date">${formattedDate}</span>`
    : '';

  const metaHtml = (tagsHtml || dateHtml) ? `
    <div class="al-card-meta">
      ${tagsHtml}
      ${tagsHtml && dateHtml ? '<span class="al-card-dot" aria-hidden="true">·</span>' : ''}
      ${dateHtml}
    </div>` : '';

  return `
    <article class="al-card">
      <a class="al-card-link" href="${href}" aria-label="${article.title || ''}">
        <div class="al-card-image-wrapper">
          ${imgUrl
    ? `<img class="al-card-image" src="${imgUrl}" alt="${article.title || ''}" loading="lazy" />`
    : '<div class="al-card-image-placeholder"></div>'}
        </div>
        <div class="al-card-body">
          ${metaHtml}
          <h3 class="al-card-title">${article.title || ''}</h3>
          ${article.description?.plaintext
    ? `<p class="al-card-description">${article.description.plaintext}</p>`
    : ''}
          <span class="al-card-cta">Lire l'article</span>
        </div>
      </a>
    </article>`;
}

/**
 * Article List
 * Block rows:
 *   1 – Folder path (e.g. /content/dam/ref-demo-eds/articles)
 *   2 – Base URL for article detail pages (e.g. /fr/actualites)
 *   3 – Max articles to display (default: 9)
 */
export default async function decorate(block) {
  const hostnameFromPlaceholders = await getHostname();
  const hostname = hostnameFromPlaceholders || getMetadata('hostname');
  const aemauthorurl = getMetadata('authorurl') || '';
  const aempublishurl = aemauthorurl
    ? aemauthorurl.replace('author', 'publish').replace(/\/$/, '')
    : hostname?.replace('author', 'publish')?.replace(/\/$/, '');

  const folderPathCell = block.querySelector(':scope div:nth-child(1) > div');
  const folderPath = folderPathCell?.querySelector('a')?.textContent?.trim()
    || folderPathCell?.textContent?.trim() || '';

  const baseUrl = block.querySelector(':scope div:nth-child(2) > div')
    ?.querySelector('a')?.getAttribute('href')
    || block.querySelector(':scope div:nth-child(2) > div')?.textContent?.trim()
    || '';

  const limitRaw = block.querySelector(':scope div:nth-child(3) > div')?.textContent?.trim();
  const limit = limitRaw ? parseInt(limitRaw, 10) : 9;

  block.innerHTML = '';
  if (!folderPath) return;

  const isAuthor = isAuthorEnvironment();
  const base = isAuthor ? aemauthorurl : aempublishurl;
  const ts = isAuthor ? `;ts=${Date.now()}` : '';
  const url = `${base}${GRAPHQL_QUERY};folderPath=${folderPath}${ts}`;

  try {
    const response = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
    if (!response.ok) {
      console.error(`Article List: fetch failed (${response.status})`);
      return;
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error('Article List: JSON parse error', e);
      return;
    }

    // Handle both possible response shapes
    const items = data?.data?.articleList?.items
      || data?.data?.articleByPathList?.items
      || [];

    if (!items.length) {
      console.error('Article List: no items in response', data);
      return;
    }

    const visibleItems = items.slice(0, limit);

    block.innerHTML = `
      <div class="al-grid">
        ${visibleItems.map((article) => buildArticleCard(article, baseUrl, isAuthor)).join('')}
      </div>
    `;
  } catch (error) {
    console.error('Article List: unexpected error', error);
  }
}
