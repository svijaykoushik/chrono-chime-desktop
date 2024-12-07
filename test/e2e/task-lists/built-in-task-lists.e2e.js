const { browser, expect, $ } = require('@wdio/globals');

describe('Built in task lists tests', () => {
  /**
   * @type {WebdriverIO.ElementArray}
   */
  let listItems;
  before(async () => {
    const navRail = await $('nav-rail');
    await expect(navRail).toExist();
    const navDestinations = await navRail.$$('nav-destination');

    const destination = await navDestinations.find(async (navDestination) => {
      const href = await navDestination.getAttribute('href');
      return href === '/tasks';
    });
    await destination.click();
    await browser.waitUntil(
      async () => {
        return $('#tasks').isDisplayed();
      },
      {
        timeout: 5000,
        timeoutMsg: '#tasks did not appear within 5 seconds',
      }
    );

    const taskListContainer = await $('#taskListContainer');
    const tasksList = await taskListContainer.$('ul#taskList');
    listItems = await tasksList.$$('li.list-item');
  });

  it('should have 5 built in lists', async () => {
    await expect(listItems.length).toEqual(5);
  });

  it('should update task list title to match selected title', async () => {
    for (const listItem of listItems) {
      const listName = await listItem.getAttribute('data-list-name');
      await listItem.click();
      await browser.waitUntil(
        async () => {
          const taskListName = await (await $('h1#taskListName')).getText();
          return taskListName === listName;
        },
        {
          timeout: 1000,
          timeoutMsg: 'Expected taskListName to equal list name after 1s',
        }
      );
    }
  });

  it('should keep tasklistOverflowMenuToggle invisible', async () => {
    for (const listItem of listItems) {
      await listItem.click();
      await browser.waitUntil(
        async () => {
          const tasklistOverflowMenuToggle = await $(
            'h2#tasklistOverflowMenuToggle'
          );
          return (await tasklistOverflowMenuToggle.isDisplayed()) === false;
        },
        {
          timeout: 200,
          timeoutMsg:
            'Expected tasklistOverflowMenuToggle to not appear after 200ms',
        }
      );
    }
  });

  it('should keep tasklistOverflowMenuToggle non clickable', async () => {
    for (const listItem of listItems) {
      await listItem.click();
      await browser.waitUntil(
        async () => {
          const tasklistOverflowMenuToggle = await $(
            'h2#tasklistOverflowMenuToggle'
          );
          return (await tasklistOverflowMenuToggle.isClickable()) === false;
        },
        {
          timeout: 200,
          timeoutMsg:
            'Expected tasklistOverflowMenuToggle to not be clickable after 200ms',
        }
      );
    }
  });
});
