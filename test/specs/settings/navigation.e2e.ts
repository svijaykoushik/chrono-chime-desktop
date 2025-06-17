const { browser, expect, $, $$ } = require('@wdio/globals');

describe('Settings page navigation tests', () => {
    beforeEach(async () => {
        // Locate and expand the collapsed sidebar
        const toggleDrawerButton = await $('#toggleDrawerButton');
        await toggleDrawerButton.click();
        const appDrawer = await $('#appDrawer');
        await appDrawer.waitForStable({
            timeout: 5000,
            timeoutMsg: 'appDrawer did not expand within 5 seconds',
        });
        const appDrawerItems = await $$('#appDrawer .drawer-menu li');
        const settingsLink = await appDrawerItems[1].$('a');
        await settingsLink.click();
        const settings = await $('#settings');
        await browser.waitUntil(
            () => {
                return settings.isDisplayed();
            },
            {
                timeout: 5000,
                timeoutMsg: 'settings did appear within 5 seconds',
            }
        );
    });
    afterEach(async () => {
        const toggleDrawerButton = await $('#toggleDrawerButton');
        // Close the app drawer
        await toggleDrawerButton.click();
        const appDrawer = await $('#appDrawer');
        await appDrawer.waitForStable({
            timeout: 5000,
            timeoutMsg: 'appDrawer did not close within 5 seconds',
        });
    });
    it('should land on general section', async () => {
        const section = await $('#general');
        await expect(section).toBeDisplayed();
        const sectionHeading = await section.$('h2');
        await expect(sectionHeading).toHaveText('General ⚙️');
        await expect($('#sound')).not.toBeDisplayed();
        await expect($('#content')).not.toBeDisplayed();
        await expect($('#reset')).not.toBeDisplayed();
    });

    it('should navigate to Notification sound section', async () => {
        const sectionNavItem = await $('#soundTabLink');
        await sectionNavItem.click();

        const section = await $('#sound');
        section.waitForExist({
            timeout: 5000,
            timeoutMsg:
                'Notification Sound section did not appear within 5 seconds',
        });
        await expect(section).toBeDisplayed();
        const sectionHeading = await section.$('h2');
        await expect(sectionHeading).toHaveText('🔊 Notification Sound');
        await expect($('#general')).not.toBeDisplayed();
        await expect($('#content')).not.toBeDisplayed();
        await expect($('#reset')).not.toBeDisplayed();
    });

    it('should navigate to Notification content section', async () => {
        const sectionNavItem = await $('#contentTabLink');
        await sectionNavItem.click();

        const section = await $('#content');
        section.waitForExist({
            timeout: 5000,
            timeoutMsg:
                'Notification content section did not appear within 5 seconds',
        });
        await expect(section).toBeDisplayed();
        const sectionHeading = await section.$('h2');
        await expect(sectionHeading).toHaveText('Notification Content ✉️');
        await expect($('#sound')).not.toBeDisplayed();
        await expect($('#general')).not.toBeDisplayed();
        await expect($('#reset')).not.toBeDisplayed();
    });

    it('should navigate to Reset section', async () => {
        const sectionNavItem = await $('#resetTabLink');
        await sectionNavItem.click();

        const section = await $('#reset');
        await section.waitForExist({
            timeout: 5000,
            timeoutMsg: 'Reset section did not appear within 5 seconds',
        });
        await expect(section).toBeDisplayed();
        await expect($('#sound')).not.toBeDisplayed();
        await expect($('#content')).not.toBeDisplayed();
        await expect($('#general')).not.toBeDisplayed();
    });

    it('should navigate back to general section', async () => {
        const toggleDrawerButton = await $('#toggleDrawerButton');
        // Close the app drawer
        await toggleDrawerButton.click();
        const appDrawer = await $('#appDrawer');
        await appDrawer.waitForStable({
            timeout: 5000,
            timeoutMsg: 'appDrawer did not close within 5 seconds',
        });
        const sectionNavItem = await $('#generalTabLink');
        await sectionNavItem.click();

        const section = await $('#general');
        section.waitForExist({
            timeout: 5000,
            timeoutMsg:
                'General section did not appear within 5 seconds',
        });
        await expect(section).toBeDisplayed();
        const sectionHeading = await section.$('h2');
        await expect(sectionHeading).toHaveText('General ⚙️');
        await expect($('#sound')).not.toBeDisplayed();
        await expect($('#content')).not.toBeDisplayed();
        await expect($('#reset')).not.toBeDisplayed();
        await toggleDrawerButton.click();
        await appDrawer.waitForStable({
            timeout: 5000,
            timeoutMsg: 'appDrawer did not expand within 5 seconds',
        });
    });
});