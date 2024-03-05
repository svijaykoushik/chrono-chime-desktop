const { browser, expect, $, $$ } = require('@wdio/globals');
const { faker } = require('@faker-js/faker');
describe('Basic tests', () => {
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

    describe('App drawer toggle smoke tests',()=>{
      let toggleDrawerButton;
      let appDrawer;
      before(async ()=>{
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
    describe('Navigation testing', () => {
      let toggleDrawerButton;
      let appDrawer;
      let appDrawerItems;
      before(async()=>{
        toggleDrawerButton = await $('#toggleDrawerButton');
        appDrawer = await $('#appDrawer');
        appDrawerItems = await $$('#appDrawer .drawer-menu li');
      });

      beforeEach(async ()=>{

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
        });
    });

    describe('Setting page tests', () => {
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
          expect(section).toBeDisplayed();
          const sectionHeading = await section.$('h2');
          expect(sectionHeading).toHaveText('General ⚙️');
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
          expect(section).toBeDisplayed();
          const sectionHeading = await section.$('h2');
          expect(sectionHeading).toHaveText('🔊 Notification Sound');
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
          expect(section).toBeDisplayed();
          const sectionHeading = await section.$('h2');
          expect(sectionHeading).toHaveText('🔊 Notification Content ✉️');
        });
  
        it('should navigate to Reset section', async () => {
          const sectionNavItem = await $('#resetTabLink');
          await sectionNavItem.click();
  
          const section = await $('#reset');
          section.waitForExist({
            timeout: 5000,
            timeoutMsg: 'Reset section did not appear within 5 seconds',
          });
          expect(section).toBeDisplayed();
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
          expect(section).toBeDisplayed();
          const sectionHeading = await section.$('h2');
          expect(sectionHeading).toHaveText('General ⚙️');
          await toggleDrawerButton.click();
          await appDrawer.waitForStable({
            timeout: 5000,
            timeoutMsg: 'appDrawer did not expand within 5 seconds',
          });
        });
      });
  
      describe('General page smoke tests', () => {
        before(async()=>{
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
        });
        
        it('should land on general section', async () => {

          const section = await $('#general');
          expect(section).toBeDisplayed();
          const sectionHeading = await section.$('h2');
          expect(sectionHeading).toHaveText('General ⚙️');
        });

        describe('Interval selection tests',()=>{

          /**
           * @type {WebdriverIO.Element}
           */
          let intervalSelect;

          /**
           * @type {WebdriverIO.Element}
           */
          let toastNotification;
          before(async()=>{
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
              timeoutMsg: 'Toast notification did not appear within 5 seconds'
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
              timeoutMsg: 'Toast notification did not appear within 5 seconds'
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
              timeoutMsg: 'Toast notification did not appear within 5 seconds'
            });
            const selectedValue = await intervalSelect.getValue();
            const notificationText = await toastNotification.getText();
            expect(notificationText).toEqual('✅ Settings saved.');
            expect(selectedValue).toEqual('1');
          });
        });

        describe('Allow notification option tests',()=>{

          /**
           * @type {WebdriverIO.Element}
           */
          let allowNotificationCheckbox;

          /**
           * @type {WebdriverIO.Element}
           */
          let span;

          before(async()=>{
            allowNotificationCheckbox = await $('#allowNotificationCheckbox');
            span = await allowNotificationCheckbox.nextElement();
          });

          it('should be in default state of selected',async()=>{
            const value = await allowNotificationCheckbox.isSelected();
            expect(value).toEqual(true);
          });

          it('should change to deselected', async()=>{

            await span.click();
            await span.waitForStable({
              timeout: 5000,
              timeoutMsg: 'Failed to toggle checkbox in 5 seconds'
            });
            const value = await allowNotificationCheckbox.isSelected();
            expect(value).toEqual(false);
          });

          it('should change to selected', async()=>{
            await span.click();
            await span.waitForStable({
              timeout: 5000,
              timeoutMsg: 'Failed to toggle checkbox in 5 seconds'
            });
            const value = await allowNotificationCheckbox.isSelected();
            expect(value).toEqual(true);
          });
        });

        describe('Autolaunch option tests',()=>{

          /**
           * @type {WebdriverIO.Element}
           */
          let autoLaunchCheckbox;

          /**
           * @type {WebdriverIO.Element}
           */
          let span;

          before(async()=>{
            autoLaunchCheckbox = await $('#autoLaunchCheckbox');
            span = await autoLaunchCheckbox.nextElement();
          });

          it('should be in default state of deselected',async()=>{
            const value = await autoLaunchCheckbox.isSelected();
            expect(value).toEqual(false);
          });

          it('should change to selected', async()=>{

            await span.click();
            await span.waitForStable({
              timeout: 5000,
              timeoutMsg: 'Failed to toggle checkbox in 5 seconds'
            });
            const value = await autoLaunchCheckbox.isSelected();
            expect(value).toEqual(true);
          });

          it('should change to deselected', async()=>{
            await span.click();
            await span.waitForStable({
              timeout: 5000,
              timeoutMsg: 'Failed to toggle checkbox in 5 seconds'
            });
            const value = await autoLaunchCheckbox.isSelected();
            expect(value).toEqual(false);
          });
        });
      });

      describe('Notification sound section tests',()=>{
        before(async()=>{
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

          const sectionNavItem = await $('#soundTabLink');
          await sectionNavItem.click();
  
          const section = await $('#sound');
          section.waitForExist({
            timeout: 5000,
            timeoutMsg:
              'Notification Sound section did not appear within 5 seconds',
          });
        });
        
        it('should land on Notification Sound section', async () => {

          const section = await $('#sound');
          expect(section).toBeDisplayed();
          const sectionHeading = await section.$('h2');
          expect(sectionHeading).toHaveText('🔊 Notification Sound');
        });

        describe('Sound selection tests',()=>{

          /**
           * @type {WebdriverIO.Element}
           */
          let notificationSound;

          /**
           * @type {WebdriverIO.Element}
           */
          let toastNotification;
          before(async()=>{
            notificationSound = await $('#notificationSound');
            toastNotification = await $('#toastNotification');
          });

          it('should have default sound1', async () => {
            const selectedValue = await notificationSound.getValue();
            expect(selectedValue).toEqual('sound1');
          });

          it('should select sound2', async () => {
            await notificationSound.selectByAttribute('value', 'sound2');
            toastNotification.waitForStable({
              timeout: 5000,
              timeoutMsg: 'Toast notification did not appear within 5 seconds'
            });
            const selectedValue = await notificationSound.getValue();
            const notificationText = await toastNotification.getText();
            expect(notificationText).toEqual('✅ Settings saved.');
            expect(selectedValue).toEqual('sound2');
          });

          it('should select sound3', async () => {
            await notificationSound.selectByAttribute('value', 'sound3');
            toastNotification.waitForStable({
              timeout: 5000,
              timeoutMsg: 'Toast notification did not appear within 5 seconds'
            });
            const selectedValue = await notificationSound.getValue();
            const notificationText = await toastNotification.getText();
            expect(notificationText).toEqual('✅ Settings saved.');
            expect(selectedValue).toEqual('sound3');
          });

          it('should select mute', async () => {
            await notificationSound.selectByAttribute('value', 'mute');
            toastNotification.waitForStable({
              timeout: 5000,
              timeoutMsg: 'Toast notification did not appear within 5 seconds'
            });
            const selectedValue = await notificationSound.getValue();
            const notificationText = await toastNotification.getText();
            expect(notificationText).toEqual('✅ Settings saved.');
            expect(selectedValue).toEqual('mute');
          });

          it('should select sound1', async () => {
            await notificationSound.selectByAttribute('value', 'sound1');
            toastNotification.waitForStable({
              timeout: 5000,
              timeoutMsg: 'Toast notification did not appear within 5 seconds'
            });
            const selectedValue = await notificationSound.getValue();
            const notificationText = await toastNotification.getText();
            expect(notificationText).toEqual('✅ Settings saved.');
            expect(selectedValue).toEqual('sound1');
          });
        });
      });

      describe('Notification content section tests',()=>{

        /**
         * @type {WebdriverIO.Element}
         */
        let toastNotification;
        /**
         * @type {WebdriverIO.Element}
         */
        let section;
        before(async()=>{
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

        it('should update custom title',async()=>{
          const notificationTitle = await $('#notificationTitle');
          const val = faker.lorem.sentence();
          await notificationTitle.setValue(val);
          await section.click();
          await expect(await notificationTitle.getValue()).toEqual(val);
          await expect(toastNotification).toHaveText(
              expect.stringMatching('✅ Settings saved.')
          );
        });

        it('should update custom message',async()=>{
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
    });
});
