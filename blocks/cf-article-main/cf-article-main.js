import { getMetadata } from '../../scripts/aem.js';
import { isAuthorEnvironment } from '../../scripts/scripts.js';
import { getHostname } from '../../scripts/utils.js';

const GRAPHQL_QUERY = '/graphql/execute.json/ref-demo-eds/ArticleByPath';
const WRAPPER_SERVICE_URL = 'https://3635370-refdemoapigateway-stage.adobeioruntime.net/api/v1/web/ref-demo-api-gateway/fetch-cf';

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
  const aempublishurl = aemauthorurl
    ? aemauthorurl.replace('author', 'publish').replace(/\/$/, '')
    : hostname?.replace('author', 'publish')?.replace(/\/$/, '');

  const pathCell = block.querySelector(':scope div:nth-child(1) > div');
  const contentPath = pathCell?.querySelector('a')?.textContent?.trim()
    || pathCell?.textContent?.trim();

  const variationname = block.querySelector(':scope div:nth-child(2) > div')
    ?.textContent?.trim()?.toLowerCase()?.replace(' ', '_') || 'master';

  block.innerHTML = `
    <div class="cf-am-skeleton">
      <div class="cf-am-skeleton-line cf-am-skeleton-line--title"></div>
      <div class="cf-am-skeleton-line cf-am-skeleton-line--full"></div>
      <div class="cf-am-skeleton-line cf-am-skeleton-line--full"></div>
      <div class="cf-am-skeleton-line cf-am-skeleton-line--medium"></div>
      <div class="cf-am-skeleton-line cf-am-skeleton-line--full"></div>
      <div class="cf-am-skeleton-line cf-am-skeleton-line--full"></div>
      <div class="cf-am-skeleton-line cf-am-skeleton-line--short"></div>
    </div>`;
  if (!contentPath) {
    block.innerHTML = '<div class="cf-block-empty">Configure your content for this block</div>';
    return;
  }

  const isAuthor = isAuthorEnvironment();
  const requestConfig = isAuthor
    ? {
        url: `${aemauthorurl}${GRAPHQL_QUERY};path=${contentPath};variation=${variationname};ts=${Date.now()}`,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    : {
        url: WRAPPER_SERVICE_URL,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          graphQLPath: `${aempublishurl}${GRAPHQL_QUERY}`,
          cfPath: contentPath,
          variation: variationname,
        }),
      };

  try {
    const response = await fetch(requestConfig.url, {
      method: requestConfig.method,
      headers: requestConfig.headers,
      ...(requestConfig.body && { body: requestConfig.body }),
    });
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

    const itemId = `urn:aemconnection:${contentPath}/jcr:content/data/${variationname}`;
    const bodyHtml = article.main?.html
      || (article.main?.plaintext
        ? article.main.plaintext.split(/\n\n+/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')
        : '');
    const authorName = article.author || '';

    block.setAttribute('data-aue-type', 'container');
    block.innerHTML = `
      <div class="cf-am-inner"
        data-aue-resource="${itemId}"
        data-aue-type="reference"
        data-aue-label="${variationname || 'Article'}"
        data-aue-filter="cf-article-main">
        <div class="cf-am-content">
          ${authorName ? `<p class="cf-am-author">${authorName}</p>` : ''}
          ${bodyHtml ? `<div class="cf-am-body">${bodyHtml}</div>` : ''}
        </div>
      </div>
    `;
  } catch (error) {
    console.error('CF Article Main: unexpected error', error);
  }
}
