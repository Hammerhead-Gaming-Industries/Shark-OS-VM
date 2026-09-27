// Global engine state variables (Assigned inside DOMContentLoaded to avoid early loading errors)
let canvas;
let ctx;

// State Machine
let currentLevelIndex = 0;
let gameState = 'MENU'; // MENU, PLAYING, GAMEOVER, WIN
let score = 0;

// Input Registries
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
const touch = { gas: false, brake: false, left: false, right: false };

// Motorcycle Object Configuration
let bike = {
    x: 100, y: 300,
    vx: 0, vy: 0,
    angle: 0, angularVelocity: 0,
    wheelRadius: 16,
    length: 42,
    isGrounded: false,
    rotationAccumulator: 0
};

const PHYSICS = {
    gravity: 0.35,
    acceleration: 0.22,
    braking: 0.15,
    reverse: 0.08,
    friction: 0.985,
    airResistance: 0.99,
    tiltSpeed: 0.007,
    maxSpeed: 11
};

// 10 Progressive Tracks
const levels = [];
function generateLevels() {
    levels.push({
        points: [{x: 0, y: 450}, {x: 600, y: 450}, {x: 900, y: 380}, {x: 1400, y: 450}, {x: 2200, y: 450}],
        hazards: [{x: 1100, type: 'mine'}]
    });
    levels.push({
        points: [{x: 0, y: 450}, {x: 500, y: 450}, {x: 750, y: 320}, {x: 900, y: 550}, {x: 1100, y: 550}, {x: 1350, y: 450}, {x: 2400, y: 450}],
        hazards: [{x: 980, type: 'mine'}]
    });
    levels.push({
        points: [{x: 0, y: 450}, {x: 400, y: 450}, {x: 650, y: 560}, {x: 900, y: 420}, {x: 1200, y: 560}, {x: 1500, y: 400}, {x: 2500, y: 400}],
        hazards: [{x: 650, type: 'mine'}, {x: 1200, type: 'mine'}]
    });
    levels.push({
        points: [{x: 0, y: 450}, {x: 400, y: 450}, {x: 550, y: 280}, {x: 950, y: 280}, {x: 1100, y: 450}, {x: 2500, y: 450}],
        hazards: [{x: 750, type: 'mine'}]
    });
    levels.push({
        points: [{x: 0, y: 500}, {x: 500, y: 500}, {x: 700, y: 400}, {x: 900, y: 400}, {x: 1100, y: 300}, {x: 1400, y: 300}, {x: 1700, y: 200}, {x: 2600, y: 200}],
        hazards: [{x: 1000, type: 'mine'}]
    });
    levels.push({
        points: [{x: 0, y: 450}, {x: 400, y: 450}, {x: 600, y: 340}, {x: 800, y: 450}, {x: 1000, y: 340}, {x: 1200, y: 450}, {x: 1400, y: 340}, {x: 2700, y: 450}],
        hazards: [{x: 800, type: 'mine'}, {x: 1200, type: 'mine'}]
    });
    levels.push({
        points: [{x: 0, y: 450}, {x: 600, y: 450}, {x: 750, y: 320}, {x: 800, y: 700}, {x: 1050, y: 700}, {x: 1150, y: 420}, {x: 2800, y: 420}],
        hazards: [{x: 920, type: 'mine'}]
    });
    levels.push({
        points: [{x: 0, y: 400}, {x: 500, y: 400}, {x: 800, y: 580}, {x: 1200, y: 250}, {x: 1600, y: 550}, {x: 2000, y: 380}, {x: 2900, y: 380}],
        hazards: [{x: 1600, type: 'mine'}]
    });
    levels.push({
        points: [{x: 0, y: 450}, {x: 400, y: 450}, {x: 1800, y: 450}, {x: 3000, y: 450}],
        hazards: [{x: 600, type: 'mine'}, {x: 800, type: 'mine'}, {x: 1000, type: 'mine'}, {x: 1200, type: 'mine'}, {x: 1400, type: 'mine'}]
    });
    levels.push({
        points: [{x: 0, y: 500}, {x: 400, y: 500}, {x: 700, y: 300}, {x: 900, y: 450}, {x: 1200, y: 220}, {x: 1500, y: 500}, {x: 1800, y: 250}, {x: 2100, y: 500}, {x: 3200, y: 500}],
        hazards: [{x: 900, type: 'mine'}, {x: 1500, type: 'mine'}, {x: 2100, type: 'mine'}]
    });
}

function initLevelGrid() {
    const grid = document.getElementById('level-grid');
    if (!grid) return;
    grid.innerHTML = '';
    levels.forEach((lvl, idx) => {
        const b = document.createElement('button');
        b.className = 'lvl-btn';
        b.innerText = idx + 1;
        b.addEventListener('click', () => loadLevel(idx));
        grid.appendChild(b);
    });
}

function getTerrainInfo(absoluteX) {
    const currentLevel = levels[currentLevelIndex];
    const pts = currentLevel.points;
    if (absoluteX <= pts[0].x) return { y: pts[0].y, angle: 0 };
    if (absoluteX >= pts[pts.length - 1].x) return { y: pts[pts.length - 1].y, angle: 0 };

    for (let i = 0; i < pts.length - 1; i++) {
        if (absoluteX >= pts[i].x && absoluteX <= pts[i + 1].x) {
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const trackingRatio = (absoluteX - p1.x) / (p2.x - p1.x);
            return { 
                y: p1.y + trackingRatio * (p2.y - p1.y), 
                angle: Math.atan2(p2.y - p1.y, p2.x - p1.x) 
            };
        }
    }
    return { y: 600, angle: 0 };
}

function loadLevel(idx) {
    currentLevelIndex = idx;
    bike.x = 100;
    bike.y = levels[currentLevelIndex].points[0].y - 50;
    bike.vx = 0; bike.vy = 0; bike.angle = 0; bike.angularVelocity = 0;
    bike.rotationAccumulator = 0; score = 0;
    
    document.getElementById('hud-level').innerText = `Level: ${currentLevelIndex + 1}/10`;
    updateScoreDisplay();
    hideAllScreens();
    gameState = 'PLAYING';
}
function update() {
    if (gameState !== 'PLAYING') return;

    const currentLevel = levels[currentLevelIndex];
    const endPointX = currentLevel.points[currentLevel.points.length - 1].x - 100;

    if (bike.x >= endPointX) {
        gameState = 'WIN';
        document.getElementById('win-msg').innerText = `Finished Track ${currentLevelIndex + 1}! Score: ${score}`;
        document.getElementById('next-lvl-btn').style.display = (currentLevelIndex >= levels.length - 1) ? 'none' : 'block';
        document.getElementById('win-screen').style.display = 'flex';
        return;
    }

    const actionGas = keys.ArrowUp || touch.gas;
    const actionBrake = keys.ArrowDown || touch.brake;
    const actionTiltLeft = keys.ArrowLeft || touch.left;
    const actionTiltRight = keys.ArrowRight || touch.right;

    const backWheelX = bike.x - (bike.length / 2) * Math.cos(bike.angle);
    const frontWheelX = bike.x + (bike.length / 2) * Math.cos(bike.angle);
    const averageGroundY = (getTerrainInfo(backWheelX).y + getTerrainInfo(frontWheelX).y) / 2;
    const localGroundInfo = getTerrainInfo(bike.x);

    bike.vy += PHYSICS.gravity;

    if (bike.y >= averageGroundY - bike.wheelRadius) {
        bike.y = averageGroundY - bike.wheelRadius;
        bike.vy = 0;
        bike.isGrounded = true;

        bike.angle += (localGroundInfo.angle - bike.angle) * 0.25; 
        bike.angularVelocity = 0;

        if (Math.abs(bike.rotationAccumulator) >= Math.PI * 1.8) {
            const flipCount = Math.floor(Math.abs(bike.rotationAccumulator) / (Math.PI * 2));
            if (flipCount > 0) { score += flipCount * 500; updateScoreDisplay(); }
        }
        bike.rotationAccumulator = 0;

        if (actionGas) bike.vx += Math.cos(bike.angle) * PHYSICS.acceleration;
        else if (actionBrake) bike.vx -= Math.cos(bike.angle) * PHYSICS.braking;
        bike.vx *= PHYSICS.friction;
    } else {
        bike.isGrounded = false;
        bike.vx *= PHYSICS.airResistance;

        if (actionTiltLeft) bike.angularVelocity -= PHYSICS.tiltSpeed;
        if (actionTiltRight) bike.angularVelocity += PHYSICS.tiltSpeed;
        
        bike.angle += bike.angularVelocity;
        bike.rotationAccumulator += bike.angularVelocity;
    }

    bike.vx = Math.max(-PHYSICS.maxSpeed / 2, Math.min(PHYSICS.maxSpeed, bike.vx));
    bike.x += bike.vx;
    bike.y += bike.vy;

    if (bike.x < 30) bike.x = 30;

    if (bike.isGrounded && Math.abs(bike.angle - localGroundInfo.angle) > Math.PI / 2.2) {
        triggerGameOver("CRASHED!", "You landed at an unsafe angle!");
        return;
    }

    for (let hazard of currentLevel.hazards) {
        if (Math.hypot(bike.x - hazard.x, bike.y - localGroundInfo.y) < 28) {
            triggerGameOver("EXPLODED!", "You struck an explosive hazard mine!");
            return;
        }
    }
}

function draw() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gameState === 'MENU' || gameState === 'LEVEL_SELECT') return;

    const currentLevel = levels[currentLevelIndex];
    const cameraX = bike.x - canvas.width * 0.25;

    ctx.save();
    ctx.translate(-cameraX, 0);

    // Terrain Rendering
    ctx.beginPath();
    ctx.moveTo(currentLevel.points[0].x, canvas.height);
    for (let pt of currentLevel.points) ctx.lineTo(pt.x, pt.y);
    ctx.lineTo(currentLevel.points[currentLevel.points.length - 1].x, canvas.height);
    ctx.closePath();
    ctx.fillStyle = '#4A3B32'; ctx.fill();

    // Grass Topline
    ctx.beginPath();
    ctx.moveTo(currentLevel.points[0].x, currentLevel.points[0].y);
    for (let pt of currentLevel.points) ctx.lineTo(pt.x, pt.y);
    ctx.strokeStyle = '#228B22'; ctx.lineWidth = 6; ctx.stroke();

    // End Goal Flag
    const endX = currentLevel.points[currentLevel.points.length - 1].x - 100;
    const endY = getTerrainInfo(endX).y;
    ctx.fillStyle = '#000'; ctx.fillRect(endX, endY - 80, 8, 80);
    ctx.fillStyle = '#fff'; ctx.fillRect(endX + 8, endY - 80, 24, 16);
    ctx.fillStyle = '#000'; ctx.font = '10px sans-serif'; ctx.fillText("🏁", endX + 12, endY - 68);

    // Hazard Points
    for (let hazard of currentLevel.hazards) {
        const hY = getTerrainInfo(hazard.x).y;
        ctx.beginPath(); ctx.arc(hazard.x, hY - 6, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#d90429'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
    }

    // Bike Frame and Tires
    ctx.save();
    ctx.translate(bike.x, bike.y);
    ctx.rotate(bike.angle);

    ctx.beginPath(); ctx.arc(-bike.length / 2, 0, bike.wheelRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#333'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();

    ctx.beginPath(); ctx.arc(bike.length / 2, 0, bike.wheelRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#333'; ctx.fill(); ctx.stroke();

    ctx.beginPath(); ctx.moveTo(-bike.length / 2, 0); ctx.lineTo(0, -12); ctx.lineTo(bike.length / 2, 0); ctx.lineTo(4, -20); ctx.closePath();
    ctx.lineWidth = 4; ctx.strokeStyle = '#FF5714'; ctx.stroke();

    ctx.beginPath(); ctx.arc(0, -32, 7, 0, Math.PI * 2); ctx.fillStyle = '#FF9F1C'; ctx.fill();

    ctx.restore();
    ctx.restore();
}

function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
}

function triggerGameOver(title, message) {
    gameState = 'GAMEOVER';
    document.getElementById('gameover-title').innerText = title;
    document.getElementById('gameover-msg').innerText = message;
    document.getElementById('gameover-screen').style.display = 'flex';
}

function updateScoreDisplay() { 
    const el = document.getElementById('hud-status');
    if (el) el.innerText = `Score: ${score}`; 
}

function hideAllScreens() {
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('level-screen').style.display = 'none';
    document.getElementById('gameover-screen').style.display = 'none';
    document.getElementById('win-screen').style.display = 'none';
}
function showMenu() { hideAllScreens(); gameState = 'MENU'; document.getElementById('menu-screen').style.display = 'flex'; }
function showLevelSelect() { hideAllScreens(); gameState = 'LEVEL_SELECT'; document.getElementById('level-screen').style.display = 'flex'; }
function restartLevel() { loadLevel(currentLevelIndex); }
function nextLevel() { if (currentLevelIndex < levels.length - 1) { loadLevel(currentLevelIndex + 1); } else { showMenu(); } }

// Input Handling
window.addEventListener('keydown', e => { if (keys.hasOwnProperty(e.key)) keys[e.key] = true; });
window.addEventListener('keyup', e => { if (keys.hasOwnProperty(e.key)) keys[e.key] = false; });

function bindTouch(elementId, targetField) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.addEventListener('touchstart', (e) => { e.preventDefault(); touch[targetField] = true; }, {passive: false});
    el.addEventListener('touchend', (e) => { e.preventDefault(); touch[targetField] = false; }, {passive: false});
}

function engineLoop() { update(); draw(); requestAnimationFrame(engineLoop); }

// Secure Initialization Loop
document.addEventListener('DOMContentLoaded', () => {
    // Safely assign DOM components *after* they load
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    document.getElementById('btn-show-level-select').addEventListener('click', showLevelSelect);
    document.getElementById('btn-back-to-menu').addEventListener('click', showMenu);
    document.getElementById('btn-retry-level').addEventListener('click', restartLevel);
    document.getElementById('next-lvl-btn').addEventListener('click', nextLevel);

    bindTouch('btn-gas', 'gas'); 
    bindTouch('btn-brake', 'brake');
    bindTouch('btn-tilt-left', 'left'); 
    bindTouch('btn-tilt-right', 'right');

    window.addEventListener('resize', resizeCanvas);
    generateLevels();
    initLevelGrid();
    resizeCanvas();
    engineLoop();
});
