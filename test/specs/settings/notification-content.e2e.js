const { browser, expect, $, $$ } = require('@wdio/globals');
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
        // Locate and expand the collapsed sidebar
        const toggleDrawerButton = await $('#toggleDrawerButton');
        await toggleDrawerButton.click();
        const appDrawer = await $('#appDrawer');
        await appDrawer.waitForStable({
            timeout: 5000,
            timeoutMsg: 'appDrawer did not expand within 5 seconds',
        });
        const appDrawerItems = await $$('#appDrawer .drawer-menu li');
        const settingsLink = await appDrawerItems[0].$('a');
        await settingsLink.click();
        const settings = await $('#settings');
        browser.waitUntil(
            () => {
                return settings.isDisplayed();
            },
            {
                timeout: 5000,
                timeoutMsg: 'settings did appear within 5 seconds',
            }
        );

        // Close the app drawer
        await toggleDrawerButton.click();

        await appDrawer.waitForStable({
            timeout: 5000,
            timeoutMsg: 'appDrawer did not close within 5 seconds',
        });

        const sectionNavItem = await $('#contentTabLink');
        await sectionNavItem.click();

        section = await $('#content');
        section.waitForExist({
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