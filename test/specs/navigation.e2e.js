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
        toggleDrawerButton = await $('#toggleDrawerButton');
        await toggleDrawerButton.click();
        browser.waitUntil(
            () => {
                return appDrawer.isDisplayed();
            },
            {
                timeout: 5000,
                timeoutMsg: 'appDrawer did not expand within 5 seconds',
            }
        );
    });

    it('should navigate to settings', async () => {
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
        expect($('#about')).not.toBeDisplayed();
        expect($('#attributions')).not.toBeDisplayed();
    });

    it('should navigate to attributions', async () => {
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
        expect($('#about')).not.toBeDisplayed();
        expect($('#settings')).not.toBeDisplayed();
    });

    it('should navigate to about', async () => {
        const attributions = await appDrawerItems[2].$('a');
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
        expect($('#attributions')).not.toBeDisplayed();
        expect($('#settings')).not.toBeDisplayed();
    });
});