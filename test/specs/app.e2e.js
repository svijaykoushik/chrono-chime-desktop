const { browser, expect, $ } = require('@wdio/globals');
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