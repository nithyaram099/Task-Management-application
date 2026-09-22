const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());

const JWT_SECRET = 'securekey123';
const users = [];
const tasks = [];

// Protection Middleware
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access Denied' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Session Expired' });
        req.user = user;
        next();
    });
};

// Security Endpoints
app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    const hashedStr = await bcrypt.hash(password, 10);
    users.push({ email, password: hashedStr });
    res.status(201).json({ message: 'Success' });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const foundUser = users.find(u => u.email === email);
    if (foundUser && await bcrypt.compare(password, foundUser.password)) {
        const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
        return res.json({ token });
    }
    res.status(400).json({ error: 'Auth failed' });
});

// Data Modification Endpoints
app.get('/api/tasks', verifyToken, (req, res) => {
    res.json(tasks.filter(t => t.user === req.user.email));
});

app.post('/api/tasks', verifyToken, (req, res) => {
    const freshTask = { id: Date.now().toString(), title: req.body.title, status: 'Pending', user: req.user.email };
    tasks.push(freshTask);
    res.status(201).json(freshTask);
});

app.put('/api/tasks/:id', verifyToken, (req, res) => {
    const currentTask = tasks.find(t => t.id === req.params.id && t.user === req.user.email);
    if (!currentTask) return res.status(404).json({ error: 'Not found' });
    if (req.body.status) currentTask.status = req.body.status;
    res.json(currentTask);
});

app.delete('/api/tasks/:id', verifyToken, (req, res) => {
    const indexPosition = tasks.findIndex(t => t.id === req.params.id && t.user === req.user.email);
    if (indexPosition === -1) return res.status(404).json({ error: 'Not found' });
    tasks.splice(indexPosition, 1);
    res.json({ status: 'Deleted' });
});

app.listen(3000, () => console.log('Backend active on port 3000'));
      // --- DYNAMIC FRONTEND VIEW DELIVERY ---
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.write('<!DOCTYPE html><html lang="en"><head>');
    res.write('<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">');
    res.write('<title>Task Application</title><script src="https://tailwindcss.com"></script></head>');
    res.write('<body class="bg-slate-100 min-h-screen p-4 flex flex-col items-center">');
    res.write('<div id="authBox" class="bg-white p-6 rounded shadow max-w-sm w-full mt-10">');
    res.write('<h2 class="text-xl font-bold mb-4">Task Sync Portal</h2>');
    res.write('<input id="userEmail" placeholder="Email" class="border p-2 w-full mb-3 rounded">');
    res.write('<input id="userPass" type="password" placeholder="Password" class="border p-2 w-full mb-4 rounded">');
    res.write('<button onclick="runAuth()" class="bg-blue-600 text-white p-2 w-full rounded">Sign In / Register</button></div>');
    res.write('<div id="taskBox" class="hidden max-w-2xl w-full mt-6">');
    res.write('<div class="bg-white p-4 rounded shadow mb-4"><input id="taskInput" placeholder="New Task Title" class="border p-2 w-full mb-2 rounded">');
    res.write('<button onclick="addTask()" class="bg-green-600 text-white p-2 w-full rounded">Add Assignment</button></div>');
    res.write('<div id="listGrid" class="grid gap-3 sm:grid-cols-2"></div></div>');
    res.write('<script>');
    res.write('let sessionToken = "";');
    res.write('async function runAuth() {');
    res.write('  const email = document.getElementById("userEmail").value;');
    res.write('  const password = document.getElementById("userPass").value;');
    res.write('  let res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });');
    res.write('  if (!res.ok) { res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }); alert("Registered! Click button again to sign in."); return; }');
    res.write('  const data = await res.json(); sessionToken = data.token;');
    res.write('  document.getElementById("authBox").classList.add("hidden");');
    res.write('  document.getElementById("taskBox").classList.remove("hidden");');
    res.write('  fetchTasks();');
    res.write('}');
    res.write('async function fetchTasks() {');
    res.write('  const res = await fetch("/api/tasks", { headers: { "Authorization": "Bearer " + sessionToken } });');
    res.write('  const list = await res.json(); const grid = document.getElementById("listGrid"); grid.innerHTML = "";');
    res.write('  list.forEach(t => {');
    res.write('    const div = document.createElement("div"); div.className = "bg-white p-3 rounded shadow border-l-4 " + (t.status === "Done" ? "border-green-500" : "border-amber-500");');
    res.write('    div.innerHTML = `<h3 class="font-bold">${t.title}</h3><p class="text-sm text-gray-500">${t.status}</p><div class="mt-2 flex justify-between"><button class="text-xs text-blue-500" onclick="toggleTask(\'${t.id}\')">Complete</button><button class="text-xs text-red-500" onclick="dropTask(\'${t.id}\')">Delete</button></div>`;');
    res.write('    grid.appendChild(div);');
    res.write('  });');
    res.write('}');
    res.write('async function addTask() {');
    res.write('  const title = document.getElementById("taskInput").value;');
    res.write('  await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + sessionToken }, body: JSON.stringify({ title }) });');
    res.write('  document.getElementById("taskInput").value = ""; fetchTasks();');
    res.write('}');
    res.write('async function toggleTask(id) {');
    res.write('  await fetch("/api/tasks/" + id, { method: "PUT", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + sessionToken }, body: JSON.stringify({ status: "Done" }) });');
    res.write('  fetchTasks();');
    res.write('}');
    res.write('async function dropTask(id) {');
    res.write('  await fetch("/api/tasks/" + id, { method: "DELETE", headers: { "Authorization": "Bearer " + sessionToken } });');
    res.write('  fetchTasks();');
    res.write('}');
    res.write('</script></body></html>');
    res.end();
});
