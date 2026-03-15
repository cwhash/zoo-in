const tasks = Array.from({ length: 25 }, (_, index) => {
  const number = index + 1;
  return {
    id: number,
    title: `Task ${number}`,
    description: `Detailed mission notes for task ${number}. Customize this with your own challenge and completion criteria.`
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
    cell.className = "task-cell";
    cell.textContent = task.id;
    cell.setAttribute("aria-label", `${task.title}`);
    cell.addEventListener("click", openSidebar);
    fragment.appendChild(cell);
  });
  gridElement.appendChild(fragment);
}

function renderDetails() {
  const fragment = document.createDocumentFragment();
  tasks.forEach((task) => {
    const item = document.createElement("li");

    const title = document.createElement("div");
    title.className = "task-id";
    title.textContent = `${task.id}. ${task.title}`;

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
