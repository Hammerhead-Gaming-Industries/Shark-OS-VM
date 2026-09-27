const appData = {
    terminal: { title: 'Shark Shell v1.0', src: 'Terminal/index.html', label: 'Terminal' },
    settings: { title: 'Settings', src: 'settings.html', label: 'Settings' },
    music: { title: 'Music Library', src: 'Music Library/index.html', label: 'Music Library' },
    bunker11: { title: 'Project Bunker 11', src: 'Project Bunker 11/index.html', label: 'Project Bunker 11' },
    bunker12: { title: 'Project Bunker 12', src: 'Project Bunker 12/index.html', label: 'Project Bunker 12' },
    browser: { title: 'Browser', src: 'browser.html', label: 'Shark Browser' }
};

let activeWindows = {};
let windowZIndex = 21;
let editModeActive = false;
const appsList = ['terminal', 'settings', 'music', 'bunker11', 'bunker12', 'browser'];

function applyRealtimeSettings() {
    const root = document.documentElement;
    const desktopBg = localStorage.getItem('cfg_desktop_bg') || 'Images/default_background.jpeg';
    const mobileBg = localStorage.getItem('cfg_mobile_bg') || 'Images/default_background.jpeg';
    
    root.style.setProperty('--desktop-bg', `url('${desktopBg}')`);
    root.style.setProperty('--mobile-bg', `url('${mobileBg}')`);
}

function updateClock() {
    const now = new Date();
    const use24Hour = localStorage.getItem('cfg_use_24hour') === 'true';
    
    let hours = now.getHours();
    let ampm = '';
    
    if (!use24Hour) {
        ampm = hours >= 12 ? ' PM' : ' AM';
        hours = hours % 12;
        hours = hours ? hours : 12; 
    }
    
    const displayHours = String(hours).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();
    
    document.getElementById('clock').innerHTML = `${displayHours}:${minutes}${ampm}<br>${month}/${day}/${year}`;
}

function renderDesktopShortcuts() {
    const container = document.getElementById('apps-container');
    container.innerHTML = '';
    
    appsList.forEach((appId, index) => {
        if (!appData[appId]) return;
        
        const shortcut = document.createElement('div');
        shortcut.className = 'shortcut';
        shortcut.setAttribute('data-app', appId);
        shortcut.style.position = 'absolute';
        
        if (editModeActive) {
            shortcut.classList.add('edit-mode');
        }
        
        const savedPos = localStorage.getItem(`cfg_pos_${appId}`);
        if (savedPos) {
            const pos = JSON.parse(savedPos);
            shortcut.style.left = pos.left;
            shortcut.style.top = pos.top;
        } else {
            shortcut.style.left = '20px';
            shortcut.style.top = `${20 + (index * 85)}px`;
        }
        
        shortcut.addEventListener('mousedown', (e) => startShortcutDrag(e, shortcut, appId));
        shortcut.addEventListener('touchstart', (e) => startShortcutDrag(e, shortcut, appId), { passive: false });
        
        shortcut.innerHTML = `
            <div class="icon"></div>
            <div class="label">${appData[appId].label}</div>
        `;
        container.appendChild(shortcut);
    });
}

function toggleEditMode() {
    editModeActive = !editModeActive;
    const brand = document.querySelector('.taskbar-brand');
    
    if (editModeActive) {
        brand.classList.add('editing');
    } else {
        brand.classList.remove('editing');
    }
    
    renderDesktopShortcuts();
}
function startShortcutDrag(e, element, appId) {
    let isMoving = false;
    let clickTime = new Date().getTime();
    
    let clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    let clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    
    let rect = element.getBoundingClientRect();
    let shiftX = clientX - rect.left;
    let shiftY = clientY - rect.top;

    function moveAt(cX, cY) {
        if (!editModeActive) return;
        let desktopRect = document.getElementById('desktop').getBoundingClientRect();
        let leftX = cX - shiftX;
        let topY = cY - shiftY;
        
        if (leftX < 0) leftX = 0;
        if (topY < 0) topY = 0;
        if (leftX > desktopRect.width - rect.width) leftX = desktopRect.width - rect.width;
        if (topY > desktopRect.height - rect.height) topY = desktopRect.height - rect.height;

        element.style.left = leftX + 'px';
        element.style.top = topY + 'px';
    }

    function onMouseMove(event) {
        if (!editModeActive) return;
        if (event.cancelable) event.preventDefault();
        isMoving = true;
        let currentX = event.type === 'touchmove' ? event.touches[0].clientX : event.clientX;
        let currentY = event.type === 'touchmove' ? event.touches[0].clientY : event.clientY;
        moveAt(currentX, currentY);
    }

    function stopDragAction() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', stopDragAction);
        document.removeEventListener('touchmove', onMouseMove);
        document.removeEventListener('touchend', stopDragAction);
        
        let endTime = new Date().getTime();
        
        if (!isMoving && (endTime - clickTime < 300)) {
            openWindow(appId);
        } else if (isMoving && editModeActive) {
            const positionData = {
                left: element.style.left,
                top: element.style.top
            };
            localStorage.setItem(`cfg_pos_${appId}`, JSON.stringify(positionData));
        }
    }

    if (e.type === 'touchstart') {
        document.addEventListener('touchmove', onMouseMove, { passive: false });
        document.addEventListener('touchend', stopDragAction, { passive: false });
    } else {
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', stopDragAction);
    }
}

function openWindow(appId) {
    if (activeWindows[appId]) {
        focusWindow(appId);
        return;
    }

    const win = document.createElement('div');
    win.id = `win-${appId}`;
    win.className = 'window';
    win.style.left = `${100 + (Object.keys(activeWindows).length * 25)}px`;
    win.style.top = `${100 + (Object.keys(activeWindows).length * 25)}px`;
    win.style.zIndex = windowZIndex++;

    const forceFullscreen = localStorage.getItem('cfg_force_fullscreen') === 'true';
    if (forceFullscreen) {
        win.classList.add('fullscreen');
    }

    win.innerHTML = `
        <div class="window-header" onmousedown="startDrag(event, '${appId}')" ontouchstart="startDrag(event, '${appId}')">
            <span class="window-title">${appData[appId].title}</span>
            <div class="window-controls">
                <button class="window-fullscreen" onclick="toggleFullscreen('${appId}')"></button>
                <button class="window-close" onclick="closeWindow('${appId}')"></button>
            </div>
        </div>
        <iframe src="${appData[appId].src}" class="window-iframe"></iframe>
    `;

    document.getElementById('window-layer').appendChild(win);
    activeWindows[appId] = win;
    
    win.addEventListener('mousedown', () => focusWindow(appId));
    win.addEventListener('touchstart', () => focusWindow(appId));

    const icon = document.getElementById(`tb-${appId}`);
    if (icon) {
        icon.classList.add('active');
    }
}

function closeWindow(appId) {
    if (activeWindows[appId]) {
        activeWindows[appId].remove();
        delete activeWindows[appId];
        
        const icon = document.getElementById(`tb-${appId}`);
        if (icon) {
            if (appId !== 'terminal' && appId !== 'settings') {
                icon.remove();
            } else {
                icon.classList.remove('active');
            }
        }
    }
}

function toggleFullscreen(appId) {
    if (activeWindows[appId]) {
        activeWindows[appId].classList.toggle('fullscreen');
        focusWindow(appId);
    }
}

function focusWindow(appId) {
    if (activeWindows[appId]) {
        windowZIndex++;
        activeWindows[appId].style.zIndex = windowZIndex;
    }
}

function addToTaskbar(appId) {
    if (document.getElementById(`tb-${appId}`)) return;
    
    const icon = document.createElement('div');
    icon.id = `tb-${appId}`;
    icon.className = 'taskbar-icon';
    icon.onclick = () => {
        if (activeWindows[appId]) {
            focusWindow(appId);
        } else {
            openWindow(appId);
        }
    };
    document.getElementById('taskbar-apps').appendChild(icon);
}

function initPersistentTaskbar() {
    addToTaskbar('terminal');
    addToTaskbar('settings');
    
    const brand = document.querySelector('.taskbar-brand');
    if (brand) {
        brand.style.cursor = 'pointer';
        brand.onclick = toggleEditMode;
    }
}

function startDrag(e, appId) {
    const win = activeWindows[appId];
    if (win.classList.contains('fullscreen')) return;
    
    focusWindow(appId);
    
    let clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    let clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    
    let shiftX = clientX - win.getBoundingClientRect().left;
    let shiftY = clientY - win.getBoundingClientRect().top;

    const iframes = win.querySelectorAll('iframe');
    iframes.forEach(iframe => iframe.style.pointerEvents = 'none');

    function moveAt(cX, cY) {
        win.style.left = cX - shiftX + 'px';
        win.style.top = cY - shiftY + 'px';
    }

    function onMouseMove(event) {
        let currentX = event.type === 'touchmove' ? event.touches[0].clientX : event.clientX;
        let currentY = event.type === 'touchmove' ? event.touches[0].clientY : event.clientY;
        moveAt(currentX, currentY);
    }

    function stopDragAction() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', stopDragAction);
        document.removeEventListener('touchmove', onMouseMove);
        document.removeEventListener('touchend', stopDragAction);
        iframes.forEach(iframe => iframe.style.pointerEvents = 'auto');
    }

    if (e.type === 'touchstart') {
        document.addEventListener('touchmove', onMouseMove, { passive: false });
        document.addEventListener('touchend', stopDragAction, { once: true });
    } else {
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', stopDragAction, { once: true });
    }
}

window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SHARK_OS_SETTINGS_CHANGED') {
        applyRealtimeSettings();
        updateClock();
    }
});

setInterval(updateClock, 1000);
renderDesktopShortcuts();
initPersistentTaskbar();
applyRealtimeSettings();
updateClock();
