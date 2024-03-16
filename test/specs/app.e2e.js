const { browser, expect, $ } = require('@wdio/globals');
describe('Spawn tests', () => {
    it('should check app title', async () => {
        const expectedTitle = 'ChronoChime - Time Keeper Extraordinaire';
        const receivedTitle = await browser.getTitle();
        expect(receivedTitle).toEqual(expectedTitle);
    });
    it('should find main screen', async () => {
        const mainScreen = await $('#main');
        expect(mainScreen).toBeDisplayed();
    });
    it('should check main screen heading', async () => {
        const heading = await $('#main h1');
        const expectedTitle = 'ChronoChime - Time Keeper Extraordinaire';
        expect(expectedTitle).toEqual(await heading.getText());
    });
    it('should find countdown timer', async () => {
        const countdownTimer = await $('#main #countdownTimer');
        expect(countdownTimer).toBeDisplayed();
    });
    it('should not show ask permission button', async()=>{
        await expect($('#askPermissionButton')).not.toBeDisplayed();
    });
    it('should not show settings',async ()=>{
        await expect($('#settings')).not.toBeDisplayed();
    });    
    it('should not show attributions',async ()=>{
        await expect($('#attributions')).not.toBeDisplayed();
    });
    it('should not show about',async ()=>{
        await expect($('#about')).not.toBeDisplayed();
    });
});