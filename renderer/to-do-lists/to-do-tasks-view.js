'use strict';

import { showAppToast } from '../app-toast/app-toast.js';
import EventEmitter from '../lib/event-emitter.js';
import {
  addTask,
  getLastSession,
  getTasks,
  removeTask,
  startTask,
  stopTask,
} from './to-do-lists.js';

/**
 * @typedef {Object} TaskViewType
 * @property {boolean} isRunning Represents if task is running actively
 * @property {number} timeElapsed The time elapsed in milliseconds
 * @property {string} listId The list which the task belongs to
 * @property {boolean} isSuspended Represents if the task is suspended by the app.
 * @property {string | null} sessionId Current session of the task
 *
 * @typedef { import('./to-do-lists.js').Task & TaskViewType} TaskView
 */
const tasksModal = /** @type {HTMLDialogElement} */ (
  document.getElementById('tasksModal')
);
const addTaskBtn = /** @type {HTMLButtonElement} */ (
  document.getElementById('addTaskBtn')
);
const cancelAddTaskBtn = /** @type {HTMLButtonElement} */ (
  document.getElementById('cancelAddTaskBtn')
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

/**
 * @type {TaskView[]}
 */
let taskViews = [];

export const tvBus = new EventEmitter();

/**
 *
 * @param {string} listId
 */
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
          tvBus.emit('render-tasks', taskView.listId);
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

tvBus.on('render-tasks', async (/** @type {string} */ listId) => {
  openTaskModalBtn.dataset.listId = listId;
  // Fetch tasks from some external function
  const fetchedTasks = await getTasks(listId);


  // Create a map for easier lookup by task id
  const taskViewMap = new Map(taskViews.map((tv) => [tv.id, tv]));

  // Update taskViews: either update existing or add new ones
  taskViews = await Promise.all(
    fetchedTasks.map(async (task) => {
      const existingTaskView = taskViewMap.get(task.id);

      // If taskView exists, update it while preserving the view state
      if (existingTaskView) {
        return {
          ...existingTaskView,
          ...task, // update task properties
        };
      }

      
      const session = await getLastSession(task.id);

      /**
       * @type {string}
       */
      let sessionId = '';

      // Start new session for task if the task is not
      // stopped yet
      if(session && !session.stopTime){
        await stopTask(session.id, new Date());
        sessionId = await startTask(task.id,new Date());
      }
      // If no existing taskView, create a new one
      return {
        ...task,
        isRunning: sessionId? true : false,
        timeElapsed: 0,
        sessionId: sessionId || null,
        listId: listId,
        isSuspended: false
      };
    })
  );

  // Optionally, you could log the updated task views to see the result

  renderTasks(taskViews);
});
openTaskModalBtn.addEventListener('click', openTaskModalBtnClick);

cancelAddTaskBtn.addEventListener('click', () => tasksModal.close());

addTaskBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  const taskDescription = taskTitleInput.value.trim();
  const completed = taskStatusInput.checked;
  const listId = tasksForm.dataset.listId;
  if (taskDescription.length >= 3 && taskDescription.length <= 250 && listId) {
    await addTask(listId, { description: taskDescription, completed });
    // renderTaskLists();
    tvBus.emit('render-tasks', listId);
    taskTitleInput.value = '';
    taskStatusInput.checked = false;
    tasksModal.close();
  }
});

window.systemState.onStateChanged((e, data)=>{
  if (data === 'idle') {
    __electronLog.log('System going into idle');
    taskViews.forEach((taskView) => {
      if (taskView.isRunning) {
        stopTask(taskView.sessionId, new Date()).then(() => {
          taskView.isRunning = false;
          taskView.sessionId = null;
          taskView.isSuspended = true;
          tvBus.emit('render-tasks', taskView.listId);
        });
      }
    });
  } else if (data === 'active') {
    __electronLog.log('System resumed from idle');
    taskViews.forEach((taskView) => {
      if (taskView.isRunning === false && taskView.isSuspended === true) {
        startTask(taskView.id, new Date()).then((sessionId) => {
          taskView.isRunning = true;
          taskView.sessionId = sessionId;
          taskView.isSuspended = false;
          tvBus.emit('render-tasks', taskView.listId);
        });
      }
    });
  }
});