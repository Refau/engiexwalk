import { getMetadata } from '../../scripts/aem.js';
import { isAuthorEnvironment } from '../../scripts/scripts.js';
import { getHostname } from '../../scripts/utils.js';

const GRAPHQL_QUERY = '/graphql/execute.json/ref-demo-eds/ArticleByPath';

function formatDateFr(raw) {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * CF Article Detail Hero
 * Block rows:
 *   1 – CF path
 *   2 – Variation (default: master)
 *   3 – Back button label (default: "Toutes les actualités")
 *   4 – Back button link (default: history.back())
 */
export default async function decorate(block) {
  const hostnameFromPlaceholders = await getHostname();
  const hostname = hostnameFromPlaceholders || getMetadata('hostname');
  const aemauthorurl = getMetadata('authorurl') || '';
  const aempublishurl = aemauthorurl
    ? aemauthorurl.replace('author', 'publish').replace(/\/$/, '')
    : hostname?.replace('author', 'publish')?.replace(/\/$/, '');

  const pathCell = block.querySelector(':scope div:nth-child(1) > div');
  const contentPath = pathCell?.querySelector('a')?.textContent?.trim()
    || pathCell?.textContent?.trim();

  const variationname = block.querySelector(':scope div:nth-child(2) > div')
    ?.textContent?.trim()?.toLowerCase()?.replace(' ', '_') || 'master';

  const backLabel = block.querySelector(':scope div:nth-child(3) > div')
    ?.textContent?.trim() || 'Toutes les actualités';

  const backLinkCell = block.querySelector(':scope div:nth-child(4) > div');
  const backHref = backLinkCell?.querySelector('a')?.getAttribute('href')
    || backLinkCell?.textContent?.trim()
    || 'javascript:history.back()';

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

    const imgUrl = isAuthor ? article.image?._authorUrl : article.image?._publishUrl;
    const itemId = `urn:aemconnection:${contentPath}/jcr:content/data/${variationname}`;

    // Tags as pill badges
    const cleanTag = (t) => String(t).replace(/^[^:]+:/i, '').trim().toUpperCase();
    const tags = Array.isArray(article.tags) ? article.tags : [];
    const subTags = Array.isArray(article.subTag) ? article.subTag : (article.subTag ? [article.subTag] : []);
    const tagBadges = [
      ...tags.map((t) => `<span class="cf-adh-tag">${cleanTag(t)}</span>`),
      ...subTags.map((t) => `<span class="cf-adh-tag">${cleanTag(t)}</span>`),
    ].join('');

    // Date formatted in French
    const formattedDate = formatDateFr(article.date);

    const metaHtml = (tagBadges || formattedDate) ? `
      <div class="cf-adh-meta">
        ${tagBadges ? `<span class="cf-adh-tags">${tagBadges}</span>` : ''}
        ${tagBadges && formattedDate ? '<span class="cf-adh-dot" aria-hidden="true">·</span>' : ''}
        ${formattedDate ? `<span class="cf-adh-date"
          data-aue-prop="date" data-aue-type="text" data-aue-label="Date"
        >${formattedDate}</span>` : ''}
      </div>` : '';

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
          <a class="cf-adh-back" href="${backHref}"
            data-aue-prop="backLabel" data-aue-type="text" data-aue-label="Bouton retour">
            ${backLabel}
          </a>

          ${metaHtml}

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
