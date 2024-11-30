'use strict';

import { showAppToast } from '../app-toast/app-toast.js';
import EventEmitter from '../lib/event-emitter.js';
import {
  createList,
  deleteList,
  getList,
  getLists,
  updateList,
} from './to-do-lists.js';
import { tvBus } from './to-do-tasks-view.js';
//#region Tasks
// Initialize modals and buttons
const listsModal = /** @type {HTMLDialogElement} */ (
  document.getElementById('listsModal')
);
const addListBtn = /** @type {HTMLButtonElement} */ (
  document.getElementById('addListBtn')
);
const cancelAddListBtn = /** @type {HTMLButtonElement} */ (
  document.getElementById('cancelAddListBtn')
);
const listTitleInput = /** @type {HTMLInputElement} */ (
  document.getElementById('listTitleInput')
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

export const tListBus = new EventEmitter();

function toggleTaskListOverFlowMenu() {
  taskListOverflowMenu.classList.toggle('active');
}

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
  tListBus.emit('list-selected', list.id);
  taskListName.innerText = listItem.dataset.listName;
  taskListEdit.dataset.listId = list.id;
  taskListDelete.dataset.listId = list.id;
  if (list.isPrebuilt) {
    tasklistOverflowMenuToggle.classList.add('d-none');
    tasklistOverflowMenuToggle.classList.remove('d-block');
  } else {
    tasklistOverflowMenuToggle.classList.add('d-block');
    tasklistOverflowMenuToggle.classList.remove('d-none');
  }
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
  tListBus.emit('list-selected', list.id);
  if (list.isPrebuilt) {
    tasklistOverflowMenuToggle.classList.add('d-none');
    tasklistOverflowMenuToggle.classList.remove('d-block');
  } else {
    tasklistOverflowMenuToggle.classList.add('d-block');
    tasklistOverflowMenuToggle.classList.remove('d-none');
  }
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

tListBus.on('list-selected', (/** @type {string} */ listId) => {
  tvBus.emit('render-tasks', listId);
});

taskListEdit.addEventListener('click', async (e) => {
  e.preventDefault();
  const target = /** @type {HTMLLIElement} */ (e.currentTarget);
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
    } catch (e) {
      showAppToast('❌ ' + e.message);
    }
  }
});

cancelAddListBtn.addEventListener('click', (e) => {
  e.preventDefault();
  listTitleInput.value = '';
  listsModal.close();
});
//#endregion
