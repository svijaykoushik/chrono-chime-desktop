const { browser, expect, $, $$ } = require('@wdio/globals');

describe('Navigation testing', () => {
    let toggleDrawerButton;
    let appDrawer;
    let appDrawerItems;
    before(async () => {
        toggleDrawerButton = await $('#toggleDrawerButton');
        appDrawer = await $('#appDrawer');
        appDrawerItems = await $$('#appDrawer .drawer-menu li');
    });

    beforeEach(async () => {

        // Locate and expand the collapsed sidebar
        await toggleDrawerButton.click();
        await browser.waitUntil(
            () => {
                return appDrawer.isClickable();
            },
            {
                timeout: 5000,
                timeoutMsg: 'appDrawer did not expand within 5 seconds',
            }
        );
    });

    afterEach(async () => {
        // Close the app drawer
        await toggleDrawerButton.click();
        const appDrawer = await $('#appDrawer');
        await appDrawer.waitForStable({
            timeout: 5000,
            timeoutMsg: 'appDrawer did not close within 5 seconds',
        });
    });
    
    it('should navigate to reminders', async () => {
        const reminders = await appDrawerItems[0].$('a');
        await expect(reminders).toBeClickable();
        await reminders.click();
        await browser.waitUntil(
            () => {
                return $('#reminders').isDisplayed();
            },
            {
                timeout: 5000,
                timeoutMsg: 'reminders did appear within 5 seconds',
            }
        );
        await expect($('#reminders')).toBeDisplayed();
        await expect($('#reminders h1')).toHaveText('Reminders');
        await expect($('#settings')).not.toBeDisplayed();
        await expect($('#about')).not.toBeDisplayed();
        await expect($('#attributions')).not.toBeDisplayed();
    });

    it('should navigate to settings', async () => {
        const settings = await appDrawerItems[1].$('a');
        await expect(settings).toBeClickable();
        await settings.click();
        await browser.waitUntil(
            () => {
                return $('#settings').isDisplayed();
            },
            {
                timeout: 5000,
                timeoutMsg: 'settings did appear within 5 seconds',
            }
        );
        await expect($('#settings')).toBeDisplayed();
        await expect($('#settings h1')).toHaveText('Settings');
        await expect($('#reminders')).not.toBeDisplayed();
        await expect($('#about')).not.toBeDisplayed();
        await expect($('#attributions')).not.toBeDisplayed();
    });

    it('should navigate to attributions', async () => {
        const attributions = await appDrawerItems[2].$('a');
        await expect(attributions).toBeClickable();
        await attributions.click();
        await browser.waitUntil(
            () => {
                return $('#attributions').isDisplayed();
            },
            {
                timeout: 5000,
                timeoutMsg: 'attributions did appear within 5 seconds',
            }
        );
        await expect($('#attributions')).toBeDisplayed();
        await expect($('#attributions h1')).toHaveText('Attributions');
        await expect($('#reminders')).not.toBeDisplayed();
        await expect($('#about')).not.toBeDisplayed();
        await expect($('#settings')).not.toBeDisplayed();
    });

    it('should navigate to about', async () => {
        const about = await appDrawerItems[3].$('a');
        await expect(about).toBeClickable();
        await about.click();
        await browser.waitUntil(
            () => {
                return $('#about').isDisplayed();
            },
            {
                timeout: 5000,
                timeoutMsg: 'about did appear within 5 seconds',
            }
        );
        await expect($('#about')).toBeDisplayed();
        await expect($('#about h1')).toHaveText('About');
        await expect($('#reminders')).not.toBeDisplayed();
        await expect($('#attributions')).not.toBeDisplayed();
        await expect($('#settings')).not.toBeDisplayed();
    });
});