
// ==========================================
// CHATX - FRONTEND JAVASCRIPT
// Markdown + Streaming + Code Blocks
// File Upload + Voice Input
// ==========================================


// ==========================================
// CURRENT CONVERSATION
// ==========================================

let chatId = Date.now().toString();
let currentChatTitle = null;


// ==========================================
// SAVED CHATS
// ==========================================

let savedChats =
    JSON.parse(
        localStorage.getItem("chatx-chats")
    ) || [];


// ==========================================
// SELECTED FILE
// ==========================================

let selectedFile = null;


// ==========================================
// ELEMENTS
// ==========================================

const messageInput =
    document.getElementById("messageInput");

const chatArea =
    document.getElementById("chatArea");

const sendButton =
    document.getElementById("sendButton");

const historyList =
    document.getElementById("historyList");

const fileInput =
    document.getElementById("fileInput");


// ==========================================
// SEND MESSAGE
// ==========================================

async function sendMessage() {

    const message =
        messageInput.value.trim();

    // Allow sending if either message OR file exists
    if (!message && !selectedFile) {
        return;
    }


    // Create title from first message
    if (!currentChatTitle) {

        currentChatTitle =
            message ||
            selectedFile.name;

        saveCurrentChat();

        renderHistory();

    }


    // ==========================================
    // SHOW USER MESSAGE
    // ==========================================

    let displayMessage =
        message;

    if (selectedFile) {

        if (displayMessage) {

            displayMessage +=
                `\n📎 ${selectedFile.name}`;

        } else {

            displayMessage =
                `📎 ${selectedFile.name}`;

        }

    }


    addMessage(
        displayMessage,
        "user"
    );


    // Save user message
    addMessageToCurrentChat(
        displayMessage,
        "user"
    );


    // Clear input
    messageInput.value = "";


    // Reset placeholder
    messageInput.placeholder =
        "Message ChatX...";


    // Disable send button
    sendButton.disabled = true;


    // Create AI message
    const aiMessage =
        addMessage(
            "",
            "ai"
        );


    const content =
        aiMessage.querySelector(
            ".message-content"
        );


    // Start thinking animation
    startThinkingAnimation(
        content
    );


    try {

        await getAIResponse(
            message,
            content
        );

    } catch (error) {

        console.error(error);

        stopThinkingAnimation(
            content
        );

        content.textContent =
            "Sorry, something went wrong. Please try again.";

    }


    // Clear selected file
    selectedFile = null;

    if (fileInput) {
        fileInput.value = "";
    }


    sendButton.disabled = false;

    messageInput.focus();

}


// ==========================================
// THINKING ANIMATION
// ==========================================

let thinkingTimer = null;


function startThinkingAnimation(
    element
) {

    let dots = 0;

    element.classList.add(
        "thinking"
    );

    element.textContent =
        "Thinking 🤔";


    thinkingTimer =
        setInterval(() => {

            dots++;

            if (dots > 3) {
                dots = 0;
            }


            element.textContent =
                "Thinking" +
                ".".repeat(dots) +
                " 🤔";

        }, 400);

}


// ==========================================
// STOP THINKING
// ==========================================

function stopThinkingAnimation(
    element
) {

    if (thinkingTimer) {

        clearInterval(
            thinkingTimer
        );

        thinkingTimer = null;

    }


    element.classList.remove(
        "thinking"
    );

}


// ==========================================
// STREAM GEMINI RESPONSE
// ==========================================

async function getAIResponse(
    message,
    content
) {


    // ==========================================
    // CREATE FORM DATA
    // ==========================================

    const formData =
        new FormData();


    formData.append(
        "message",
        message
    );


    formData.append(
        "chatId",
        chatId
    );


    // Add file if selected
    if (selectedFile) {

        formData.append(
            "file",
            selectedFile
        );

    }


    // ==========================================
    // SEND REQUEST
    // ==========================================

    const response =
        await fetch(
            "http://localhost:3000/chat",
            {

                method: "POST",

                body: formData

            }
        );


    // ==========================================
    // CHECK RESPONSE
    // ==========================================

    if (!response.ok) {

        let data;

        try {

            data =
                await response.json();

        } catch {

            throw new Error(
                "Server error"
            );

        }


        throw new Error(
            data.error ||
            "Server error"
        );

    }


    // ==========================================
    // READ STREAM
    // ==========================================

    const reader =
        response.body.getReader();


    const decoder =
        new TextDecoder();


    let buffer = "";

    let fullResponse = "";

    let firstChunk = true;


    while (true) {

        const {
            value,
            done
        } =
            await reader.read();


        if (done) {
            break;
        }


        buffer +=
            decoder.decode(
                value,
                {
                    stream: true
                }
            );


        const events =
            buffer.split("\n\n");


        buffer =
            events.pop();


        for (const event of events) {

            if (
                !event.startsWith(
                    "data:"
                )
            ) {
                continue;
            }


            const jsonText =
                event
                    .replace(
                        "data:",
                        ""
                    )
                    .trim();


            if (!jsonText) {
                continue;
            }


            const data =
                JSON.parse(
                    jsonText
                );


            // ==========================================
            // ERROR
            // ==========================================

            if (data.error) {

                throw new Error(
                    data.error
                );

            }


            // ==========================================
            // FINISHED
            // ==========================================

            if (data.done) {
                continue;
            }


            // ==========================================
            // FIRST RESPONSE CHUNK
            // ==========================================

            if (firstChunk) {

                stopThinkingAnimation(
                    content
                );


                content.innerHTML =
                    "";


                content.classList.add(
                    "response-start"
                );


                firstChunk = false;

            }


            // ==========================================
            // ADD STREAMED TEXT
            // ==========================================

            fullResponse +=
                data.text;


            // ==========================================
            // MARKDOWN
            // ==========================================

            content.innerHTML =
                marked.parse(
                    fullResponse
                );


            // ==========================================
            // ADD CODE BUTTONS
            // ==========================================

            addCodeButtons(
                content
            );


            // ==========================================
            // SMOOTH SCROLLING
            // ==========================================

            chatArea.scrollTo({

                top:
                    chatArea.scrollHeight,

                behavior:
                    "smooth"

            });

        }

    }


    // ==========================================
    // SAVE COMPLETE RESPONSE
    // ==========================================

    if (fullResponse) {

        addMessageToCurrentChat(
            fullResponse,
            "ai"
        );

    }

}


// ==========================================
// ADD CODE BUTTONS
// ==========================================

function addCodeButtons(
    container
) {

    const codeBlocks =
        container.querySelectorAll(
            "pre"
        );


    codeBlocks.forEach(
        pre => {

            // Don't add twice
            if (
                pre.querySelector(
                    ".code-copy-btn"
                )
            ) {
                return;
            }


            const code =
                pre.querySelector(
                    "code"
                );


            if (!code) {
                return;
            }


            // Create wrapper
            const wrapper =
                document.createElement(
                    "div"
                );


            wrapper.className =
                "code-block-wrapper";


            // Create header
            const header =
                document.createElement(
                    "div"
                );


            header.className =
                "code-header";


            // Language name
            const language =
                document.createElement(
                    "span"
                );


            language.className =
                "code-language";


            const className =
                code.className || "";


            const match =
                className.match(
                    /language-([\w+-]+)/
                );


            language.textContent =
                match
                    ? match[1].toUpperCase()
                    : "CODE";


            // Copy button
            const copyButton =
                document.createElement(
                    "button"
                );


            copyButton.className =
                "code-copy-btn";


            copyButton.textContent =
                "📋 Copy Code";


            copyButton.onclick =
                async () => {

                    try {

                        await navigator.clipboard
                            .writeText(
                                code.innerText
                            );


                        copyButton.textContent =
                            "✓ Copied!";


                        setTimeout(() => {

                            copyButton.textContent =
                                "📋 Copy Code";

                        }, 1500);


                    } catch (error) {

                        console.error(
                            "Code copy failed:",
                            error
                        );

                    }

                };


            header.appendChild(
                language
            );


            header.appendChild(
                copyButton
            );


            // Move code into wrapper
            pre.parentNode.insertBefore(
                wrapper,
                pre
            );


            wrapper.appendChild(
                header
            );


            wrapper.appendChild(
                pre
            );

        }
    );

}


// ==========================================
// ADD MESSAGE
// ==========================================

function addMessage(
    text,
    sender
) {

    const welcome =
        document.querySelector(
            ".welcome"
        );


    if (welcome) {
        welcome.remove();
    }


    const messageDiv =
        document.createElement(
            "div"
        );


    messageDiv.className =
        `message ${sender}`;


    const contentDiv =
        document.createElement(
            "div"
        );


    contentDiv.className =
        "message-content";


    // ==========================================
    // AI MARKDOWN
    // ==========================================

    if (
        sender === "ai" &&
        text
    ) {

        contentDiv.innerHTML =
            marked.parse(
                text
            );


        addCodeButtons(
            contentDiv
        );

    } else {

        contentDiv.textContent =
            text;

    }


    messageDiv.appendChild(
        contentDiv
    );


    // ==========================================
    // COPY RESPONSE
    // ==========================================

    if (sender === "ai") {

        const copyButton =
            document.createElement(
                "button"
            );


        copyButton.className =
            "copy-btn";


        copyButton.textContent =
            "📋 Copy";


        copyButton.onclick =
            async () => {

                try {

                    await navigator.clipboard
                        .writeText(
                            contentDiv.innerText
                        );


                    copyButton.textContent =
                        "✓ Copied";


                    setTimeout(() => {

                        copyButton.textContent =
                            "📋 Copy";

                    }, 1500);


                } catch (error) {

                    console.error(
                        "Copy failed:",
                        error
                    );

                }

            };


        messageDiv.appendChild(
            copyButton
        );

    }


    chatArea.appendChild(
        messageDiv
    );


    chatArea.scrollTop =
        chatArea.scrollHeight;


    return messageDiv;

}


// ==========================================
// SAVE MESSAGE
// ==========================================

function addMessageToCurrentChat(
    text,
    sender
) {

    let chat =
        savedChats.find(
            chat =>
                chat.id === chatId
        );


    if (!chat) {

        chat = {

            id: chatId,

            title:
                currentChatTitle ||
                "New Chat",

            messages: []

        };


        savedChats.unshift(
            chat
        );

    }


    chat.messages.push({

        text: text,

        sender: sender

    });


    chat.title =
        currentChatTitle ||
        chat.title;


    saveChats();

}


// ==========================================
// SAVE CURRENT CHAT
// ==========================================

function saveCurrentChat() {

    let chat =
        savedChats.find(
            chat =>
                chat.id === chatId
        );


    if (!chat) {

        savedChats.unshift({

            id: chatId,

            title:
                currentChatTitle ||
                "New Chat",

            messages: []

        });

    }


    saveChats();

}


// ==========================================
// SAVE ALL CHATS
// ==========================================

function saveChats() {

    localStorage.setItem(
        "chatx-chats",
        JSON.stringify(
            savedChats
        )
    );

}


// ==========================================
// RENDER HISTORY
// ==========================================

function renderHistory() {

    if (!historyList) {
        return;
    }


    historyList.innerHTML = "";


    if (savedChats.length === 0) {

        const welcomeHistory =
            document.createElement(
                "div"
            );


        welcomeHistory.className =
            "history-item";


        welcomeHistory.innerHTML = `
            <span>💬</span>
            <span>Welcome to ChatX</span>
        `;


        historyList.appendChild(
            welcomeHistory
        );


        return;

    }


    savedChats.forEach(
        (chat) => {

            const historyItem =
                document.createElement(
                    "div"
                );


            historyItem.className =
                "history-item";


            if (chat.id === chatId) {

                historyItem.classList.add(
                    "active"
                );

            }


            const icon =
                document.createElement(
                    "span"
                );


            icon.textContent =
                "💬";


            const title =
                document.createElement(
                    "span"
                );


            title.textContent =
                chat.title.length > 28
                    ? chat.title.substring(
                        0,
                        28
                    ) + "..."
                    : chat.title;


            historyItem.appendChild(
                icon
            );


            historyItem.appendChild(
                title
            );


            // ==========================================
            // CHAT MENU BUTTON
            // ==========================================

            const menuButton =
                document.createElement(
                    "button"
                );


            menuButton.className =
                "chat-menu-btn";


            menuButton.textContent =
                "⋮";


            menuButton.title =
                "Chat options";


            menuButton.onclick =
                (event) => {

                    event.stopPropagation();

                    showChatMenu(
                        chat,
                        historyItem,
                        menuButton
                    );

                };


            historyItem.appendChild(
                menuButton
            );


            // ==========================================
            // OPEN CHAT
            // ==========================================

            historyItem.onclick =
                (event) => {

                    // Don't open chat when clicking
                    // the menu button or menu
                    if (
                        event.target.closest(
                            ".chat-options-menu"
                        ) ||
                        event.target.closest(
                            ".chat-menu-btn"
                        )
                    ) {
                        return;
                    }


                    openChat(
                        chat.id
                    );

                };


            historyList.appendChild(
                historyItem
            );

        }
    );

}


// ==========================================
// CHAT OPTIONS MENU
// ==========================================

function showChatMenu(
    chat,
    historyItem,
    menuButton
) {

    // ==========================================
    // CHECK IF THIS MENU IS ALREADY OPEN
    // ==========================================

    const existingMenu =
        historyItem.querySelector(
            ".chat-options-menu"
        );


    // If clicked again, close it
    if (existingMenu) {

        existingMenu.remove();

        return;

    }


    // ==========================================
    // CLOSE ANY OTHER OPEN MENU
    // ==========================================

    document
        .querySelectorAll(
            ".chat-options-menu"
        )
        .forEach(
            menu => menu.remove()
        );


    // ==========================================
    // CREATE MENU
    // ==========================================

    const menu =
        document.createElement(
            "div"
        );


    menu.className =
        "chat-options-menu";


    // ==========================================
    // RENAME BUTTON
    // ==========================================

    const renameButton =
        document.createElement(
            "button"
        );


    renameButton.textContent =
        "✏️ Rename";


    renameButton.onclick =
        (event) => {

            event.stopPropagation();


            const newTitle =
                prompt(
                    "Enter a new chat name:",
                    chat.title
                );


            if (
                newTitle &&
                newTitle.trim()
            ) {

                chat.title =
                    newTitle.trim();

                saveChats();

                renderHistory();

            }


            // Close menu
            menu.remove();

        };


    // ==========================================
    // DELETE BUTTON
    // ==========================================

    const deleteButton =
        document.createElement(
            "button"
        );


    deleteButton.textContent =
        "🗑️ Delete";


    deleteButton.onclick =
        (event) => {

            event.stopPropagation();


            const confirmDelete =
                confirm(
                    "Delete this chat?"
                );


            if (!confirmDelete) {

                // Keep menu open if user cancels
                return;

            }


            savedChats =
                savedChats.filter(
                    item =>
                        item.id !==
                        chat.id
                );


            localStorage.setItem(
                "chatx-chats",
                JSON.stringify(
                    savedChats
                )
            );


            if (
                chat.id === chatId
            ) {

                newChat();

            } else {

                renderHistory();

            }


            menu.remove();

        };


    // ==========================================
    // ADD BUTTONS TO MENU
    // ==========================================

    menu.appendChild(
        renameButton
    );


    menu.appendChild(
        deleteButton
    );


    // ==========================================
    // ADD MENU TO CHAT
    // ==========================================

    historyItem.appendChild(
        menu
    );

}


// ==========================================
// OPEN SAVED CHAT
// ==========================================

function openChat(
    selectedChatId
) {

    const chat =
        savedChats.find(
            chat =>
                chat.id ===
                selectedChatId
        );


    if (!chat) {
        return;
    }


    // Close any open chat menu
    document
        .querySelectorAll(
            ".chat-options-menu"
        )
        .forEach(
            menu => menu.remove()
        );


    chatId =
        chat.id;


    currentChatTitle =
        chat.title;


    chatArea.innerHTML =
        "";


    chat.messages.forEach(
        message => {

            addMessage(
                message.text,
                message.sender
            );

        }
    );


    renderHistory();

    messageInput.focus();

}


// ==========================================
// ENTER KEY
// ==========================================

function handleKey(event) {

    if (
        event.key === "Enter" &&
        !event.shiftKey
    ) {

        event.preventDefault();

        sendMessage();

    }

}


// ==========================================
// SUGGESTIONS
// ==========================================

function useSuggestion(
    text
) {

    messageInput.value =
        text;

    messageInput.focus();

    sendMessage();

}


// ==========================================
// NEW CHAT
// ==========================================

function newChat() {

    // Close any open menu
    document
        .querySelectorAll(
            ".chat-options-menu"
        )
        .forEach(
            menu => menu.remove()
        );


    chatId =
        Date.now().toString();

    currentChatTitle =
        null;


    selectedFile =
        null;


    if (fileInput) {
        fileInput.value = "";
    }


    const chatSearch =
        document.getElementById(
            "chatSearch"
        );


    if (chatSearch) {

        chatSearch.value = "";

    }


    messageInput.placeholder =
        "Message ChatX...";


    chatArea.innerHTML = `

        <div class="welcome">

            <div class="welcome-icon">
                ✦
            </div>

            <h1>
                How can I help you?
            </h1>

            <p>
                Ask ChatX anything. Let's get started.
            </p>

            <div class="suggestions">

                <button
                    onclick="useSuggestion('Explain artificial intelligence simply')"
                >
                    <span>💡</span>
                    Explain AI simply
                </button>

                <button
                    onclick="useSuggestion('Write a Python program')"
                >
                    <span>💻</span>
                    Write some code
                </button>

                <button
                    onclick="useSuggestion('Give me some creative ideas')"
                >
                    <span>✨</span>
                    Give me ideas
                </button>

            </div>

        </div>

    `;


    messageInput.value = "";

    renderHistory();

    messageInput.focus();

}


// ==========================================
// CLEAR RECENT CHATS
// ==========================================

function clearRecentChats() {

    if (savedChats.length === 0) {
        return;
    }


    const confirmDelete =
        confirm(
            "Are you sure you want to delete all recent chats?"
        );


    if (!confirmDelete) {
        return;
    }


    savedChats = [];


    localStorage.removeItem(
        "chatx-chats"
    );


    chatId =
        Date.now().toString();


    currentChatTitle =
        null;


    selectedFile =
        null;


    if (fileInput) {
        fileInput.value = "";
    }


    const chatSearch =
        document.getElementById(
            "chatSearch"
        );


    if (chatSearch) {

        chatSearch.value = "";

    }


    messageInput.placeholder =
        "Message ChatX...";


    chatArea.innerHTML = `

        <div class="welcome">

            <div class="welcome-icon">
                ✦
            </div>

            <h1>
                How can I help you?
            </h1>

            <p>
                Ask ChatX anything. Let's get started.
            </p>

            <div class="suggestions">

                <button
                    onclick="useSuggestion('Explain artificial intelligence simply')"
                >
                    <span>💡</span>
                    Explain AI simply
                </button>

                <button
                    onclick="useSuggestion('Write a Python program')"
                >
                    <span>💻</span>
                    Write some code
                </button>

                <button
                    onclick="useSuggestion('Give me some creative ideas')"
                >
                    <span>✨</span>
                    Give me ideas
                </button>

            </div>

        </div>

    `;


    messageInput.value = "";

    renderHistory();

    messageInput.focus();

}


// ==========================================
// SEARCH CHATS
// ==========================================

function searchChats() {

    const searchInput =
        document.getElementById(
            "chatSearch"
        );


    const searchText =
        searchInput.value
            .trim()
            .toLowerCase();


    const chatItems =
        document.querySelectorAll(
            "#historyList .history-item"
        );


    chatItems.forEach(
        item => {

            const text =
                item.textContent
                    .toLowerCase();


            if (
                text.includes(
                    searchText
                )
            ) {

                item.style.display =
                    "flex";

            } else {

                item.style.display =
                    "none";

            }

        }
    );

}


// ==========================================
// DARK MODE
// ==========================================

function toggleTheme() {

    document.body.classList.toggle(
        "dark-mode"
    );


    const isDark =
        document.body.classList.contains(
            "dark-mode"
        );


    localStorage.setItem(
        "chatx-dark-mode",
        isDark
    );

}


// ==========================================
// LOAD DARK MODE
// ==========================================

function loadTheme() {

    const darkMode =
        localStorage.getItem(
            "chatx-dark-mode"
        );


    if (darkMode === "true") {

        document.body.classList.add(
            "dark-mode"
        );

    }

}


// ==========================================
// MOBILE SIDEBAR
// ==========================================

function toggleSidebar() {

    const sidebar =
        document.querySelector(
            ".sidebar"
        );

    sidebar.classList.toggle(
        "open"
    );

}


// ==========================================
// SETTINGS PANEL
// ==========================================

function openSettings() {

    if (
        document.querySelector(
            ".settings-overlay"
        )
    ) {

        return;

    }


    const overlay =
        document.createElement(
            "div"
        );


    overlay.className =
        "settings-overlay";


    overlay.innerHTML = `

        <div class="settings-panel">

            <div class="settings-header">

                <h2>
                    ⚙️ Settings
                </h2>

                <button
                    class="settings-close"
                    onclick="closeSettings()"
                >
                    ✕
                </button>

            </div>


            <div class="settings-content">

                <div class="setting-item">

                    <div>

                        <strong>
                            Dark Mode
                        </strong>

                        <small>
                            Change ChatX appearance
                        </small>

                    </div>

                    <button
                        class="setting-action"
                        onclick="toggleTheme(); updateSettingsTheme()"
                    >
                        🌙
                    </button>

                </div>


                <div class="setting-item">

                    <div>

                        <strong>
                            Clear Chat History
                        </strong>

                        <small>
                            Delete all saved conversations
                        </small>

                    </div>

                    <button
                        class="setting-danger"
                        onclick="clearRecentChats(); closeSettings()"
                    >
                        🗑️ Clear
                    </button>

                </div>


                <div class="setting-item">

                    <div>

                        <strong>
                            About ChatX
                        </strong>

                        <small>
                            AI assistant powered by Gemini
                        </small>

                    </div>

                    <span class="setting-info">
                        ChatX
                    </span>

                </div>

            </div>

        </div>

    `;


    document.body.appendChild(
        overlay
    );

}


// ==========================================
// CLOSE SETTINGS
// ==========================================

function closeSettings() {

    const overlay =
        document.querySelector(
            ".settings-overlay"
        );


    if (overlay) {

        overlay.remove();

    }

}


// ==========================================
// SETTINGS THEME ANIMATION
// ==========================================

function updateSettingsTheme() {

    const panel =
        document.querySelector(
            ".settings-panel"
        );


    if (panel) {

        panel.classList.add(
            "settings-refresh"
        );


        setTimeout(() => {

            panel.classList.remove(
                "settings-refresh"
            );

        }, 200);

    }

}


// ==========================================
// FILE SELECTION
// ==========================================

if (fileInput) {

    fileInput.addEventListener(
        "change",
        function () {

            const file =
                this.files[0];


            if (!file) {
                return;
            }


            selectedFile =
                file;


            console.log(
                "Selected file:",
                file.name
            );


            messageInput.placeholder =
                `Attached: ${file.name}`;

        }
    );

}


// ==========================================
// LOAD CHAT HISTORY
// ==========================================

function loadChatHistory() {

    renderHistory();

}


// ==========================================
// START CHATX
// ==========================================

loadTheme();

loadChatHistory();


// ==========================================
// VOICE INPUT
// ==========================================

function startVoiceInput() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

        alert(
            "Voice input is not supported in this browser."
        );

        return;

    }


    const recognition =
        new SpeechRecognition();


    recognition.lang =
        "en-US";


    recognition.continuous =
        false;


    recognition.interimResults =
        false;


    recognition.onstart =
        function () {

            const micButton =
                document.querySelector(
                    ".mic-btn"
                );


            if (micButton) {

                micButton.classList.add(
                    "recording"
                );


                micButton.textContent =
                    "🔴";

            }


            messageInput.placeholder =
                "Listening...";

        };


    recognition.onresult =
        function (event) {

            const transcript =
                event.results[0][0].transcript;


            messageInput.value =
                transcript;

        };


    recognition.onerror =
        function (event) {

            console.error(
                "Voice recognition error:",
                event.error
            );

        };


    recognition.onend =
        function () {

            const micButton =
                document.querySelector(
                    ".mic-btn"
                );


            if (micButton) {

                micButton.classList.remove(
                    "recording"
                );


                micButton.textContent =
                    "🎤";

            }


            messageInput.placeholder =
                selectedFile
                    ? `Attached: ${selectedFile.name}`
                    : "Message ChatX...";


            messageInput.focus();

        };


    recognition.start();

}


// ==========================================
// GLOBAL CLICK HANDLER
// ==========================================
//
// This handles BOTH:
// 1. Closing the mobile sidebar
// 2. Closing the Recent Chat options menu
//
// ==========================================

document.addEventListener(
    "click",
    function (event) {

        const sidebar =
            document.querySelector(
                ".sidebar"
            );


        const menuButton =
            document.querySelector(
                ".mobile-menu"
            );


        // ==========================================
        // MOBILE SIDEBAR
        // ==========================================

        if (
            sidebar &&
            sidebar.classList.contains("open") &&
            !sidebar.contains(event.target) &&
            (!menuButton ||
                !menuButton.contains(event.target))
        ) {

            sidebar.classList.remove(
                "open"
            );

        }


        // ==========================================
        // CHAT OPTIONS MENU
        // ==========================================

        const clickedChatMenu =
            event.target.closest(
                ".chat-options-menu"
            );


        const clickedChatMenuButton =
            event.target.closest(
                ".chat-menu-btn"
            );


        // If click is outside both the menu
        // and the three-dot button, close menus
        if (
            !clickedChatMenu &&
            !clickedChatMenuButton
        ) {

            document
                .querySelectorAll(
                    ".chat-options-menu"
                )
                .forEach(
                    menu => menu.remove()
                );

        }

    }
);

