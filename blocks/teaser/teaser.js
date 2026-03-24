import {
  div, a, span, img, h2,
} from '../../scripts/dom-helpers.js';
import { readBlockConfig } from '../../scripts/aem.js';

function createBackgroundImage(properties) {
  const imgSrc = properties.imageref || '';
  const imgAlt = properties.alt || '';
  const imgBackground = div({ class: 'background-image' },
    img({ class: 'teaser-background', src: imgSrc, alt: imgAlt }),
  );
  if (!imgSrc) imgBackground.classList.add('inactive');
  return imgBackground;
}

export default function decorate(block) {
  const rteElementTag = Array.from(block.querySelectorAll('p'))
    .find((el) => el.textContent.trim() === 'title');
  const rteElement = rteElementTag?.parentElement?.nextElementSibling;
  const rteContent = rteElement?.querySelector('p')?.innerHTML;

  const descElementTag = Array.from(block.querySelectorAll('p'))
    .find((el) => el.textContent.trim() === 'description');
  const descElement = descElementTag?.parentElement?.nextElementSibling;
  const descContent = descElement?.innerHTML;
  
  const properties = readBlockConfig(block);

  const buttonContainerClass = properties.ctastyle ? `cta-${properties.ctastyle}` : 'button-container';
  const buttonText = properties.buttontext || 'Button';
  const buttonLink = properties['btn-link'] || '';

  const boxPosition = properties.boxposition || 'left';
  const boxStyle = properties.boxstyle || 'dark-blue';

  const teaser = div({ class: 'teaser-container' },
    createBackgroundImage(properties),
    div({ class: `teaser-content-wrapper teaser-content-wrapper--${boxPosition}` },
      div({ class: `teaser-box teaser-box--${boxStyle}` },
        h2({ class: 'teaser-title' }),
        div({ class: 'teaser-description' }),
        div({ class: buttonContainerClass },
          a({ id: 'button', href: buttonLink, class: 'button' },
            span({ class: 'button-text' }, buttonText),
          ),
        ),
      ),
    ),
  );

  teaser.querySelector('.teaser-title').innerHTML = properties.title ? rteContent : 'Title';
  if (descContent) teaser.querySelector('.teaser-description').innerHTML = descContent;
  block.innerHTML = '';
  block.appendChild(teaser);
}
