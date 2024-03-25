const { browser, expect, $, $$ } = require('@wdio/globals');

describe('Notification sound section tests', () => {
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

        // Close the app drawer
        await toggleDrawerButton.click();

        await appDrawer.waitForStable({
            timeout: 5000,
            timeoutMsg: 'appDrawer did not close within 5 seconds',
        });

        const sectionNavItem = await $('#soundTabLink');
        await sectionNavItem.click();

        const section = await $('#sound');
        await section.waitForExist({
            timeout: 5000,
            timeoutMsg:
                'Notification Sound section did not appear within 5 seconds',
        });
    });

    it('should land on Notification Sound section', async () => {

        const section = await $('#sound');
        await expect(section).toBeDisplayed();
        const sectionHeading = await section.$('h2');
        await expect(sectionHeading).toHaveText('🔊 Notification Sound');
    });

    describe('Sound selection tests', () => {

        /**
         * @type {WebdriverIO.Element}
         */
        let notificationSound;

        /**
         * @type {WebdriverIO.Element}
         */
        let toastNotification;
        before(async () => {
            notificationSound = await $('#notificationSound');
            toastNotification = await $('#toastNotification');
        });

        it('should have default sound1', async () => {
            const selectedValue = await notificationSound.getValue();
            await expect(selectedValue).toEqual('sound1');
        });

        it('should select sound2', async () => {
            await notificationSound.selectByAttribute('value', 'sound2');
            toastNotification.waitForStable({
                timeout: 5000,
                timeoutMsg: 'Toast notification did not appear within 5 seconds'
            });
            const selectedValue = await notificationSound.getValue();
            const notificationText = await toastNotification.getText();
            await expect(notificationText).toEqual('✅ Settings saved.');
            await expect(selectedValue).toEqual('sound2');
        });

        it('should select sound3', async () => {
            await notificationSound.selectByAttribute('value', 'sound3');
            toastNotification.waitForStable({
                timeout: 5000,
                timeoutMsg: 'Toast notification did not appear within 5 seconds'
            });
            const selectedValue = await notificationSound.getValue();
            const notificationText = await toastNotification.getText();
            await expect(notificationText).toEqual('✅ Settings saved.');
            await expect(selectedValue).toEqual('sound3');
        });

        it('should select mute', async () => {
            await notificationSound.selectByAttribute('value', 'mute');
            toastNotification.waitForStable({
                timeout: 5000,
                timeoutMsg: 'Toast notification did not appear within 5 seconds'
            });
            const selectedValue = await notificationSound.getValue();
            const notificationText = await toastNotification.getText();
            await expect(notificationText).toEqual('✅ Settings saved.');
            await expect(selectedValue).toEqual('mute');
        });

        it('should select sound1', async () => {
            await notificationSound.selectByAttribute('value', 'sound1');
            await toastNotification.waitForStable({
                timeout: 5000,
                timeoutMsg: 'Toast notification did not appear within 5 seconds'
            });
            const selectedValue = await notificationSound.getValue();
            const notificationText = await toastNotification.getText();
            await expect(notificationText).toEqual('✅ Settings saved.');
            await expect(selectedValue).toEqual('sound1');
        });
    });
});