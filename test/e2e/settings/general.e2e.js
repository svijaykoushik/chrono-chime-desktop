const { browser, expect, $ } = require('@wdio/globals');

describe('General page smoke tests', () => {
  before(async () => {
    const navRail = await $('nav-rail');
    await expect(navRail).toExist();
    const navDestinations = await navRail.$$('nav-destination');

    const destination = await navDestinations.find(async (navDestination) => {
      const href = await navDestination.getAttribute('href');
      return href === '/config';
    });
    await destination.click();
    await browser.waitUntil(
        async () => {
          return $('#config').isDisplayed();
        },
        {
          timeout: 5000,
          timeoutMsg: '#config did not appear within 5 seconds',
        }
      );
  });

  it('should land on general section', async () => {
    const section = await $('#general');
    expect(section).toBeDisplayed();
    const sectionHeading = await section.$('h2');
    expect(sectionHeading).toHaveText('General ⚙️');
  });

  describe('Interval selection tests', () => {
    /**
     * @type {WebdriverIO.Element}
     */
    let intervalSelect;

    /**
     * @type {WebdriverIO.Element}
     */
    let toastNotification;
    before(async () => {
      intervalSelect = await $('#interval');
      toastNotification = await $('#toastNotification');
    });

    it('should have default 1 hour interval', async () => {
      const selectedValue = await intervalSelect.getValue();
      expect(selectedValue).toEqual('1');
    });

    it('should select 2 hour interval', async () => {
      await intervalSelect.selectByAttribute('value', '2');
      toastNotification.waitForStable({
        timeout: 5000,
        timeoutMsg: 'Toast notification did not appear within 5 seconds',
      });
      const selectedValue = await intervalSelect.getValue();
      const notificationText = await toastNotification.getText();
      expect(notificationText).toEqual('✅ Settings saved.');
      expect(selectedValue).toEqual('2');
    });

    it('should select 3 hour interval', async () => {
      await intervalSelect.selectByAttribute('value', '3');
      toastNotification.waitForStable({
        timeout: 5000,
        timeoutMsg: 'Toast notification did not appear within 5 seconds',
      });
      const selectedValue = await intervalSelect.getValue();
      const notificationText = await toastNotification.getText();
      expect(notificationText).toEqual('✅ Settings saved.');
      expect(selectedValue).toEqual('3');
    });

    it('should select 1 hour interval', async () => {
      await intervalSelect.selectByAttribute('value', '1');
      toastNotification.waitForStable({
        timeout: 5000,
        timeoutMsg: 'Toast notification did not appear within 5 seconds',
      });
      const selectedValue = await intervalSelect.getValue();
      const notificationText = await toastNotification.getText();
      expect(notificationText).toEqual('✅ Settings saved.');
      expect(selectedValue).toEqual('1');
    });
  });

  describe('Allow notification option tests', () => {
    /**
     * @type {WebdriverIO.Element}
     */
    let allowNotificationCheckbox;

    /**
     * @type {WebdriverIO.Element}
     */
    let span;

    before(async () => {
      allowNotificationCheckbox = await $('#allowNotificationCheckbox');
      span = await allowNotificationCheckbox.nextElement();
    });

    it('should be in default state of selected', async () => {
      const value = await allowNotificationCheckbox.isSelected();
      expect(value).toEqual(true);
    });

    it('should change to deselected', async () => {
      await span.click();
      await span.waitForStable({
        timeout: 5000,
        timeoutMsg: 'Failed to toggle checkbox in 5 seconds',
      });
      const value = await allowNotificationCheckbox.isSelected();
      expect(value).toEqual(false);
    });

    it('should change to selected', async () => {
      await span.click();
      await span.waitForStable({
        timeout: 5000,
        timeoutMsg: 'Failed to toggle checkbox in 5 seconds',
      });
      const value = await allowNotificationCheckbox.isSelected();
      expect(value).toEqual(true);
    });
  });

  describe('Autolaunch option tests', () => {
    /**
     * @type {WebdriverIO.Element}
     */
    let autoLaunchCheckbox;

    /**
     * @type {WebdriverIO.Element}
     */
    let span;

    before(async () => {
      autoLaunchCheckbox = await $('#autoLaunchCheckbox');
      span = await autoLaunchCheckbox.nextElement();
    });

    it('should be in default state of deselected', async () => {
      const value = await autoLaunchCheckbox.isSelected();
      expect(value).toEqual(false);
    });

    it('should change to selected', async () => {
      await span.click();
      await span.waitForStable({
        timeout: 5000,
        timeoutMsg: 'Failed to toggle checkbox in 5 seconds',
      });
      const value = await autoLaunchCheckbox.isSelected();
      expect(value).toEqual(true);
    });

    it('should change to deselected', async () => {
      await span.click();
      await span.waitForStable({
        timeout: 5000,
        timeoutMsg: 'Failed to toggle checkbox in 5 seconds',
      });
      const value = await autoLaunchCheckbox.isSelected();
      expect(value).toEqual(false);
    });
  });
});
