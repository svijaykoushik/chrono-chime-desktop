const { browser, expect, $ } = require('@wdio/globals');
const { faker } = require('@faker-js/faker');

describe('Notification content section tests', () => {
  /**
   * @type {WebdriverIO.Element}
   */
  let toastNotification;
  /**
   * @type {WebdriverIO.Element}
   */
  let section;
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

    const sectionNavItem = await $('#contentTabLink');
    await sectionNavItem.click();

    section = await $('#content');
    await section.waitForExist({
      timeout: 5000,
      timeoutMsg:
        'Notification Content section did not appear within 5 seconds',
    });

    toastNotification = await $('#toastNotification');
  });

  it('should land on Notification Content section', async () => {
    expect(section).toBeDisplayed();
    const sectionHeading = await section.$('h2');
    expect(sectionHeading).toHaveText('Notification Content ✉️');
  });

  it('should update custom title', async () => {
    const notificationTitle = await $('#notificationTitle');
    const val = faker.lorem.sentence();
    await notificationTitle.setValue(val);
    await section.click();
    await expect(await notificationTitle.getValue()).toEqual(val);
    await expect(toastNotification).toHaveText(
      expect.stringMatching('✅ Settings saved.')
    );
  });

  it('should update custom message', async () => {
    const notificationContent = await $('#notificationContent');
    const val = faker.lorem.paragraph();
    await notificationContent.setValue(val);
    await section.click();
    await expect(await notificationContent.getValue()).toEqual(val);
    await expect(toastNotification).toHaveText(
      expect.stringMatching('✅ Settings saved.')
    );
  });
});
