/** PACMAN GAME LOGIC **/
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const statusOverlay = document.getElementById('status-overlay');
const readyContent = document.getElementById('ready-content');
const gameOverContent = document.getElementById('game-over-content');
const statusText = document.getElementById('status-text');
const restartBtn = document.getElementById('restart-btn');

const TILE_SIZE = 20;
const PACMAN_SPEED = 2; 
const GHOST_SPEED = 1.5; 
let score = 0;
let gameOver = false;
let gameWon = false;
let gameStarted = false;
let animationFrame = 0;
let lastTime = 0;
const FPS = 60;
const interval = 1000 / FPS;

const map = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,3,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,3,1],
    [1,0,1,1,1,0,1,1,1,1,1,0,0,1,1,0,0,1,1,1,1,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,1,1,1,1,0,0,1,1,0,0,1,1,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,1],
    [1,0,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0,0,1],
    [1,1,1,1,1,0,1,1,1,1,1,0,0,1,1,0,0,1,1,1,1,1,0,1,1,1,1,1],
    [1,1,1,1,1,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,1,0,1,2,2,2,2,2,2,2,2,1,0,1,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,1,0,1,2,2,2,2,2,2,2,2,1,0,1,1,0,1,1,1,0,1],
    [1,0,0,0,3,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,0,3,0,0,0,1],
    [1,0,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,0,1],
    [1,3,0,0,0,0,0,0,0,1,1,1,1,0,0,1,1,1,1,0,0,0,0,0,0,0,3,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

let pacman = { x: TILE_SIZE, y: TILE_SIZE, dir: {x:0, y:0}, nextDir: {x:0, y:0} };

let ghosts = [
    { name: "Blinky", x: TILE_SIZE*26, y: TILE_SIZE*1, dir: {x:-1, y:0}, color: '#ff6a13', isFrightened: false, isDead: false, timer: 0 },
    { name: "Pinky",  x: TILE_SIZE*1, y: TILE_SIZE*14, dir: {x:1, y:0}, color: '#e3d0ff', isFrightened: false, isDead: false, timer: 0 },
    { name: "Inky",   x: TILE_SIZE*26, y: TILE_SIZE*14, dir: {x:0, y:-1}, color: '#4a9bff', isFrightened: false, isDead: false, timer: 0 },
    { name: "Clyde",  x: TILE_SIZE*13, y: TILE_SIZE*9, dir: {x:0, y:1}, color: '#4fdc9a', isFrightened: false, isDead: false, timer: 0 },
    { name: "Bashful",x: TILE_SIZE*1, y: TILE_SIZE*6, dir: {x:1, y:0}, color: '#7b61ff', isFrightened: false, isDead: false, timer: 0 },
    { name: "Speedy", x: TILE_SIZE*26, y: TILE_SIZE*6, dir: {x:-1, y:0}, color: '#f7f7f5', isFrightened: false, isDead: false, timer: 0 }
];

function goToRandomGame() {
    window.location.href = "index2.html";
}

restartBtn.addEventListener('click', () => location.reload());

window.addEventListener('keydown', (e) => {
    if (!gameStarted && e.key.includes("Arrow")) { 
        gameStarted = true; 
        statusOverlay.style.display = 'none'; 
        requestAnimationFrame(mainLoop); 
    }
    const keys = { ArrowUp: {x:0,y:-1}, ArrowDown: {x:0,y:1}, ArrowLeft: {x:-1,y:0}, ArrowRight: {x:1,y:0} };
    if (keys[e.key]) {
        pacman.nextDir = keys[e.key];
        if (pacman.nextDir.x === -pacman.dir.x && pacman.nextDir.y === -pacman.dir.y) {
            pacman.dir = pacman.nextDir;
        }
    }
});

function isWall(px, py) {
    let col = Math.floor(px / TILE_SIZE);
    let row = Math.floor(py / TILE_SIZE);
    if (row < 0 || row >= map.length || col < 0 || col >= map[0].length) return true;
    return map[row][col] === 1;
}

function getBestDir(ghost, targetX, targetY, flee = false) {
    const dirs = [{x:1,y:0}, {x:-1,y:0}, {x:0,y:1}, {x:0,y:-1}];
    let validDirs = dirs.filter(d => !isWall(ghost.x + d.x * TILE_SIZE, ghost.y + d.y * TILE_SIZE));
    if (validDirs.length > 1) {
        validDirs = validDirs.filter(d => !(d.x === -ghost.dir.x && d.y === -ghost.dir.y));
    }
    return validDirs.sort((a, b) => {
        let distA = Math.hypot((ghost.x + a.x * TILE_SIZE) - targetX, (ghost.y + a.y * TILE_SIZE) - targetY);
        let distB = Math.hypot((ghost.x + b.x * TILE_SIZE) - targetX, (ghost.y + b.y * TILE_SIZE) - targetY);
        return flee ? distB - distA : distA - distB;
    })[0] || ghost.dir;
}

function moveEntity(e, isAI = false) {
    if (e.isDead) return;
    const speed = isAI ? GHOST_SPEED : PACMAN_SPEED;
    if (Math.abs(e.x % TILE_SIZE) < speed && Math.abs(e.y % TILE_SIZE) < speed) {
        const snapX = Math.round(e.x / TILE_SIZE) * TILE_SIZE;
        const snapY = Math.round(e.y / TILE_SIZE) * TILE_SIZE;
        if (isAI) {
            e.x = snapX; e.y = snapY;
            let tx = pacman.x, ty = pacman.y;
            if (!e.isFrightened) {
                if (e.name === "Pinky") { tx += pacman.dir.x * TILE_SIZE * 4; ty += pacman.dir.y * TILE_SIZE * 4; }
                else if (e.name === "Inky") { tx = (560 - pacman.x); ty = (320 - pacman.y); }
                else if (e.name === "Bashful") { tx = pacman.x; ty = 0; }
                else if (e.name === "Speedy") { tx = 560; ty = pacman.y; }
            }
            e.dir = getBestDir(e, tx, ty, e.isFrightened);
        } else {
            if (!isWall(snapX + e.nextDir.x * TILE_SIZE, snapY + e.nextDir.y * TILE_SIZE)) {
                e.x = snapX; e.y = snapY;
                e.dir = e.nextDir;
            }
        }
    }
    let nextX = e.x + e.dir.x * speed;
    let nextY = e.y + e.dir.y * speed;
    if (!isWall(nextX, nextY) && !isWall(nextX + TILE_SIZE - 1, nextY + TILE_SIZE - 1)) {
        e.x = nextX; e.y = nextY;
    } else {
        e.x = Math.round(e.x / TILE_SIZE) * TILE_SIZE;
        e.y = Math.round(e.y / TILE_SIZE) * TILE_SIZE;
        if (isAI) e.dir = getBestDir(e, pacman.x, pacman.y, e.isFrightened);
        else e.dir = {x:0, y:0};
    }
}

function mainLoop(timestamp) {
    if (gameOver) {
        statusOverlay.style.display = 'block';
        readyContent.style.display = 'none';
        gameOverContent.style.display = 'block';
        return;
    }
    const delta = timestamp - lastTime;
    if (delta >= interval) {
        lastTime = timestamp - (delta % interval);
        animationFrame++;
        moveEntity(pacman);
        ghosts.forEach(g => moveEntity(g, true));
        let pC = Math.floor((pacman.x+10)/20), pR = Math.floor((pacman.y+10)/20);
        if (map[pR] && map[pR][pC] === 0) { map[pR][pC] = 2; score += 10; }
        if (map[pR] && map[pR][pC] === 3) { 
            map[pR][pC] = 2; score += 50; 
            ghosts.forEach(g => { if(!g.isDead) { g.isFrightened = true; g.timer = 480; } });
        }
        let dotsRemaining = 0;
        map.forEach(row => row.forEach(cell => { if(cell === 0 || cell === 3) dotsRemaining++; }));
        if (dotsRemaining === 0) {
            gameWon = true; gameOver = true;
            statusText.innerText = "BOARD CLEARED!";
            statusText.style.color = "#4fdc9a";
        }
        ghosts.forEach(g => {
            if (g.isDead) return;
            if (g.timer > 0) { g.timer--; if (g.timer === 0) g.isFrightened = false; }
            if (Math.hypot(pacman.x - g.x, pacman.y - g.y) < 14) {
                if (g.isFrightened) { 
                    g.isDead = true; score += 500; 
                    if (ghosts.every(gh => gh.isDead)) {
                        gameWon = true; gameOver = true;
                        statusText.innerText = "GHOST HUNTER!";
                        statusText.style.color = "#ffd23f";
                    }
                } else { gameOver = true; }
            }
        });
        scoreElement.innerText = score.toString().padStart(4, '0');
        ctx.fillStyle = "#0b1424"; ctx.fillRect(0,0,canvas.width,canvas.height);
        map.forEach((row, r) => row.forEach((cell, c) => {
            if (cell === 1) { ctx.strokeStyle = "#4a9bff"; ctx.lineWidth = 2; ctx.strokeRect(c*20+2, r*20+2, 16, 16); }
            if (cell === 0) { ctx.fillStyle = "#f7f7f5"; ctx.beginPath(); ctx.arc(c*20+10, r*20+10, 2, 0, 7); ctx.fill(); }
            if (cell === 3) { ctx.fillStyle = "#ff6a13"; ctx.beginPath(); ctx.arc(c*20+10, r*20+10, 6, 0, 7); ctx.fill(); }
        }));
        drawPacman();
        ghosts.forEach(drawGhost);
    }
    requestAnimationFrame(mainLoop);
}

function drawPacman() {
    let mouth = 0.2 + Math.abs(Math.sin(animationFrame * 0.2)) * 0.4;
    ctx.save();
    ctx.translate(pacman.x + 10, pacman.y + 10);
    let angle = 0;
    if (pacman.dir.x === -1) angle = Math.PI;
    else if (pacman.dir.y === 1) angle = Math.PI / 2;
    else if (pacman.dir.y === -1) angle = -Math.PI / 2;
    else if (pacman.nextDir.x === -1) angle = Math.PI;
    else if (pacman.nextDir.y === 1) angle = Math.PI / 2;
    else if (pacman.nextDir.y === -1) angle = -Math.PI / 2;
    ctx.rotate(angle);
    ctx.fillStyle = "#ffd23f"; ctx.beginPath();
    ctx.moveTo(0, 0); ctx.arc(0, 0, 9, mouth, 2 * Math.PI - mouth);
    ctx.fill(); ctx.restore();
}

function drawGhost(g) {
    if (g.isDead) return;
    let isFlashing = g.timer < 120 && Math.floor(animationFrame / 5) % 2 === 0;
    ctx.fillStyle = g.isFrightened ? (isFlashing ? "#f7f7f5" : "#5a6fb8") : g.color;
    ctx.beginPath(); ctx.arc(g.x + 10, g.y + 10, 9, Math.PI, 0);
    ctx.lineTo(g.x + 19, g.y + 19); ctx.lineTo(g.x + 1, g.y + 19); ctx.fill();
    ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(g.x+6, g.y+8, 3, 0, 7); ctx.arc(g.x+14, g.y+8, 3, 0, 7); ctx.fill();
    ctx.fillStyle = "#0b1424"; ctx.beginPath(); ctx.arc(g.x+6+(g.dir.x*2), g.y+8+(g.dir.y*2), 1.5, 0, 7); 
    ctx.arc(g.x+14+(g.dir.x*2), g.y+8+(g.dir.y*2), 1.5, 0, 7); ctx.fill();
}