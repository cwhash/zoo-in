const levelPlan = [
  { level: "S", count: 1 },
  { level: "A", count: 8 },
  { level: "B", count: 8 },
  { level: "C", count: 8 }
];

const taskLevels = levelPlan.flatMap(({ level, count }) => Array.from({ length: count }, () => level));

const tasks = Array.from({ length: 25 }, (_, index) => {
  const number = index + 1;
  const level = taskLevels[index];

  return {
    id: number,
    level,
    title: `任務 ${number}`,
    description: `連線難度等級：${level}`
  };
});

const gridElement = document.getElementById("taskGrid");
const detailsElement = document.getElementById("taskDetails");
const sidebar = document.getElementById("sidebar");
const menuButton = document.getElementById("menuButton");
const closeButton = document.getElementById("closeButton");
const overlay = document.getElementById("overlay");

function renderGrid() {
  const fragment = document.createDocumentFragment();
  tasks.forEach((task) => {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = `task-cell level-${task.level}`;
    cell.textContent = `${task.id}`;
    cell.setAttribute("aria-label", `${task.title}，難度 ${task.level}`);
    cell.addEventListener("click", openSidebar);
    fragment.appendChild(cell);
  });
  gridElement.appendChild(fragment);
}

function renderDetails() {
  const fragment = document.createDocumentFragment();
  tasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = `level-${task.level}`;

    const title = document.createElement("div");
    title.className = "task-id";
    title.textContent = `${task.id}. ${task.title} (${task.level})`;

    const description = document.createElement("p");
    description.textContent = task.description;
    description.style.margin = "0";

    item.append(title, description);
    fragment.appendChild(item);
  });
  detailsElement.appendChild(fragment);
}

function openSidebar() {
  sidebar.classList.add("open");
  sidebar.setAttribute("aria-hidden", "false");
  menuButton.setAttribute("aria-expanded", "true");
  overlay.classList.remove("hidden");
}

function closeSidebar() {
  sidebar.classList.remove("open");
  sidebar.setAttribute("aria-hidden", "true");
  menuButton.setAttribute("aria-expanded", "false");
  overlay.classList.add("hidden");
}

menuButton.addEventListener("click", openSidebar);
closeButton.addEventListener("click", closeSidebar);
overlay.addEventListener("click", closeSidebar);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeSidebar();
  }
});

renderGrid();
renderDetails();
