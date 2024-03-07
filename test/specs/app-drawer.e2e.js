const { browser, expect, $ } = require('@wdio/globals');

describe('App drawer toggle smoke tests', () => {
    let toggleDrawerButton;
    let appDrawer;
    before(async () => {
        toggleDrawerButton = await $('#toggleDrawerButton');
        appDrawer = await $('#appDrawer');
    });
    it('should open app drawer', async () => {
        // Locate and expand the collapsed sidebar
        await toggleDrawerButton.click();
        browser.waitUntil(
            () => {
                return $('#appDrawer').isDisplayedInViewport();
            },
            {
                timeout: 5000,
                timeoutMsg: 'appDrawer did not expand within 5 seconds',
            }
        );

        await expect(appDrawer).toBeDisplayedInViewport();
    });
    it('should close app drawer', async () => {
        // Locate and expand the collapsed sidebar
        await toggleDrawerButton.click();
        await appDrawer.waitForStable({
            timeout: 5000,
            interval: 300,
            timeoutMsg: 'appDrawer did not expand within 5 seconds',
        });
        await expect(
            (
                await appDrawer.getCSSProperty('left')
            ).value
        ).not.toEqual('0px');

        await toggleDrawerButton.click();

        await appDrawer.waitForStable({
            timeout: 5000,
            interval: 300,
            timeoutMsg: 'appDrawer did not close within 5 seconds',
        });
        await expect(
            (
                await appDrawer.getCSSProperty('left')
            ).value
        ).toEqual('0px');
    });
});