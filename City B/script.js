// ============================================================================
// PART 1: CORE SYSTEMS & DATABASES (Game State, Eras, and Simplified Questions)
// ============================================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const tileSize = 64;
const gridCols = 60; 
const gridRows = 60;

// Viewport Camera Tracking Positions
let camera = { x: 0, y: 0, scale: 1.0 };
let isDragging = false;
let startDragX = 0;
let startDragY = 0;
let currentSelectedBuilding = null;

// Touch Zoom Tracking Values for iPhone Pinch Gestures
let initialTouchDist = null;
let initialScale = 1.0;

let gameState = {
    resources: { gold: 50, food: 20 },
    currentEraIndex: 0,
    techPoints: 0,
    gridImprovements: Array(gridRows).fill(null).map(() => Array(gridCols).fill(null)),
    entities: []
};

const TILES = { PLAINS: 0, VALLEY: 1, MOUNTAIN: 2, RIVER: 3 };

const TILE_PROPERTIES = {
    [TILES.PLAINS]: { color: '#4caf50', name: 'Plains', passes: true },
    [TILES.VALLEY]: { color: '#2e7d32', name: 'Valley', passes: true },
    [TILES.MOUNTAIN]: { color: '#78909c', name: 'Mountain', passes: false },
    [TILES.RIVER]: { color: '#0288d1', name: 'River', passes: false }
};

let mapGrid = Array(gridRows).fill(null).map(() => Array(gridCols).fill(TILES.PLAINS));

const ERAS = [
    { name: "COPPER AGE", req: 5 },
    { name: "BRONZE AGE", req: 10 },
    { name: "IRON AGE", req: 15 },
    { name: "CLASSICAL ANTIQUITY", req: 20 },
    { name: "MEDIEVAL ERA", req: 25 },
    { name: "AGE OF DISCOVERY", req: 30 },
    { name: "INDUSTRIAL REVOLUTION", req: 35 },
    { name: "ATOMIC AGE", req: 40 },
    { name: "DIGITAL INFO AGE", req: 50 }
];

// Relaxed and fun baseline history and general science question banks
const STRATEGIC_QUIZ_BANK = [
    { q: "What tool uses a magnetized needle to show you which way is North?", a: ["Telescope", "Compass", "Sextant", "Sundial"], c: 1 },
    { q: "Which ancient civilization built the grand pyramids of Giza?", a: ["Romans", "Greeks", "Egyptians", "Aztecs"], c: 2 },
    { q: "What gas do humans need to breathe in order to survive?", a: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], c: 0 },
    { q: "How many days does it take for the Earth to orbit all the way around the Sun?", a: ["30 Days", "365 Days", "24 Days", "100 Days"], c: 1 },
    { q: "Which famous inventor or scientist discovered gravity when an apple fell from a tree?", a: ["Albert Einstein", "Isaac Newton", "Nikola Tesla", "Thomas Edison"], c: 1 },
    { q: "Which planet is known as the 'Red Planet' in our solar system?", a: ["Venus", "Jupiter", "Mars", "Saturn"], c: 2 }
];

function initGameSystem() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
            let noise = Math.random();
            if (noise < 0.12) mapGrid[r][c] = TILES.MOUNTAIN;
            else if (noise >= 0.12 && noise < 0.28) mapGrid[r][c] = TILES.VALLEY;
            else if (noise >= 0.28 && noise < 0.34) mapGrid[r][c] = TILES.RIVER;
        }
    }

    gameState.entities = [
        { type: 'farmer', x: 200, y: 200, tx: 200, ty: 200, speed: 0.6 },
        { type: 'miner', x: 240, y: 200, tx: 240, ty: 200, speed: 0.6 },
        { type: 'beast', x: 180, y: 220, tx: 180, ty: 220, speed: 0.4 }
    ];
}
// ============================================================================
// PART 2: VISUAL VECTOR GRAPHICS ENGINE (Custom Hats, Overalls & Skin Colors)
// ============================================================================

function drawSimulation() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, camera.scale);

    for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
            const x = c * tileSize;
            const y = r * tileSize;

            ctx.fillStyle = TILE_PROPERTIES[mapGrid[r][c]].color;
            ctx.fillRect(x, y, tileSize, tileSize);

            ctx.strokeStyle = 'rgba(0,0,0,0.03)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, tileSize, tileSize);

            if (mapGrid[r][c] === TILES.MOUNTAIN) {
                ctx.fillStyle = '#546e7a';
                ctx.beginPath();
                ctx.moveTo(x + 32, y + 16); ctx.lineTo(x + 12, y + 52); ctx.lineTo(x + 52, y + 52);
                ctx.closePath(); ctx.fill();
            } else if (mapGrid[r][c] === TILES.RIVER) {
                ctx.fillStyle = '#0288d1';
                ctx.fillRect(x + 24, y, 16, tileSize);
            }

            const imp = gameState.gridImprovements[r][c];
            if (imp === 'farm') {
                ctx.strokeStyle = '#fbc02d'; ctx.lineWidth = 1.5;
                ctx.strokeRect(x + 16, y + 16, 32, 32);
            } else if (imp === 'mine') {
                ctx.fillStyle = '#37474f'; ctx.fillRect(x + 22, y + 26, 20, 16);
            } else if (imp === 'camp') {
                ctx.fillStyle = '#1b5e20'; ctx.fillRect(x + 20, y + 20, 24, 24);
            }
        }
    }

    gameState.entities.forEach(ent => {
        ctx.save();
        ctx.shadowBlur = 2; ctx.shadowColor = 'rgba(0,0,0,0.5)';

        // Render Head with Tan Skin Tones for all citizens
        if (ent.type !== 'beast') {
            ctx.fillStyle = '#e5c195'; // Premium Tan Skin Color Hex Match
            ctx.beginPath(); 
            ctx.arc(ent.x, ent.y - 4, 1.3, 0, Math.PI * 2); 
            ctx.fill(); 
        }

        if (ent.type === 'farmer') {
            ctx.fillStyle = '#0d47a1'; ctx.fillRect(ent.x - 1.2, ent.y - 2, 2.4, 4.5); // Blue Overalls Base
            ctx.fillStyle = '#ffb74d'; ctx.fillRect(ent.x - 1.2, ent.y - 1, 2.4, 1.3); // Under-Shirt details
        } else if (ent.type === 'miner') {
            ctx.fillStyle = '#4e342e'; ctx.fillRect(ent.x - 1.2, ent.y - 2, 2.4, 4.5); // Clothes
            ctx.fillStyle = '#546e7a'; ctx.fillRect(ent.x - 2, ent.y - 5.5, 4, 1.3); // Dark Gray Miner Cap
        } else if (ent.type === 'soldier') {
            ctx.fillStyle = '#1b5e20'; ctx.fillRect(ent.x - 1.2, ent.y - 2, 2.4, 4.5); // Dark Green Fatigues
        } else if (ent.type === 'beast') {
            ctx.fillStyle = '#4e342e'; ctx.fillRect(ent.x - 2.5, ent.y - 1.2, 5, 2.4); 
            ctx.fillRect(ent.x - 2.5, ent.y + 1.2, 0.8, 1.8); ctx.fillRect(ent.x + 1.7, ent.y + 1.2, 0.8, 1.8); 
        }
        ctx.restore();
    });

    ctx.restore();
}
// ============================================================================
// PART 3: INTERACTIVITY & INPUT HANDLING NETWORK (Clicks, Sliders, and Turns)
// ============================================================================

window.addEventListener('mousedown', (e) => {
    if (e.clientY < 60 || e.clientY > window.innerHeight - 70) return;
    isDragging = true; startDragX = e.clientX - camera.x; startDragY = e.clientY - camera.y;
});

window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    camera.x = e.clientX - startDragX; camera.y = e.clientY - startDragY;
    camera.x = Math.min(0, Math.max(camera.x, -((gridCols * tileSize * camera.scale) - window.innerWidth)));
    camera.y = Math.min(0, Math.max(camera.y, -((gridRows * tileSize * camera.scale) - window.innerHeight)));
});

window.addEventListener('mouseup', () => isDragging = false);

window.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        let touch = e.touches[0];
        if (touch.clientY < 60 || touch.clientY > window.innerHeight - 70) return;
        isDragging = true; startDragX = touch.clientX - camera.x; startDragY = touch.clientY - camera.y;
    } else if (e.touches.length === 2) {
        isDragging = false;
        let dx = e.touches[0].clientX - e.touches[1].clientX;
        let dy = e.touches[0].clientY - e.touches[1].clientY;
        initialTouchDist = Math.sqrt(dx*dx + dy*dy);
        initialScale = camera.scale;
    }
});

window.addEventListener('touchmove', (e) => {
    if (isDragging && e.touches.length === 1) {
        let touch = e.touches[0];
        camera.x = touch.clientX - startDragX; camera.y = touch.clientY - startDragY;
    } else if (e.touches.length === 2 && initialTouchDist) {
        let dx = e.touches[0].clientX - e.touches[1].clientX;
        let dy = e.touches[0].clientY - e.touches[1].clientY;
        let dist = Math.sqrt(dx*dx + dy*dy);
        
        camera.scale = initialScale * (dist / initialTouchDist);
        camera.scale = Math.min(2.5, Math.max(0.4, camera.scale));
    }
    camera.x = Math.min(0, Math.max(camera.x, -((gridCols * tileSize * camera.scale) - window.innerWidth)));
    camera.y = Math.min(0, Math.max(camera.y, -((gridRows * tileSize * camera.scale) - window.innerHeight)));
});

window.addEventListener('touchend', () => { isDragging = false; initialTouchDist = null; });

function parseInputCoordinates(clientX, clientY) {
    const worldX = (clientX - camera.x) / camera.scale; 
    const worldY = (clientY - camera.y) / camera.scale;
    const c = Math.floor(worldX / tileSize); const r = Math.floor(worldY / tileSize);

    if (r >= 0 && r < gridRows && c >= 0 && c < gridCols) {
        const terrain = mapGrid[r][c];
        if (currentSelectedBuilding && gameState.gridImprovements[r][c] === null) {
            if (currentSelectedBuilding === 'farm' && gameState.resources.gold >= 15 && TILE_PROPERTIES[terrain].passes) {
                gameState.resources.gold -= 15; gameState.gridImprovements[r][c] = 'farm';
                gameState.entities.push({ type: 'farmer', x: worldX, y: worldY, tx: worldX, ty: worldY, speed: 0.6 });
            } else if (currentSelectedBuilding === 'mine' && gameState.resources.gold >= 30 && terrain === TILES.MOUNTAIN) {
                gameState.resources.gold -= 30; gameState.gridImprovements[r][c] = 'mine';
                gameState.entities.push({ type: 'miner', x: worldX, y: worldY, tx: worldX, ty: worldY, speed: 0.6 });
            } else if (currentSelectedBuilding === 'camp' && gameState.resources.gold >= 40 && TILE_PROPERTIES[terrain].passes) {
                gameState.resources.gold -= 40; gameState.gridImprovements[r][c] = 'camp';
                gameState.entities.push({ type: 'soldier', x: worldX, y: worldY, tx: worldX, ty: worldY, speed: 0.7 });
            }
            updateHUDText();
        }
    }
}

canvas.addEventListener('click', (e) => { if(!isDragging) parseInputCoordinates(e.clientX, e.clientY); });

document.getElementById('save-btn').addEventListener('click', () => {
    const bundleData = JSON.stringify({ gameState, mapGrid });
    const blob = new Blob([bundleData], { type: "application/json" });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `civ_save_${ERAS[gameState.currentEraIndex].name.toLowerCase().replace(/ /g, "_")}.json`;
    anchor.click();
});

document.getElementById('load-file-input').addEventListener('change', (e) => {
    const reader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;
    reader.onload = (event) => {
        const parsed = JSON.parse(event.target.result);
        if (parsed.gameState && parsed.mapGrid) {
            gameState = parsed.gameState; mapGrid = parsed.mapGrid;
            updateHUDText();
        }
    };
    reader.readAsText(files[0]);
});

document.getElementById('research-trigger').addEventListener('click', () => {
    const randomQuestion = STRATEGIC_QUIZ_BANK[Math.floor(Math.random() * STRATEGIC_QUIZ_BANK.length)];
    document.getElementById('quiz-question').innerText = randomQuestion.q;
    const opts = document.getElementById('quiz-options'); opts.innerHTML = '';
    
    randomQuestion.a.forEach((opt, index) => {
        const btn = document.createElement('button'); btn.className = 'quiz-option'; btn.innerText = opt;
        btn.onclick = () => {
            document.getElementById('quiz-overlay').classList.add('hidden');
            if (index === randomQuestion.c) {
                alert("CORRECT! Research points acquired.");
                gameState.techPoints++;
                const currentEraRequirement = ERAS[gameState.currentEraIndex].req;
                if (gameState.techPoints >= currentEraRequirement) {
                    gameState.techPoints = 0; gameState.currentEraIndex++;
                    if (gameState.currentEraIndex >= ERAS.length) {
                        document.getElementById('win-screen').classList.remove('hidden');
                        return;
                    }
                }
            } else {
                alert("INCORRECT. Sync interrupted. Try again on the next turn cycle window.");
            }
            updateHUDText();
        };
        opts.appendChild(btn);
    });
    document.getElementById('quiz-overlay').classList.remove('hidden');
});

function updateHUDText() {
    const eraMeta = ERAS[gameState.currentEraIndex] || { name: "MAX", req: 999 };
    document.getElementById('era-val').innerText = eraMeta.name;
    document.getElementById('gold-val').innerText = gameState.resources.gold;
    document.getElementById('food-val').innerText = gameState.resources.food;
    document.getElementById('pop-val').innerText = gameState.entities.length;
    document.getElementById('tech-progress').innerText = `${gameState.techPoints}/${eraMeta.req}`;
}

document.querySelectorAll('.build-menu .build-btn, #build-menu .build-btn').forEach(btn => {
    if (btn.id === 'research-trigger') return;
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.build-btn').forEach(b => b.classList.remove('active'));
        const type = e.target.getAttribute('data-type');
        if (currentSelectedBuilding === type) { currentSelectedBuilding = null; } 
        else { currentSelectedBuilding = type; e.target.classList.add('active'); }
    });
});

setInterval(() => {
    for(let r=0; r<gridRows; r++) {
        for(let c=0; c<gridCols; c++) {
            const imp = gameState.gridImprovements[r][c];
            if(imp === 'farm') gameState.resources.food += 1;
            if(imp === 'mine') gameState.resources.gold += 2;
            if(imp === 'camp') { gameState.resources.gold += 1; }
        }
    }
    updateHUDText();
}, 5000);

function runtimeEngine() {
    gameState.entities.forEach(ent => {
        let destinations = [];
        for (let r = 0; r < gridRows; r++) {
            for (let c = 0; c < gridCols; c++) {
                const imp = gameState.gridImprovements[r][c];
                if (imp !== null) {
                    if (ent.type === 'miner' && imp === 'mine') destinations.push({c, r});
                    else if (ent.type === 'farmer' && imp === 'farm') destinations.push({c, r});
                    else if (ent.type === 'soldier' && imp === 'camp') destinations.push({c, r});
                    else if (ent.type === 'beast' && (imp === 'farm' || imp === 'camp')) destinations.push({c, r});
                }
            }
        }

        if (destinations.length > 0) {
            const currentDestX = ent.tx; const currentDestY = ent.ty;
            const distanceThreshold = Math.abs(ent.x - currentDestX) + Math.abs(ent.y - currentDestY);
            
            if (distanceThreshold < 5) {
                let picked = destinations[Math.floor(Math.random() * destinations.length)];
                ent.tx = picked.c * tileSize + tileSize / 2; ent.ty = picked.r * tileSize + tileSize / 2;
            }
            
            let dx = ent.tx - ent.x; let dy = ent.ty - ent.y;
            let stepDist = Math.sqrt(dx*dx + dy*dy);
            if (stepDist > 1) { ent.x += (dx / stepDist) * ent.speed; ent.y += (dy / stepDist) * ent.speed; }
        }
    });

    drawSimulation();
    requestAnimationFrame(runtimeEngine);
}

window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
initGameSystem();
updateHUDText();
runtimeEngine();
