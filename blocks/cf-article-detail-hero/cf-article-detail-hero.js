import { getMetadata } from '../../scripts/aem.js';
import { isAuthorEnvironment } from '../../scripts/scripts.js';
import { getHostname } from '../../scripts/utils.js';

const GRAPHQL_QUERY = '/graphql/execute.json/ref-demo-eds/ArticleByPath';

/**
 * CF Article Detail Hero — renders a full-width hero from an Article Content Fragment.
 * Fields used: image, title, description, tags, subTag, date.
 *
 * Block rows:
 *   1 – CF path  (link or plain text)
 *   2 – Variation (optional, defaults to "master")
 *
 * @param {Element} block
 */
export default async function decorate(block) {
  const hostnameFromPlaceholders = await getHostname();
  const hostname = hostnameFromPlaceholders || getMetadata('hostname');
  const aemauthorurl = getMetadata('authorurl') || '';
  const aempublishurl = hostname?.replace('author', 'publish')?.replace(/\/$/, '');

  const pathCell = block.querySelector(':scope div:nth-child(1) > div');
  const contentPath = pathCell?.querySelector('a')?.textContent?.trim()
    || pathCell?.textContent?.trim();

  const variationname = block.querySelector(':scope div:nth-child(2) > div')
    ?.textContent?.trim()?.toLowerCase()?.replace(' ', '_') || 'master';

  block.innerHTML = '';

  if (!contentPath) return;

  const isAuthor = isAuthorEnvironment();
  const url = isAuthor
    ? `${aemauthorurl}${GRAPHQL_QUERY};path=${contentPath};variation=${variationname};ts=${Date.now()}`
    : `${aempublishurl}${GRAPHQL_QUERY};path=${contentPath};variation=${variationname}`;

  try {
    const response = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
    if (!response.ok) {
      console.error(`CF Article Detail Hero: fetch failed (${response.status})`);
      return;
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error('CF Article Detail Hero: JSON parse error', e);
      return;
    }

    const article = data?.data?.articleByPath?.item;
    if (!article) {
      console.error('CF Article Detail Hero: no item in response', data);
      return;
    }

    const imgUrl = isAuthor
      ? article.image?._authorUrl
      : article.image?._publishUrl;

    const itemId = `urn:aemconnection:${contentPath}/jcr:content/data/${variationname}`;

    // Build meta row: tags + date
    const metaParts = [];
    const tags = Array.isArray(article.tags) ? article.tags : [];
    if (tags.length) {
      metaParts.push(tags.map((t) => `<span class="cf-adh-tag">${t}</span>`).join(''));
    }
    if (article.subTag) {
      metaParts.push(`<span class="cf-adh-subtag">${article.subTag}</span>`);
    }
    if ((tags.length || article.subTag) && article.date) {
      metaParts.push('<span class="cf-adh-dot" aria-hidden="true">·</span>');
    }
    if (article.date) {
      metaParts.push(`<span class="cf-adh-date"
        data-aue-prop="date" data-aue-type="text" data-aue-label="Date"
      >${article.date}</span>`);
    }

    block.setAttribute('data-aue-type', 'container');
    block.innerHTML = `
      <div class="cf-adh-inner"
        data-aue-resource="${itemId}"
        data-aue-type="reference"
        data-aue-label="${variationname || 'Article'}"
        data-aue-filter="cf-article-detail-hero">

        ${imgUrl ? `<img
          class="cf-adh-image"
          src="${imgUrl}"
          alt="${article.title || ''}"
          data-aue-prop="image"
          data-aue-type="media"
          data-aue-label="Image"
        />` : '<div class="cf-adh-image-placeholder"></div>'}

        <div class="cf-adh-overlay" aria-hidden="true"></div>

        <div class="cf-adh-content">
          <a class="cf-adh-back" href="javascript:history.back()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
              stroke-linejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Toutes les actualités
          </a>

          ${metaParts.length ? `<div class="cf-adh-meta">${metaParts.join('')}</div>` : ''}

          <h1 class="cf-adh-title"
            data-aue-prop="title"
            data-aue-type="text"
            data-aue-label="Titre">
            ${article.title || ''}
          </h1>

          ${article.description?.plaintext ? `
          <p class="cf-adh-description"
            data-aue-prop="description"
            data-aue-type="text"
            data-aue-label="Description">
            ${article.description.plaintext}
          </p>` : ''}
        </div>
      </div>
    `;
  } catch (error) {
    console.error('CF Article Detail Hero: unexpected error', error);
  }
}
