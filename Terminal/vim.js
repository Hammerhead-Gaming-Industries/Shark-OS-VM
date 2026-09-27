let vimState = {
    fileName: "",
    content: "",
    mode: "NORMAL",
    commandBuffer: ""
};

// Listen for the initial content handshake initialization stream from the terminal window frame
window.addEventListener("message", function(event) {
    if (event.data && event.data.type === "VIM_OPEN") {
        vimState.fileName = event.data.fileName;
        vimState.content = event.data.content;
        vimState.mode = "NORMAL";
        vimState.commandBuffer = "";
        
        initializeVimSession();
    }
});

function initializeVimSession() {
    const hiddenInput = document.getElementById('vim-mobile-input-proxy');
    const viewport = document.getElementById('vim-viewport');
    
    renderVim();
    hiddenInput.focus();

    const forceFocus = () => hiddenInput.focus();
    viewport.addEventListener('click', forceFocus);
    viewport.addEventListener('touchstart', forceFocus);

    window.addEventListener('keydown', (e) => {
        if (!vimState) return;

        if (vimState.mode === "NORMAL") {
            if (e.key === "i" || e.key === "I") {
                e.preventDefault();
                vimState.mode = "INSERT";
            } else if (e.key === ":") {
                e.preventDefault();
                vimState.mode = "COMMAND";
                vimState.commandBuffer = ":";
            }
        } else if (vimState.mode === "INSERT") {
            if (e.key === "Escape") {
                e.preventDefault();
                vimState.mode = "NORMAL";
            } else if (e.key === "Backspace") {
                e.preventDefault();
                vimState.content = vimState.content.slice(0, -1);
            } else if (e.key === "Enter") {
                e.preventDefault();
                vimState.content += "\n";
            } else if (e.key.length === 1) {
                e.preventDefault();
                vimState.content += e.key;
            }
        } else if (vimState.mode === "COMMAND") {
            if (e.key === "Escape") {
                e.preventDefault();
                vimState.mode = "NORMAL";
                vimState.commandBuffer = "";
            } else if (e.key === "Backspace") {
                e.preventDefault();
                vimState.commandBuffer = vimState.commandBuffer.slice(0, -1);
                if (vimState.commandBuffer === "") vimState.mode = "NORMAL";
            } else if (e.key === "Enter") {
                e.preventDefault();
                processVimCommand(vimState.commandBuffer);
            } else if (e.key.length === 1) {
                e.preventDefault();
                vimState.commandBuffer += e.key;
            }
        }
        renderVim();
    });
}

function renderVim() {
    const display = document.getElementById('text-display');
    const status = document.getElementById('status-bar');
    
    // Inject custom virtual blinking cursor wrapper block dynamically based on user focus mode
    let visibleTextContent = vimState.content;
    
    if (vimState.mode === "INSERT") {
        // Appends a blinking block trailing space element simulating real typewriter cursors
        visibleTextContent += '<span class="vim-cursor">&nbsp;</span>';
    }

    const lines = visibleTextContent.split("\n");
    let htmlContent = lines.map(line => `<span>${line}</span>`).join("\n");
    
    const tildeLines = 12 - lines.length;
    for (let i = 0; i < tildeLines; i++) {
        htmlContent += "\n<span class='vim-tilde'>~</span>";
    }
    
    display.innerHTML = htmlContent;
    
    if (vimState.mode === "NORMAL") {
        // Normal mode blinks the cursor over the mode identifier segment block natively
        status.innerHTML = `"${vimState.fileName}" ${vimState.content.split("\n").length}L <span class="vim-cursor">--NORMAL--</span>`;
    } else if (vimState.mode === "INSERT") {
        status.innerHTML = `-- INSERT --`;
    } else if (vimState.mode === "COMMAND") {
        status.innerHTML = `${vimState.commandBuffer}<span class="vim-cursor">&nbsp;</span>`;
    }
}

window.simulateVimKey = function(keyName) {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: keyName }));
    document.getElementById('vim-mobile-input-proxy').focus();
};

function processVimCommand(cmd) {
    cmd = cmd.trim();
    if (cmd === ":q") {
        window.parent.postMessage({ type: "VIM_EXIT" }, "*");
    } else if (cmd === ":w") {
        window.parent.postMessage({ type: "VIM_SAVE", content: vimState.content }, "*");
        vimState.mode = "NORMAL";
        vimState.commandBuffer = "";
    } else if (cmd === ":wq") {
        window.parent.postMessage({ type: "VIM_SAVE", content: vimState.content }, "*");
        window.parent.postMessage({ type: "VIM_EXIT" }, "*");
    } else {
        vimState.mode = "NORMAL";
        vimState.commandBuffer = "";
    }
}
