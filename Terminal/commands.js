// Local Storage system state persistence keys
const STORAGE_FS_KEY = "terminal_virtual_fs";
const STORAGE_DIR_KEY = "terminal_current_dir";

// Track session uptime and command history runtime arrays
const sessionStartTime = Date.now();
const commandHistory = [];

const defaultFilesystem = {
    "/": { type: "directory", contents: ["home", "notes.txt", ".hidden_config"] },
    "/notes.txt": { type: "file", content: "This is a basic text note at root." },
    "/.hidden_config": { type: "file", content: "dark_mode=true\nshow_hints=false" },
    "/home": { type: "directory", contents: ["user"] },
    "/home/user": { type: "directory", contents: ["Desktop", "Documents", "Downloads", ".bashrc", ".secret_note"] },
    "/home/user/.bashrc": { type: "file", content: "alias ll='ls -la'\nalias vi='vim'" },
	"/home/user/.secret_note": { type: "file", content: "This is a hidden file." },
    "/home/user/Desktop": { type: "directory", contents: [] },
    "/home/user/Documents": { type: "directory", contents: [] },
    "/home/user/Downloads": { type: "directory", contents: [] }
};

let currentDirectory = "/home/user";
let virtualFilesystem = defaultFilesystem;

try {
    const savedFs = localStorage.getItem(STORAGE_FS_KEY);
    if (savedFs) {
        virtualFilesystem = JSON.parse(savedFs);
    }
} catch (e) {
    console.error("Failed to parse filesystem from LocalStorage", e);
}

function saveState() {
    localStorage.setItem(STORAGE_FS_KEY, JSON.stringify(virtualFilesystem));
    localStorage.setItem(STORAGE_DIR_KEY, currentDirectory);
}
// Trigger screen destruction screen overlay
function triggerSystemDestruction() {
    // Purge states completely
    virtualFilesystem = {};
    currentDirectory = "/";
    localStorage.removeItem(STORAGE_FS_KEY);
    localStorage.removeItem(STORAGE_DIR_KEY);

    // Create and attach the warning screen layout overlay
    const overlay = document.createElement('div');
    overlay.id = 'system-destroyed-overlay';
    overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:#0a0000; color:#ff3333; z-index:999999; font-family:monospace; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:20px; box-sizing:border-box; text-align:center; overflow:hidden;";
    
    overlay.innerHTML = `
        <div style="font-size: 5rem; margin-bottom: 20px; animation: blink 1s steps(2, start) infinite;">⚠️</div>
        <h1 style="font-size: 2.5rem; margin: 10px 0; letter-spacing: 2px; color: #ff5555;">SYSTEM DESTROYED</h1>
        <p style="font-size: 1.2rem; max-width: 600px; line-height: 1.6; color: #dddddd; margin-bottom: 30px;">
            You have executed <span style="color: #ff3333; font-weight: bold; background: #220000; padding: 2px 6px; border-radius: 3px;">sudo rm -rf /</span> inside this emulator. 
            The root directory has been recursively wiped out, and the environment state has collapsed.
        </p>
        <div style="border: 1px dashed #ff3333; padding: 15px 25px; max-width: 550px; background: #1a0000; border-radius: 4px;">
            <strong style="color: #ff5555; display: block; margin-bottom: 8px; font-size: 1.1rem;">CRITICAL WARNING</strong>
            <span style="color: #ffbbbb; font-size: 0.95rem; display: block; text-align: left; line-height: 1.5;">
                Never run this command on a real Linux/Unix system. Running this with superuser privileges overrides critical system safety protocols and unlinks all system paths, permanently erasing the operating system, user files, and mounted configurations beyond recovery.
            </span>
        </div>
        <button onclick="window.location.reload();" style="margin-top: 30px; background: #ff3333; color: #fff; border: none; padding: 10px 20px; font-family: monospace; font-size: 1rem; cursor: pointer; border-radius: 3px; font-weight: bold; transition: background 0.2s;">
            Reinitialize Virtual System State
        </button>
        <style>
            @keyframes blink { to { opacity: 0; } }
            #system-destroyed-overlay button:hover { background: #ff5555; }
        </style>
    `;
    document.body.appendChild(overlay);
}

// Helper to normalize and resolve relative/absolute paths cleanly
function resolvePath(targetPath) {
    targetPath = targetPath.trim();
    if (!targetPath) return currentDirectory;
    
    if (targetPath === "~") return "/home/user";
    
    let resolved = targetPath.startsWith("/") ? targetPath : (currentDirectory === "/" ? "/" + targetPath : currentDirectory + "/" + targetPath);
    
    const parts = resolved.split("/");
    const stack = [];
    for (const part of parts) {
        if (part === "" || part === ".") continue;
        if (part === "..") {
            if (stack.length > 0) stack.pop();
        } else {
            stack.push(part);
        }
    }
    return "/" + stack.join("/");
}
const commands = {
    clear: () => {
        document.getElementById('output').innerHTML = '';
        return "";
    },
    cd: (args) => {
        const target = args.trim();
        if (target === "" || target === "~") {
            currentDirectory = "/home/user";
            saveState();
            return "";
        }
        
        const targetPath = resolvePath(target);
        if (virtualFilesystem[targetPath]) {
            if (virtualFilesystem[targetPath].type === "directory") {
                currentDirectory = targetPath;
                saveState();
                return "";
            } else {
                return `bash: cd: ${target}: Not a directory`;
            }
        }
        return `bash: cd: ${target}: No such file or directory`;
    },
    ls: (args) => {
        let options = { a: false, l: false };
        let targetArg = "";

        if (args) {
            const parts = args.trim().split(/\s+/);
            for (const part of parts) {
                if (part.startsWith("-") && part.length > 1) {
                    const flags = part.slice(1);
                    for (const char of flags) {
                        if (char === 'a') options.a = true;
                        else if (char === 'l') options.l = true;
                        else return `ls: invalid option -- '${char}'`;
                    }
                } else {
                    targetArg = part;
                }
            }
        }

        const targetPath = targetArg ? resolvePath(targetArg) : currentDirectory;
        const dirObj = virtualFilesystem[targetPath];

        if (!dirObj) return `ls: cannot access '${targetArg}': No such file or directory`;
        if (dirObj.type === "file") return targetArg.trim();

        let items = [...dirObj.contents];
        if (options.a) {
            items.unshift(".", "..");
        } else {
            items = items.filter(item => !item.startsWith("."));
        }

        if (options.l) {
            const totalLines = [];
            for (const item of items) {
                let itemPath = targetPath;
                if (item === ".") itemPath = targetPath;
                else if (item === "..") {
                    const parts = targetPath.split("/");
                    parts.pop();
                    itemPath = parts.join("/") || "/";
                } else {
                    itemPath = targetPath === "/" ? "/" + item : targetPath + "/" + item;
                }

                const targetObj = virtualFilesystem[itemPath];
                let typeChar = "-";
                let perms = "rw-r--r--";
                let size = "0";

                if (targetObj) {
                    if (targetObj.type === "directory") {
                        typeChar = "d";
                        perms = "rwxr-xr-x";
                        size = "4096";
                    } else if (targetObj.type === "file") {
                        size = targetObj.content ? targetObj.content.length.toString() : "0";
                    }
                } else if (item === "." || item === "..") {
                    typeChar = "d";
                    perms = "rwxr-xr-x";
                    size = "4096";
                }

                totalLines.push(`${typeChar}${perms} 1 user user ${size.padStart(5, ' ')} Sep 12 07:44 ${item}`);
            }
            return totalLines.join("\n");
        } else {
            if (items.length === 0) return "";
            return items.join("  ");
        }
    },
    pwd: () => {
        return currentDirectory;
    },
    mkdir: (args) => {
        if (!args || args.trim() === "") return "mkdir: missing operand";
        const targetPath = resolvePath(args);
        
        if (virtualFilesystem[targetPath]) return `mkdir: cannot create directory '${args}': File exists`;
        
        const parts = targetPath.split("/");
        const folderName = parts.pop();
        const parentPath = parts.join("/") || "/";
        const parentDirObj = virtualFilesystem[parentPath];
        
        if (!parentDirObj || parentDirObj.type !== "directory") return `mkdir: cannot create directory '${args}': Parent missing`;

        parentDirObj.contents.push(folderName);
        virtualFilesystem[targetPath] = { type: "directory", contents: [] };
        saveState();
        return "";
    },
    touch: (args) => {
        if (!args || args.trim() === "") return "touch: missing file operand";
        const targetPath = resolvePath(args);
        
        if (virtualFilesystem[targetPath]) return "";

        const parts = targetPath.split("/");
        const fileName = parts.pop();
        const parentPath = parts.join("/") || "/";
        const parentDirObj = virtualFilesystem[parentPath];
        
        if (!parentDirObj || parentDirObj.type !== "directory") return `touch: cannot touch '${args}': No such file or directory`;

        parentDirObj.contents.push(fileName);
        virtualFilesystem[targetPath] = { type: "file", content: "" };
        saveState();
        return "";
    },
    rm: (args) => {
        if (!args || args.trim() === "") return "rm: missing operand";
        let target = args.trim();
        let isRecursiveForce = false;

        if (target.startsWith("-")) {
            const parts = target.split(/\s+/);
            const flags = parts[0];
            if (flags.includes('r') && flags.includes('f')) {
                isRecursiveForce = true;
            }
            target = parts.slice(1).join(' ');
        }
        
        const targetPath = resolvePath(target);

        if (targetPath === "/" && isRecursiveForce) {
            triggerSystemDestruction();
            return null;
        }

        if (!virtualFilesystem[targetPath]) return `rm: '${target}': No such file or directory`;
        if (virtualFilesystem[targetPath].type === "directory" && !isRecursiveForce) {
            return `rm: cannot remove '${target}': Is a directory`;
        }
        
        const parts = targetPath.split("/");
        const itemName = parts.pop();
        const parentPath = parts.join("/") || "/";
        
        const parentDirObj = virtualFilesystem[parentPath];
        if (parentDirObj) {
            const itemIndex = parentDirObj.contents.indexOf(itemName);
            if (itemIndex !== -1) parentDirObj.contents.splice(itemIndex, 1);
        }
        
        delete virtualFilesystem[targetPath];
        saveState();
        return "";
    },
    sudo: (args) => {
        if (!args || args.trim() === "") return "usage: sudo [command]";
        const cleanedArgs = args.trim();
        const parts = cleanedArgs.split(/\s+/);
        const commandName = parts[0].toLowerCase();
        const subArgs = cleanedArgs.substring(parts[0].length).trim();
        
        if (commands[commandName]) {
            return commands[commandName](subArgs);
        } else {
            return `sudo: ${commandName}: command not found`;
        }
    }
};
commands.cat = (args) => {
    if (!args || args.trim() === "") return "cat: missing file operand";
    const targetPath = resolvePath(args);
    if (virtualFilesystem[targetPath]) {
        if (virtualFilesystem[targetPath].type === "directory") return `cat: ${args}: Is a directory`;
        return virtualFilesystem[targetPath].content;
    }
    return `cat: ${args}: No such file or directory`;
};

commands.echo = (args) => {
    if (!args) return "";
    const match = args.match(/(.+?)\s*(>>|>)\s*(.+)/);
    if (match) {
        let text = match[1].trim();
        const mode = match[2];
        const file = match[3].trim();
        if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
            text = text.slice(1, -1);
        }
        
        const targetPath = resolvePath(file);
        const parts = targetPath.split("/");
        const fileName = parts.pop();
        const parentPath = parts.join("/") || "/";
        const parentDirObj = virtualFilesystem[parentPath];
        
        if (!parentDirObj || parentDirObj.type !== "directory") return `echo: ${file}: No such file or directory`;
        
        if (!parentDirObj.contents.includes(fileName)) {
            parentDirObj.contents.push(fileName);
            virtualFilesystem[targetPath] = { type: "file", content: "" };
        }
        
        if (mode === ">") {
            virtualFilesystem[targetPath].content = text;
        } else {
            const existing = virtualFilesystem[targetPath].content;
            virtualFilesystem[targetPath].content = existing ? existing + "\n" + text : text;
        }
        saveState();
        return "";
    }
    let cleanText = args.trim();
    if ((cleanText.startsWith('"') && cleanText.endsWith('"')) || (cleanText.startsWith("'") && cleanText.endsWith("'"))) {
        cleanText = cleanText.slice(1, -1);
    }
    return cleanText;
};

commands.cal = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    let output = `    ${months[month]} ${year}\nSu Mo Tu We Th Fr Sa\n`;
    for (let i = 0; i < firstDay; i++) output += "   ";
    for (let day = 1; day <= totalDays; day++) {
        let dayStr = day < 10 ? ` ${day}` : `${day}`;
        dayStr = (day === now.getDate()) ? `[${dayStr}]` : ` ${dayStr}`;
        output += dayStr;
        if ((day + firstDay) % 7 === 0) output += "\n";
    }
    return output + "\n";
};

commands.uptime = () => {
    const diff = Date.now() - sessionStartTime;
    const secs = Math.floor((diff / 1000) % 60);
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    const hrs = Math.floor((diff / (1000 * 60 * 60)) % 24);
    return `up ${hrs}h ${mins}m ${secs}s, user context active.`;
};

commands.history = () => commandHistory.map((cmd, idx) => `  ${idx + 1}  ${cmd}`).join("\n");

commands.mv = (args) => {
    if (!args) return "mv: missing file operand";
    const parts = args.trim().split(/\s+/);
    if (parts.length < 2) return `mv: missing destination file operand after '${parts}'`;
    
    const srcPath = resolvePath(parts[0]);
    const destPath = resolvePath(parts[1]);
    if (!virtualFilesystem[srcPath]) return `mv: cannot stat '${parts[0]}': No such file or directory`;
    
    let targetDest = destPath;
    if (virtualFilesystem[destPath] && virtualFilesystem[destPath].type === "directory") {
        const srcName = srcPath.split("/").pop();
        targetDest = destPath === "/" ? "/" + srcName : destPath + "/" + srcName;
    }
    
    const srcParts = srcPath.split("/");
    const srcName = srcParts.pop();
    const srcParent = virtualFilesystem[srcParts.join("/") || "/"];
    srcParent.contents = srcParent.contents.filter(item => item !== srcName);
    
    const destParts = targetDest.split("/");
    const destName = destParts.pop();
    const destParent = virtualFilesystem[destParts.join("/") || "/"];
    
    if (!destParent) return "mv: target directory structuring context missing";
    if (!destParent.contents.includes(destName)) destParent.contents.push(destName);
    
    virtualFilesystem[targetDest] = virtualFilesystem[srcPath];
    delete virtualFilesystem[srcPath];
    saveState();
    return "";
};

commands.cp = (args) => {
    if (!args) return "cp: missing file operand";
    const parts = args.trim().split(/\s+/);
    if (parts.length < 2) return `cp: missing destination file operand after '${parts}'`;
    
    const srcPath = resolvePath(parts[0]);
    const destPath = resolvePath(parts[1]);
    if (!virtualFilesystem[srcPath]) return `cp: cannot stat '${parts[0]}': No such file or directory`;
    if (virtualFilesystem[srcPath].type === "directory") return "cp: directories not supported recursively yet";
    
    let targetDest = destPath;
    if (virtualFilesystem[destPath] && virtualFilesystem[destPath].type === "directory") {
        const srcName = srcPath.split("/").pop();
        targetDest = destPath === "/" ? "/" + srcName : destPath + "/" + srcName;
    }
    
    const destParts = targetDest.split("/");
    const destName = destParts.pop();
    const destParent = virtualFilesystem[destParts.join("/") || "/"];
    
    if (!destParent) return "cp: target directory context missing";
    if (!destParent.contents.includes(destName)) destParent.contents.push(destName);
    
    virtualFilesystem[targetDest] = { type: "file", content: virtualFilesystem[srcPath].content };
    saveState();
    return "";
};

commands.head = (args) => {
    if (!args || args.trim() === "") return "head: missing file operand";
    const targetPath = resolvePath(args);
    if (!virtualFilesystem[targetPath] || virtualFilesystem[targetPath].type !== "file") {
        return `head: cannot open '${args}' for reading: No such file`;
    }
    return virtualFilesystem[targetPath].content.split("\n").slice(0, 10).join("\n");
};

commands.grep = (args) => {
    if (!args) return "grep: pattern parsing error";
    const match = args.match(/(.+?)\s+(.+)/);
    if (!match) return "Usage: grep [pattern] [file]";
    const pattern = match[1].replace(/["']/g, "");
    const targetPath = resolvePath(match[2]);
    if (!virtualFilesystem[targetPath] || virtualFilesystem[targetPath].type !== "file") {
        return `grep: ${match[2]}: No such file or directory`;
    }
    return virtualFilesystem[targetPath].content.split("\n").filter(line => line.includes(pattern)).join("\n");
};
commands.help = () => `Available commands:\n-------------------\n` + Object.keys(commands).join("   ");

commands.vim = (args) => {
    if (!args || args.trim() === "") return "vim: file operand missing";
    const path = resolvePath(args);
    if (virtualFilesystem[path] && virtualFilesystem[path].type === "directory") return `vim: "${args}" is a directory`;
    
    let initialContent = virtualFilesystem[path] ? virtualFilesystem[path].content : "";
    let iframe = document.getElementById('vim-iframe-overlay');
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'vim-iframe-overlay';
        iframe.src = 'vim.html';
        iframe.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; border:none; z-index:99999; background:#000;";
        document.body.appendChild(iframe);
    }
    window.activeVimPath = path;
    window.activeVimFileName = args.trim();
    iframe.onload = () => iframe.contentWindow.postMessage({ type: "VIM_OPEN", fileName: window.activeVimFileName, content: initialContent }, "*");
    return null;
};

commands.man = (args) => {
    if (!args || args.trim() === "") return `What manual page do you want?\nExample: man ls, man vim`;
    const topic = args.trim().toLowerCase();
    const manualPages = {
        man: "MAN(1) - Reference handbook interface\n\nUsage: man [command]",
        ls: "LS(1) - List files\n\nUsage: ls [path]",
        pwd: "PWD(1) - Print working directory\n\nUsage: pwd",
        mkdir: "MKDIR(1) - Make directory\n\nUsage: mkdir [path/name]",
        touch: "TOUCH(1) - Create file\n\nUsage: touch [path/name]",
        rm: "RM(1) - Remove file\n\nUsage: rm [name]",
        echo: "ECHO(1) - Print text / Write outputs\n\nUsage: echo [text] > [file]",
        cat: "CAT(1) - Read text contents\n\nUsage: cat [file]",
        cal: "CAL(1) - Display structural monthly grid format calendar metrics.",
        vim: "VIM(1) - Mobile responsive text screen editor wrapper environment.",
        uptime: "UPTIME(1) - Returns session timeline length logging metrics.",
        history: "HISTORY(1) - View local command execution tracks.",
        sudo: "SUDO(8) - Execute a command as the superuser/root authority."
    };
    return manualPages[topic] || `No manual entry for ${topic}`;
};

commands.whoami = () => "user";
commands.date = () => new Date().toString();
commands.vi = commands.vim;

function executeTerminalCommand(inputString) {
    const cleaned = inputString.trim();
    const out = document.getElementById('output');
    const promptElement = document.getElementById('prompt');
    
    if (out && promptElement) out.innerHTML += `<div class="command-echo">${promptElement.textContent} ${inputString}</div>`;
    if (!cleaned) return;
    
    commandHistory.push(cleaned);
    const parts = cleaned.split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const commandArgs = cleaned.substring(parts[0].length).trim();
    
    if (commands[commandName]) {
        const result = commands[commandName](commandArgs);
        if (result !== null && result !== undefined && result !== "" && out) out.innerHTML += `<div>${result}</div>`;
    } else if (out) {
        out.innerHTML += `<div>bash: ${commandName}: command not found</div>`;
    }
    if (promptElement && virtualFilesystem[currentDirectory]) promptElement.textContent = `user@shark-terminal:${currentDirectory}$`;
}

window.addEventListener("message", function(event) {
    if (!event.data) return;
    const iframe = document.getElementById('vim-iframe-overlay');
    if (event.data.type === "VIM_SAVE") {
        const path = window.activeVimPath;
        const parts = path.split("/");
        const fileName = parts.pop();
        const parentPath = parts.join("/") || "/";
        const parentDirObj = virtualFilesystem[parentPath];
        if (parentDirObj && parentDirObj.type === "directory") {
            if (!parentDirObj.contents.includes(fileName)) parentDirObj.contents.push(fileName);
            virtualFilesystem[path] = { type: "file", content: event.data.content };
            saveState(); 
        }
    }
    if (event.data.type === "VIM_EXIT") {
        if (iframe) iframe.remove();
        window.activeVimPath = null;
        window.activeVimFileName = null;
        const terminalInput = document.getElementById('command-input');
        if (terminalInput) terminalInput.focus();
    }
});
