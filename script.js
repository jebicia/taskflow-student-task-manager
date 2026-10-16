

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const taskForm = $("#taskForm");
const taskInput = $("#taskInput");
const taskCategory = $("#taskCategory");
const taskPriority = $("#taskPriority");
const taskDeadline = $("#taskDeadline");
const taskList = $("#taskList");
const searchInput = $("#searchInput");

const STORAGE_KEY = "taskflow-tasks-v1";
const THEME_KEY = "taskflow-theme";

let tasks = loadTasks();
let currentView = "all";
let currentFilter = "all";
let currentCategory = null;

function loadTasks() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : [];
        return Array.isArray(parsed) ? parsed.filter(isValidTask) : [];
    } catch (error) {
        console.error("Could not load saved tasks:", error);
        return [];
    }
}

function isValidTask(task) {
    return task &&
        typeof task.id === "string" &&
        typeof task.title === "string" &&
        typeof task.completed === "boolean" &&
        ["College", "Personal", "Projects", "Other"].includes(task.category) &&
        ["Low", "Medium", "High"].includes(task.priority) &&
        (task.deadline === "" ||
            (typeof task.deadline === "string" &&
             /^\d{4}-\d{2}-\d{2}$/.test(task.deadline)));
}

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return true;
    } catch (error) {
        console.error("Could not save tasks:", error);
        alert("Your changes could not be saved in this browser.");
        return false;
    }
}

function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
    if (!dateString) return "";

    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function isOverdue(task) {
    return Boolean(
        task.deadline &&
        !task.completed &&
        task.deadline < getLocalDateString()
    );
}

function updateDateAndGreeting() {
    const now = new Date();
    const hour = now.getHours();

    let greeting = "Let's make today count!";

    if (hour < 12) greeting = "Good morning, Jebi! ☀️";
    else if (hour < 17) greeting = "Good afternoon, Jebi! 🌼";
    else greeting = "Good evening, Jebi! 🌙";

    $("#greeting").textContent = greeting;

    $("#headerDate").textContent = now.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short"
    });
}

function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const pending = total - completed;
    const overdue = tasks.filter(isOverdue).length;
    const percentage = total ? Math.round((completed / total) * 100) : 0;

    $("#totalCount").textContent = total;
    $("#pendingCount").textContent = pending;
    $("#completedCount").textContent = completed;
    $("#overdueCount").textContent = overdue;
    $("#progressPercent").textContent = `${percentage}%`;
    $("#progressFill").style.width = `${percentage}%`;

    $("#progressMessage").textContent = total === 0
        ? "Add your first task and start your journey!"
        : completed === total
            ? "Amazing! You've completed every task! 🎉"
            : `${completed} of ${total} tasks completed. Keep going!`;
}

function getVisibleTasks() {
    const query = searchInput.value.trim().toLowerCase();

    return tasks
        .filter(task => {
            if (currentView === "today") {
                return task.deadline === getLocalDateString() && !task.completed;
            }

            if (currentView === "upcoming") {
                return task.deadline >= getLocalDateString() &&
                    Boolean(task.deadline) && !task.completed;
            }

            if (currentView === "completed" && !task.completed) {
                return false;
            }

            if (currentView === "all" && currentFilter === "pending" &&
                task.completed) {
                return false;
            }

            if (currentView === "all" && currentFilter === "completed" &&
                !task.completed) {
                return false;
            }

            return true;
        })
        .filter(task => !currentCategory || task.category === currentCategory)
        .filter(task => {
            const searchable = `${task.title} ${task.category} ${task.priority}`;
            return searchable.toLowerCase().includes(query);
        })
        .sort((a, b) => {
            if (a.completed !== b.completed) {
                return Number(a.completed) - Number(b.completed);
            }

            if (a.deadline && b.deadline && a.deadline !== b.deadline) {
                return a.deadline.localeCompare(b.deadline);
            }

            if (a.deadline && !b.deadline) return -1;
            if (!a.deadline && b.deadline) return 1;

            const priorityOrder = { High: 0, Medium: 1, Low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
}

function makePill(text, className) {
    const pill = document.createElement("span");
    pill.className = `pill ${className}`;
    pill.textContent = text;
    return pill;
}

function renderTask(task) {
    const card = document.createElement("article");
    card.className = `task-card${task.completed ? " is-completed" : ""}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-check";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", `Complete ${task.title}`);

    checkbox.addEventListener("change", () => {
        task.completed = checkbox.checked;
        saveTasks();
        render();
    });

    const main = document.createElement("div");
    main.className = "task-main";

    const title = document.createElement("p");
    title.className = "task-title";
    title.textContent = task.title;
    main.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "task-meta";
    meta.appendChild(makePill(task.category, `cat-${task.category}`));
    meta.appendChild(makePill(task.priority, `priority-${task.priority}`));

    if (task.deadline) {
        const deadline = document.createElement("span");
        deadline.className = `deadline${isOverdue(task) ? " overdue" : ""}`;

        if (isOverdue(task)) {
            deadline.textContent = `⚠ Overdue · ${formatDate(task.deadline)}`;
        } else {
            deadline.textContent = `📅 ${formatDate(task.deadline)}`;
        }

        meta.appendChild(deadline);
    }

    main.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const deleteButton = document.createElement("button");
    deleteButton.className = "icon-button delete";
    deleteButton.type = "button";
    deleteButton.textContent = "×";
    deleteButton.title = "Delete task";
    deleteButton.setAttribute("aria-label", `Delete ${task.title}`);

    deleteButton.addEventListener("click", () => {
        tasks = tasks.filter(item => item.id !== task.id);
        saveTasks();
        render();
    });

    actions.appendChild(deleteButton);
    card.append(checkbox, main, actions);

    return card;
}

function renderTasks() {
    const visibleTasks = getVisibleTasks();
    taskList.replaceChildren();

    if (visibleTasks.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";

        const icon = document.createElement("div");
        icon.className = "empty-icon";
        icon.textContent = searchInput.value.trim() ? "🔎" : "🌷";

        const heading = document.createElement("h3");
        heading.textContent = searchInput.value.trim()
            ? "No matching tasks"
            : currentView === "completed"
                ? "Nothing completed yet"
                : currentView === "today"
                    ? "No tasks due today"
                    : currentView === "upcoming"
                        ? "Your schedule is clear"
                        : "Your list is looking fresh!";

        const message = document.createElement("p");
        message.textContent = searchInput.value.trim()
            ? "Try another search or change your filters."
            : "Add a task whenever you're ready. You've got this!";

        empty.append(icon, heading, message);
        taskList.appendChild(empty);
    } else {
        visibleTasks.forEach(task => {
            taskList.appendChild(renderTask(task));
        });
    }

    $("#resultCount").textContent =
        `${visibleTasks.length} ${visibleTasks.length === 1 ? "task" : "tasks"} shown`;
}

function render() {
    updateStats();
    renderTasks();
}

function setActiveNavigation(button) {
    $$(".nav-item").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
}

function setView(view, button) {
    currentView = view;
    currentCategory = null;
    currentFilter = "all";

    $$(".filter-tab").forEach(tab => {
        tab.classList.toggle("active", tab.dataset.filter === "all");
    });

    setActiveNavigation(button);

    const titles = {
        all: "Overview",
        today: "Today's tasks",
        upcoming: "Upcoming",
        completed: "Completed"
    };

    $("#breadcrumbTitle").textContent = titles[view] || view;
    $("#taskSectionTitle").textContent =
        view === "all" ? "Your tasks ✦" : titles[view];

    renderTasks();
}

$$(".nav-item[data-view]").forEach(button => {
    button.addEventListener("click", () => {
        setView(button.dataset.view, button);
        $("#sidebar").classList.remove("open");
        $("#menuToggle").setAttribute("aria-expanded", "false");
    });
});

$$(".category-nav").forEach(button => {
    button.addEventListener("click", () => {
        currentView = "all";
        currentCategory = button.dataset.category;
        currentFilter = "all";

        setActiveNavigation(button);
        $("#breadcrumbTitle").textContent = currentCategory;
        $("#taskSectionTitle").textContent = `${currentCategory} tasks ✦`;

        $$(".filter-tab").forEach(tab => {
            tab.classList.toggle("active", tab.dataset.filter === "all");
        });

        renderTasks();
        $("#sidebar").classList.remove("open");
        $("#menuToggle").setAttribute("aria-expanded", "false");
    });
});

$$(".filter-tab").forEach(button => {
    button.addEventListener("click", () => {
        currentFilter = button.dataset.filter;
        currentView = "all";
        currentCategory = null;

        $$(".filter-tab").forEach(tab => {
            tab.classList.toggle("active", tab === button);
        });

        setActiveNavigation($('.nav-item[data-view="all"]'));
        $("#breadcrumbTitle").textContent = "Overview";
        $("#taskSectionTitle").textContent = "Your tasks ✦";

        renderTasks();
    });
});

searchInput.addEventListener("input", renderTasks);

function openForm() {
    taskForm.classList.remove("hidden");
    taskInput.focus();
}

function closeForm() {
    taskForm.reset();
    taskCategory.value = "College";
    taskPriority.value = "Medium";
    taskForm.classList.add("hidden");
}

$("#openTaskForm").addEventListener("click", openForm);
$("#closeTaskForm").addEventListener("click", closeForm);
$("#cancelTask").addEventListener("click", closeForm);

taskForm.addEventListener("submit", event => {
    event.preventDefault();

    const title = taskInput.value.trim();

    if (!title) {
        taskInput.focus();
        return;
    }

    const newTask = {
        id: (crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`),
        title,
        category: taskCategory.value,
        priority: taskPriority.value,
        deadline: taskDeadline.value,
        completed: false,
        createdAt: new Date().toISOString()
    };

    tasks.unshift(newTask);
    saveTasks();
    closeForm();

    currentView = "all";
    currentCategory = null;
    currentFilter = "all";
    searchInput.value = "";

    $$(".filter-tab").forEach(tab => {
        tab.classList.toggle("active", tab.dataset.filter === "all");
    });

    setActiveNavigation($('.nav-item[data-view="all"]'));
    $("#breadcrumbTitle").textContent = "Overview";
    $("#taskSectionTitle").textContent = "Your tasks ✦";

    render();
});

function applyTheme(theme) {
    const isDark = theme === "dark";

    document.body.classList.toggle("dark", isDark);
    $("#themeIcon").textContent = isDark ? "☀" : "☾";
    $("#themeLabel").textContent = isDark ? "Light mode" : "Dark mode";
}

let currentTheme = "light";

try {
    currentTheme = localStorage.getItem(THEME_KEY) === "dark"
        ? "dark"
        : "light";
} catch (error) {
    console.warn("Theme preference could not be loaded.");
}

applyTheme(currentTheme);

$("#themeToggle").addEventListener("click", () => {
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(currentTheme);

    try {
        localStorage.setItem(THEME_KEY, currentTheme);
    } catch (error) {
        console.warn("Theme preference could not be saved.");
    }
});

$("#menuToggle").addEventListener("click", () => {
    const isOpen = $("#sidebar").classList.toggle("open");
    $("#menuToggle").setAttribute("aria-expanded", String(isOpen));
});

document.addEventListener("click", event => {
    const sidebar = $("#sidebar");
    const menuButton = $("#menuToggle");

    if (
        window.innerWidth <= 700 &&
        sidebar.classList.contains("open") &&
        !sidebar.contains(event.target) &&
        !menuButton.contains(event.target)
    ) {
        sidebar.classList.remove("open");
        menuButton.setAttribute("aria-expanded", "false");
    }
});

updateDateAndGreeting();
render();
