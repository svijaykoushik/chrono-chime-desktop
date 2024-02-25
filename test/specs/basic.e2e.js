const { browser, expect, $, $$ } = require('@wdio/globals');
describe('Basic tests', () => {
  describe('Spawn tests', () => {
    it('should check app title', async () => {
      const expectedTitle = 'ChronoChime - Hourly Notification';
      const receivedTitle = await browser.getTitle();
      expect(receivedTitle).toEqual(expectedTitle);
    });
    it('should find main screen', async () => {
      const mainScreen = await $('#main');
      expect(mainScreen).toBeDisplayed();
    });
    it('should check main screen heading', async () => {
      const heading = await $('#main h1');
      const expectedTitle = 'ChronoChime - Hourly Notification PWA';
      expect(expectedTitle).toEqual(await heading.getText());
    });
    it('should find countdown timer', async () => {
      const countdownTimer = await $('#main #countdownTimer');
      expect(countdownTimer).toBeDisplayed();
    });
  });

  describe('Navigation testing', () => {
    it('should open app drawer', async () => {
      // Locate and expand the collapsed sidebar
      const toggleDrawerButton = await $('#toggleDrawerButton');
      await toggleDrawerButton.click();
      browser.waitUntil(
        () => {
          return $('#appDrawer').isDisplayed();
        },
        {
          timeout: 5000,
          timeoutMsg: 'appDrawer did not expand within 5 seconds',
        }
      );

      await expect($('#appDrawer')).toBeDisplayed();
    });

    it('should navigate to settings', async () => {
      // Locate and expand the collapsed sidebar
      const toggleDrawerButton = await $('#toggleDrawerButton');
      await toggleDrawerButton.click();
      browser.waitUntil(
        () => {
          return $('#appDrawer').isDisplayed();
        },
        {
          timeout: 5000,
          timeoutMsg: 'appDrawer did not expand within 5 seconds',
        }
      );
      const appDrawerItems = await $$('#appDrawer .drawer-menu li');
      const settings = await appDrawerItems[0].$('a');
      await settings.click();
      browser.waitUntil(
        () => {
          return $('#settings').isDisplayed();
        },
        {
          timeout: 5000,
          timeoutMsg: 'settings did appear within 5 seconds',
        }
      );
      expect(browser).toHaveUrl('/settings');
      expect($('#settings')).toBeDisplayed();
      expect($('#settings h1')).toHaveText('Settings');
    });

    it('should navigate to attributions', async () => {
      // Locate and expand the collapsed sidebar
      const toggleDrawerButton = await $('#toggleDrawerButton');
      await toggleDrawerButton.click();
      browser.waitUntil(
        () => {
          return $('#appDrawer').isDisplayed();
        },
        {
          timeout: 5000,
          timeoutMsg: 'appDrawer did not expand within 5 seconds',
        }
      );
      const appDrawerItems = await $$('#appDrawer .drawer-menu li');
      const attributions = await appDrawerItems[1].$('a');
      await attributions.click();
      browser.waitUntil(
        () => {
          return $('#attributions').isDisplayed();
        },
        {
          timeout: 5000,
          timeoutMsg: 'attributions did appear within 5 seconds',
        }
      );
      expect(browser).toHaveUrl('/attributions');
      expect($('#attributions')).toBeDisplayed();
      expect($('#attributions h1')).toHaveText('Attributions');
    });

    it('should navigate to about', async () => {
      // Locate and expand the collapsed sidebar
      const toggleDrawerButton = await $('#toggleDrawerButton');
      await toggleDrawerButton.click();
      browser.waitUntil(
        () => {
          return $('#appDrawer').isDisplayed();
        },
        {
          timeout: 5000,
          timeoutMsg: 'appDrawer did not expand within 5 seconds',
        }
      );
      const appDrawerItems = await $$('#appDrawer .drawer-menu li');
      const attributions = await appDrawerItems[1].$('a');
      await attributions.click();
      browser.waitUntil(
        () => {
          return $('#about').isDisplayed();
        },
        {
          timeout: 5000,
          timeoutMsg: 'about did appear within 5 seconds',
        }
      );
      expect(browser).toHaveUrl('/about');
      expect($('#about')).toBeDisplayed();
      expect($('#about h1')).toHaveText('About');
    });
  });
});
