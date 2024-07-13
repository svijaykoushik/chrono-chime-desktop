const { browser, expect, $ } = require('@wdio/globals');

async function testNavigation(
  navDestinations,
  destinationHref,
  destinationId,
  destinationText
) {
  navDestinations = await $$('nav-destination');

  const destination = await navDestinations.find(async (navDestination) => {
    const href = await navDestination.getAttribute('href');
    return href === destinationHref;
  });

  await expect(destination).toBeClickable();
  await destination.click();
  await browser.waitUntil(
    async () => {
      return $(destinationId).isDisplayed();
    },
    {
      timeout: 5000,
      timeoutMsg: `${destinationText} did not appear within 5 seconds`,
    }
  );

  await expect($(destinationId)).toBeDisplayed();
  await expect($(`${destinationId} h1`)).toHaveText(destinationText);

  // Verify other sections are not displayed
  const otherDestinations = [
    '#home',
    '#tasks',
    '#alerts',
    '#config',
    '#credits',
    '#info',
  ].filter((id) => id !== destinationId);
  for (const other of otherDestinations) {
    await expect($(other)).not.toBeDisplayed();
  }
}

describe('Navigation testing', () => {
  let navRail;
  let navDestinations;
  before(async () => {
    navRail = await $('nav-rail');
    await expect(navRail).toExist();
    navDestinations = await navRail.$$('nav-destination');
  });
  it('should render NavRail with NavDestinations correctly', async () => {
    await expect(navRail).toBeDisplayed();

    expect(navDestinations).toHaveLength(6);

    for (let i = 0; i < navDestinations.length; i++) {
      await expect(navDestinations[i]).toBeDisplayed();
    }
  });

  it('should have the correct attributes for each NavDestination', async () => {
    const navDestinations = await $$('nav-destination');

    const expectedAttributes = [
      { icon: '🏠', label: 'Home', href: '/', class: 'active' },
      { icon: '📋', label: 'Tasks', href: '/tasks', class: '' },
      { icon: '✅', label: 'Alerts', href: '/alerts', class: '' },
      { icon: '🛠️', label: 'Config', href: '/config', class: '' },
      { icon: '👍', label: 'Credits', href: '/credits', class: '' },
      { icon: 'ℹ️', label: 'Info', href: '/info', class: '' },
    ];

    for (let i = 0; i < navDestinations.length; i++) {
      const navDestination = navDestinations[i];
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
      const href = await browser.execute(
        (element) => element.getAttribute('href'),
        navDestination
      );
      const classList = await browser.execute(
        (element) => element.classList.contains('active'),
        navDestination
      );

      expect(icon).toBe(expectedAttributes[i].icon);
      expect(label).toBe(expectedAttributes[i].label);
      expect(href).toBe(expectedAttributes[i].href);
      expect(classList).toBe(expectedAttributes[i].class === 'active');
    }
  });

  it('should navigate to Home', async () => {
    await testNavigation(
      navDestinations,
      '/',
      '#main',
      'ChronoChime - Time Keeper Extraordinaire'
    );
  });

  it('should navigate to Tasks', async () => {
    await testNavigation(navDestinations, '/tasks', '#tasks', 'Tasks');
  });

  it('should navigate to Alerts', async () => {
    await testNavigation(navDestinations, '/alerts', '#alerts', 'Alerts');
  });

  it('should navigate to Config', async () => {
    await testNavigation(navDestinations, '/config', '#config', 'Config');
  });

  it('should navigate to Credits', async () => {
    await testNavigation(navDestinations, '/credits', '#credits', 'Credits');
  });

  it('should navigate to Info', async () => {
    await testNavigation(navDestinations, '/info', '#info', 'Info');
  });
});
