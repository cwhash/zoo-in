const GRID_SIZE = 5;
const CENTER_INDEX = Math.floor(GRID_SIZE / 2);
const LEVEL_ORDER = ["S", "A", "B", "C"];
const START_NUMBER_BY_LEVEL = {
  S: 1,
  A: 2,
  B: 10,
  C: 18
};
const levelLabel = {
  S: "金色",
  A: "淡藍色",
  B: "淡綠色",
  C: "灰色"
};

function getTaskLevel(row, col) {
  const isCenter = row === CENTER_INDEX && col === CENTER_INDEX;
  if (isCenter) {
    return "S";
  }

  const isDiagonal = row === col || row + col === GRID_SIZE - 1;
  if (isDiagonal) {
    return "A";
  }

  const isMiddleCross = row === CENTER_INDEX || col === CENTER_INDEX;
  return isMiddleCross ? "B" : "C";
}

const positions = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
  const row = Math.floor(index / GRID_SIZE);
  const col = index % GRID_SIZE;

  return {
    row,
    col,
    level: getTaskLevel(row, col)
  };
});

const tasks = [];
LEVEL_ORDER.forEach((level) => {
  const levelPositions = positions.filter((position) => position.level === level);
  levelPositions.forEach((position, index) => {
    const id = START_NUMBER_BY_LEVEL[level] + index;
    tasks.push({
      id,
      row: position.row,
      col: position.col,
      level,
      title: `任務 ${id}`,
      description: `連線難度等級：${level}（${levelLabel[level]}）`
    });
  });
});
tasks.sort((a, b) => a.row - b.row || a.col - b.col);

const gridElement = document.getElementById("taskGrid");
const detailsElement = document.getElementById("taskDetails");
const sidebar = document.getElementById("sidebar");
const menuButton = document.getElementById("menuButton");
const closeButton = document.getElementById("closeButton");
const overlay = document.getElementById("overlay");

function renderGrid() {
  const fragment = document.createDocumentFragment();
  tasks.forEach((task, index) => {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = `task-cell level-${task.level}`;
    cell.textContent = `${task.id}`;
    cell.style.setProperty("--i", index + 1);
    cell.setAttribute("aria-label", `${task.title}，難度 ${task.level}`);
    cell.addEventListener("click", openSidebar);
    fragment.appendChild(cell);
  });
  gridElement.appendChild(fragment);
}

function renderDetails() {
  const fragment = document.createDocumentFragment();
  const tasksByIdAsc = [...tasks].sort((a, b) => a.id - b.id);
  tasksByIdAsc.forEach((task) => {
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