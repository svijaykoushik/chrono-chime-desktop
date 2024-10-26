'use strict';

import { showAppToast } from '../app-toast/app-toast.js';
import EventEmitter from '../lib/event-emitter.js';
import {
  addTask,
  createList,
  deleteList,
  getList,
  getLists,
  getTasks,
  removeTask,
  startTask,
  stopTask,
  updateList,
} from './to-do-lists.js';
//#region Tasks
// Initialize modals and buttons
const listsModal = /** @type {HTMLDialogElement} */ (
  document.getElementById('listsModal')
);
const tasksModal = /** @type {HTMLDialogElement} */ (
  document.getElementById('tasksModal')
);
const addListBtn = /** @type {HTMLButtonElement} */ (
  document.getElementById('addListBtn')
);
const addTaskBtn = /** @type {HTMLButtonElement} */ (
  document.getElementById('addTaskBtn')
);
const cancelAddListBtn = /** @type {HTMLButtonElement} */ (
  document.getElementById('cancelAddListBtn')
);
const cancelAddTaskBtn = /** @type {HTMLButtonElement} */ (
  document.getElementById('cancelAddTaskBtn')
);
const listTitleInput = /** @type {HTMLInputElement} */ (
  document.getElementById('listTitleInput')
);
const taskTitleInput = /** @type {HTMLInputElement} */ (
  document.getElementById('taskTitleInput')
);
const taskStatusInput = /** @type {HTMLInputElement} */ (
  document.getElementById('taskStatusInput')
);
const tasksForm = /** @type {HTMLFormElement} */ (
  document.getElementById('tasksForm')
);
const openTaskModalBtn = /** @type {HTMLButtonElement} */ (
  document.getElementById('openTaskModalBtn')
);
// const listsForm = document.getElementById('listsForm');
const taskListContainer = document.getElementById('taskListContainer');
const taskListOverflowMenu = document.getElementById('taskListOverflowMenu');
const tasklistOverflowMenuToggle = document.getElementById(
  'tasklistOverflowMenuToggle'
);
const taskListEdit = /** @type {HTMLLIElement} */ (
  document.getElementById('taskListEdit')
);
const taskListDelete = /** @type {HTMLLIElement} */ (
  document.getElementById('taskListDelete')
);
const listModalTitle = /** @type {HTMLHeadingElement} */ (
  document.getElementById('listModalTitle')
);

cancelAddListBtn.addEventListener('click', (e) => {
  e.preventDefault();
  listTitleInput.value = '';
  listsModal.close();
});
cancelAddTaskBtn.addEventListener('click', () => tasksModal.close());

function toggleTaskListOverFlowMenu() {
  taskListOverflowMenu.classList.toggle('active');
}

function openAddTaskModal(listId) {
  tasksForm.dataset.listId = listId;
  tasksModal.showModal();
}

/**
 * Handles click of open task modal button
 * @param {MouseEvent} e
 */
function openTaskModalBtnClick(e) {
  e.preventDefault();
  const btn = /** @type {HTMLButtonElement} */ (e.target);
  const listId = btn.dataset.listId;
  openAddTaskModal(listId);
}

openTaskModalBtn.addEventListener('click', openTaskModalBtnClick);

/**
 * Creates a button secondary action theme
 * @param {string} emojiIcon Emoji icon for the icon button
 * @param {(this: HTMLButtonElement, ev: MouseEvent) => any} cb Event handler callback
 * @param {DOMStringMap=} dataset Dataset to be attached to the button
 */
function createSecondaryActionBtn(emojiIcon, cb, dataset) {
  const button = document.createElement('button');
  button.type = 'button';
  button.addEventListener('click', cb);
  const emojiSpan = document.createElement('span');
  emojiSpan.classList.add('emoji');
  emojiSpan.textContent = emojiIcon;
  button.appendChild(emojiSpan);
  if (dataset) {
    button.dataset === button.dataset;
  }
  return button;
}

/**
 * @typedef {Object} TaskViewType
 * @property {boolean} isRunning Represents if task is running actively
 * @property {number} timeElapsed The time elapsed in milliseconds
 * @property {string | null} sessionId Current session of the task
 *
 * @typedef { import('./to-do-lists.js').Task & TaskViewType} TaskView
 */

/**
 * @type {TaskView[]}
 */
let taskViews = [];

/**
 * Renders the tasks to the interface
 * @param {TaskView[]} taskViews Task views to render
 */
async function renderTasks(taskViews) {
  const tasksViewBody = /** @type {HTMLDivElement} */ (
    document.querySelector('#taskContainer .task-view-body')
  );

  // remove existing tasks
  while (tasksViewBody.firstChild) {
    tasksViewBody.removeChild(tasksViewBody.firstChild);
  }

  const listContainer = document.createElement('ul');
  listContainer.classList.add('list-tasks');

  for (const taskView of taskViews) {
    const listItem = document.createElement('li');
    listItem.id = taskView.id;
    const listItemContainer = document.createElement('div');

    const listPrimaryAction = document.createElement('div');
    listPrimaryAction.classList.add('list-primary-action');
    const startBtn = createSecondaryActionBtn(
      taskView.isRunning ? '⏹️' : '▶️',
      async (e) => {
        e.preventDefault();
        const target = /** @type {HTMLButtonElement} */ (e.target);

        if (taskView.isRunning) {
          await stopTask(taskView.sessionId, new Date());
          taskView.isRunning = false;
          taskView.sessionId = null;
        } else {
          const sessionId = await startTask(taskView.id, new Date());
          taskView.sessionId = sessionId;
          taskView.isRunning = true;
        }

        // Simplify button text toggle
        const buttonText = taskView.isRunning ? '⏹️' : '▶️';
        if (target.tagName === 'BUTTON') {
          target.firstChild.textContent = buttonText;
        } else if (target.tagName === 'SPAN') {
          target.textContent = buttonText;
        }
      }
    );
    listPrimaryAction.appendChild(startBtn);

    listItemContainer.classList.add('subtitle1');
    listItemContainer.textContent = taskView.description;

    const listSecondaryAction = document.createElement('div');
    listSecondaryAction.classList.add('list-secondary-action');
    const deleteBtn = createSecondaryActionBtn('❌', (e) => {
      e.preventDefault();
      removeTask(taskView.id)
        .then(() => {
          showAppToast('✔️ Task Removed');
        })
        .catch((e) => {
          __electronLog.error('Failed to remove task', JSON.stringify(e));
          showAppToast('❌ Failed to remove task');
        });
    });

    listSecondaryAction.appendChild(deleteBtn);

    listItem.append(listPrimaryAction, listItemContainer, listSecondaryAction);

    listContainer.appendChild(listItem);
  }

  tasksViewBody.appendChild(listContainer);
}

const tvBus = new EventEmitter();

tvBus.on('render-tasks', async (/** @type {string} */ listId) => {
  // Fetch tasks from some external function
  const fetchedTasks = await getTasks(listId);

  console.log('Fetched Tasks', fetchedTasks);

  // Create a map for easier lookup by task id
  const taskViewMap = new Map(taskViews.map((tv) => [tv.id, tv]));

  // Update taskViews: either update existing or add new ones
  taskViews = fetchedTasks.map((task) => {
    const existingTaskView = taskViewMap.get(task.id);

    // If taskView exists, update it while preserving the view state
    if (existingTaskView) {
      return {
        ...existingTaskView,
        ...task, // update task properties
      };
    }

    // If no existing taskView, create a new one
    return {
      ...task,
      isRunning: false,
      timeElapsed: 0,
      sessionId: null,
    };
  });

  // Optionally, you could log the updated task views to see the result
  console.log('Updated TaskViews', taskViews);

  renderTasks(taskViews);
});

/**
 * Handler for toggling the overflow menu
 * in the list
 * @param {MouseEvent} e
 */
function taskListOverflowMenuToggleHandler(e) {
  e.preventDefault();
  toggleTaskListOverFlowMenu();
}

/**
 * Handler for loading the corresponding tasks
 * in the list
 * @param {MouseEvent} e
 */
async function taskListItemClickHandler(e) {
  e.preventDefault();
  const listItem = /** @type {HTMLLIElement} */ (e.currentTarget);
  const taskList = document.getElementById('taskList');
  for (const item of taskList.children) {
    item.classList.remove('active');
  }
  listItem.classList.add('active');
  const taskListName = document.getElementById('taskListName');
  const list = await getList(listItem.id);
  taskListName.innerText = listItem.dataset.listName;
  taskListEdit.dataset.listId = list.id;
  taskListDelete.dataset.listId = list.id;
  openTaskModalBtn.dataset.listId = list.id;
  if (list.isPrebuilt) {
    tasklistOverflowMenuToggle.classList.add('d-none');
    tasklistOverflowMenuToggle.classList.remove('d-block');
  } else {
    tasklistOverflowMenuToggle.classList.add('d-block');
    tasklistOverflowMenuToggle.classList.remove('d-none');
  }
  console.log('Selected list is ', list.id, list.name);

  tvBus.emit('render-tasks', list.id);
}

async function setDefaultTaskList() {
  const lists = await getLists();
  const defaultList = lists.find((list) => list.name === 'Daily Agenda');
  const defaultTaskListItem = document.getElementById(defaultList.id);
  const list = await getList(defaultList.id);
  defaultTaskListItem.classList.add('active');
  const taskListName = document.getElementById('taskListName');
  taskListName.innerText = defaultTaskListItem.dataset.listName;
  taskListEdit.dataset.listId = list.id;
  taskListDelete.dataset.listId = list.id;
  openTaskModalBtn.dataset.listId = list.id;
  if (list.isPrebuilt) {
    tasklistOverflowMenuToggle.classList.add('d-none');
    tasklistOverflowMenuToggle.classList.remove('d-block');
  } else {
    tasklistOverflowMenuToggle.classList.add('d-block');
    tasklistOverflowMenuToggle.classList.remove('d-none');
  }
  tvBus.emit('render-tasks', list.id);
}

/**
 * Handler for Clicking add list button
 * @param {MouseEvent} e
 */
function addListButtonClick(e) {
  e.preventDefault();
  listModalTitle.innerText = 'New List';
  addListBtn.innerText = 'Add List';
  addListBtn.dataset.mode = 'add';
  addListBtn.dataset.listId = null;
  listsModal.showModal();
}

// Example task list rendering
export async function renderTaskLists() {
  const lists = await getLists();
  taskListContainer.innerHTML = '';
  const taskList = document.createElement('ul');
  taskList.id = 'taskList';
  taskList.className = 'list-view-list';
  const listTitleItem = document.createElement('li');
  listTitleItem.className = 'list-view-title';
  listTitleItem.innerText = 'Tasks';
  taskList.append(listTitleItem);
  const sortedLists = lists.sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );
  for (const list of sortedLists) {
    const listItem = document.createElement('li');
    listItem.id = list.id;
    listItem.classList.add('list-item');
    listItem.addEventListener('click', taskListItemClickHandler);
    listItem.setAttribute('data-list-name', list.name);
    const iconSpan = document.createElement('span');
    iconSpan.classList.add('icon');
    iconSpan.innerText = list.icon;
    const bodySpan = document.createElement('span');
    bodySpan.classList.add('body2');
    bodySpan.innerText = list.name;
    listItem.appendChild(iconSpan);
    listItem.appendChild(bodySpan);
    taskList.appendChild(listItem);
    // taskListItems += `
    //   <li class="list-item" id="${list.id} click="taskListItemHandler(event)">
    //     <span class="icon">${list.icon}</span>
    //     <span class="body2">${list.name}</span>
    //   </li>
    // `;
    // const tasks = await getTasks(list.id);
    // const listElement = document.createElement('li');
    // listElement.setAttribute('data-list-id', list.id);
    // listElement.innerHTML = `<li data-list-id="${list.id}">
    //      <div class="flex-grow">
    //        <span class="heading subtitle1">${list.name}</h2>
    //        <button class="cta-button" onclick="openAddTaskModal(${
    //          list.id
    //        })"><span class="emoji">➕</span>Add Task</button>
    //       <ul class="list">
    //           ${tasks
    //             .map(
    //               (task) => `
    //               <li>
    //                   <span>${task.task.title}</span>
    //                   <span>${task.task.completed ? '✅' : '❌'}</span>
    //                   <button onclick="deleteTask(${task.id})">Delete</button>
    //               </li>`
    //             )
    //             .join('')}
    //       </ul>
    //      </div>
    //      <div class="list-secondary-action">
    //        <button type="button">
    //          <span class="emoji">❌</span>
    //        </button>
    //      </div>
    //      <div class="clear-float"></div>
    //    </li>`;
    // taskList.appendChild(listElement);
  }
  const addListButtonItem = document.createElement('li');
  const addListButton = document.createElement('button');
  addListButton.id = 'newListBtn';
  addListButton.className = 'cta-button';
  const btnEmojiSpan = document.createElement('span');
  btnEmojiSpan.className = 'emoji';
  btnEmojiSpan.innerText = '➕';
  addListButton.appendChild(btnEmojiSpan);
  const addListButtonText = document.createTextNode('Add List');
  addListButton.appendChild(addListButtonText);
  addListButton.addEventListener('click', addListButtonClick);
  addListButtonItem.appendChild(addListButton);
  taskList.appendChild(addListButtonItem);
  taskListContainer.appendChild(taskList);
  if (taskList.getElementsByClassName('active').length === 0) {
    await setDefaultTaskList();
  }
  tasklistOverflowMenuToggle.addEventListener(
    'click',
    taskListOverflowMenuToggleHandler
  );
}

taskListEdit.addEventListener('click', async (e) => {
  e.preventDefault();
  const target = /** @type {HTMLLIElement} */ (e.currentTarget);
  console.log('selected list id', target.dataset.listId);
  const list = await getList(target.dataset.listId);
  listTitleInput.value = list.name;
  listModalTitle.innerText = 'Edit List';
  addListBtn.innerText = 'Save List';
  addListBtn.dataset.mode = 'edit';
  addListBtn.dataset.listId = list.id;
  listsModal.showModal();
  toggleTaskListOverFlowMenu();
});

taskListDelete.addEventListener('click', async (e) => {
  e.preventDefault();
  const target = /** @type {HTMLLIElement} */ (e.currentTarget);
  try {
    console.log('selected list id to delete is', target.dataset.listId);
    toggleTaskListOverFlowMenu();
    await deleteList(target.dataset.listId);
    renderTaskLists();
  } catch (e) {
    showAppToast('❌ ' + e.message);
    console.error('Failed to delete list', e);
  }
});

addListBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  const listName = listTitleInput.value.trim();
  if (
    listName.length >= 3 &&
    listName.length <= 250 &&
    addListBtn.dataset.mode === 'add'
  ) {
    await createList(listName);
    renderTaskLists();
    listTitleInput.value = '';
    listsModal.close();
  }

  if (
    listName.length >= 3 &&
    listName.length <= 250 &&
    addListBtn.dataset.mode === 'edit'
  ) {
    try {
      const list = await getList(addListBtn.dataset.listId);
      await updateList(addListBtn.dataset.listId, { ...list, name: listName });
      listTitleInput.value = '';
      renderTaskLists();
      listsModal.close();
      console.log('Data updated, %s', addListBtn.dataset.listId);
    } catch (e) {
      showAppToast('❌ ' + e.message);
    }
  }
});

addTaskBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  const taskDescription = taskTitleInput.value.trim();
  const completed = taskStatusInput.checked;
  const listId = tasksForm.dataset.listId;
  if (taskDescription.length >= 3 && taskDescription.length <= 250) {
    await addTask(listId, { description: taskDescription, completed });
    renderTaskLists();
    tvBus.emit('render-tasks', listId);
    // console.log({taskDescription,completed,listId, completed});
    taskTitleInput.value = '';
    taskStatusInput.checked = false;
    tasksModal.close();
  }
});
//#endregion
