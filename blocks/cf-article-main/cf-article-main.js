import { getMetadata } from '../../scripts/aem.js';
import { isAuthorEnvironment } from '../../scripts/scripts.js';
import { getHostname } from '../../scripts/utils.js';

const GRAPHQL_QUERY = '/graphql/execute.json/ref-demo-eds/ArticleByPath';

/**
 * CF Article Main
 * Block rows:
 *   1 – CF path
 *   2 – Variation (default: master)
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
      console.error(`CF Article Main: fetch failed (${response.status})`);
      return;
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error('CF Article Main: JSON parse error', e);
      return;
    }

    const article = data?.data?.articleByPath?.item;
    if (!article) {
      console.error('CF Article Main: no item in response', data);
      return;
    }

    // eslint-disable-next-line no-console
    console.log('[CF Article Main] article fields:', JSON.stringify(Object.keys(article)), article);

    const itemId = `urn:aemconnection:${contentPath}/jcr:content/data/${variationname}`;
    const bodyHtml = article.body?.html || article.content?.html || '';
    const authorName = article.author || '';

    block.setAttribute('data-aue-type', 'container');
    block.innerHTML = `
      <div class="cf-am-inner"
        data-aue-resource="${itemId}"
        data-aue-type="reference"
        data-aue-label="${variationname || 'Article'}"
        data-aue-filter="cf-article-main">

        <div class="cf-am-content">
          ${authorName ? `
          <p class="cf-am-author"
            data-aue-prop="author"
            data-aue-type="text"
            data-aue-label="Auteur">
            ${authorName}
          </p>` : ''}

          ${bodyHtml ? `
          <div class="cf-am-body"
            data-aue-prop="body"
            data-aue-type="richtext"
            data-aue-label="Corps de l'article">
            ${bodyHtml}
          </div>` : ''}
        </div>
      </div>
    `;
  } catch (error) {
    console.error('CF Article Main: unexpected error', error);
  }
}
