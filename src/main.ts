import "./styles/variables.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";

import { TaskApp } from "./app";
import { TaskStorage } from "./services/task-storage";
import { TaskStore } from "./services/task-store";

const store = new TaskStore(new TaskStorage());
new TaskApp(store).start();
