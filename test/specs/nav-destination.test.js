// test/specs/navDestination.test.js

describe('NavDestination Custom Element', () => {
  it('should render correctly with the correct attributes', async () => {
    const navDestination = await $('nav-destination');
    await expect(navDestination).toBeDisplayed();

    const iconAttr = await navDestination.getAttribute('icon');
    const labelAttr = await navDestination.getAttribute('label');

    const shadowRoot = await browser.execute(
      (element) => element.shadowRoot,
      navDestination
    );
    const icon = await browser.execute(
      (shadowRoot) => shadowRoot.querySelector('.icon').textContent,
      shadowRoot
    );
    const label = await browser.execute(
      (shadowRoot) => shadowRoot.querySelector('.label').textContent,
      shadowRoot
    );

    expect(icon).toBe(iconAttr); // Replace 'home' with the actual icon value you set in your test HTML
    expect(label).toBe(labelAttr); // Replace 'Home' with the actual label value you set in your test HTML
  });

  it('should have the correct styles', async () => {
    const navDestination = await $('nav-destination');
    const shadowRoot = await browser.execute(
      (element) => element.shadowRoot,
      navDestination
    );

    const styleContent = await browser.execute(
      (shadowRoot) => shadowRoot.querySelector('style').textContent,
      shadowRoot
    );

    expect(styleContent).toContain('width: 72px');
    expect(styleContent).toContain('height: 72px');
    expect(styleContent).toContain('display: flex');
    expect(styleContent).toContain('flex-direction: column');
    expect(styleContent).toContain('align-items: center');
    expect(styleContent).toContain('justify-content: center');
  });

  it('should handle click events and update history state', async () => {
    const navDestination = await $('nav-destination');
    const href  = await navDestination.getAttribute('href');
    await navDestination.click();

    const url = await browser.getUrl();
    const path =  '/' + new URL(url).pathname.split('/').pop().split('.')[0];
    expect(path).toBe(href);
  });

  it('should apply active class styles', async () => {
    const navDestination = await $('nav-destination');
    await browser.execute(
      (element) => element.classList.add('active'),
      navDestination
    );

    const shadowRoot = await browser.execute(
      (element) => element.shadowRoot,
      navDestination
    );

    const styleContent = await browser.execute(
      (shadowRoot) => shadowRoot.querySelector('style').textContent,
      shadowRoot
    );
    expect(styleContent).toContain('font-weight: bold');
    expect(styleContent).toContain('color: var(--accent-color-hex)');
  });
});
