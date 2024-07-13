// test/specs/navRail.test.js

describe('NavRail Custom Element', () => {

  it('should render correctly', async () => {
    const navRail = await $('nav-rail');
    await expect(navRail).toBeDisplayed();
  });

  it('should have the correct styles', async () => {
    const navRail = await $('nav-rail');
    const shadowRoot = await browser.execute(
      (element) => element.shadowRoot,
      navRail
    );

    const styleContent = await browser.execute(
      (shadowRoot) => shadowRoot.querySelector('style').textContent,
      shadowRoot
    );

    expect(styleContent).toContain('display: flex');
    expect(styleContent).toContain('flex-direction: column');
    expect(styleContent).toContain('align-items: center');
    expect(styleContent).toContain('background-color: rgba(255, 255, 255, 1)');
    expect(styleContent).toContain('width: 72px');
    expect(styleContent).toContain('height: 100vh');
  });

  it('should have a slot', async () => {
    const navRail = await $('nav-rail');
    const shadowRoot = await browser.execute(
      (element) => element.shadowRoot,
      navRail
    );

    const slot = await browser.execute(
      (shadowRoot) => shadowRoot.querySelector('slot'),
      shadowRoot
    );
    expect(slot).not.toBeNull();
  });
});
