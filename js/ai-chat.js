// js/ai-chat.js
import { escapeHTML } from './main.js'; // Assuming escapeHTML is exported from main.js

const aiChatToggleButton = document.getElementById('ai-chat-toggle-button');
const aiChatWidgetContainer = document.getElementById('ai-chat-widget-container');
const aiChatCloseButton = document.getElementById('ai-chat-close-button');
const aiChatLog = document.getElementById('ai-chat-log');
const aiChatInput = document.getElementById('ai-chat-input');
const aiChatSendButton = document.getElementById('ai-chat-send-button');

function addChatMessageToLog(message, sender = 'user') { 
    if (!aiChatLog) return; 
    const messageDiv = document.createElement('div'); 
    messageDiv.classList.add('p-2.5','rounded-lg','max-w-[85%]','text-sm','leading-relaxed','break-words','shadow-md'); 
    const sanitizedMessage = escapeHTML(message);
    if(sender === 'user'){messageDiv.classList.add('bg-indigo-600','text-white','self-end','ml-auto'); messageDiv.innerHTML = sanitizedMessage;}
    else if(sender === 'ai'){messageDiv.classList.add('bg-slate-700','text-slate-100','self-start','mr-auto'); let fmtMsg = sanitizedMessage.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>'); messageDiv.innerHTML = fmtMsg;}
    else if(sender === 'ai-loading'){messageDiv.classList.add('bg-slate-600','text-slate-300','self-start','mr-auto','italic'); messageDiv.innerHTML = `<i>${sanitizedMessage}</i>`; messageDiv.id='ai-loading-message';}
    else if(sender === 'ai-error'){messageDiv.classList.add('bg-red-600','text-red-100','self-start','mr-auto'); messageDiv.innerHTML = `<strong>Error:</strong> ${sanitizedMessage}`;}
    aiChatLog.appendChild(messageDiv); aiChatLog.scrollTop = aiChatLog.scrollHeight;
}

async function handleChatMessageSend() { 
    if(!aiChatInput || !aiChatSendButton) return; 
    const userQuery = aiChatInput.value.trim(); if(!userQuery) return;
    addChatMessageToLog(userQuery,'user'); 
    const origInput = aiChatInput.value; aiChatInput.value = ''; aiChatInput.disabled = true; aiChatSendButton.disabled = true;
    const existingLoadMsg = document.getElementById('ai-loading-message'); if(existingLoadMsg) existingLoadMsg.remove(); 
    addChatMessageToLog('AI is thinking...','ai-loading');
    
    const netUser = window.netlifyIdentity ? window.netlifyIdentity.currentUser() : null; 
    let hdrs = {'Content-Type':'application/json'};
    if(netUser){try{const tk = await netUser.jwt(true); hdrs['Authorization']=`Bearer ${tk}`; console.log("AI Chat: JWT sent for", netUser.email);}catch(e){console.error("AI Chat JWT err:",e);}} else {console.log("AI Chat: guest user for chat.");}
    
    try {
        const response = await fetch('/.netlify/functions/ask-gemini-enhanced', {method:'POST',headers:hdrs,body:JSON.stringify({userQuery})});
        const loadMsg = document.getElementById('ai-loading-message'); if(loadMsg)loadMsg.remove();
        if(!response.ok){const errTxt = await response.text(); let errMsg = `AI Error ${response.status}`; try{errMsg = JSON.parse(errTxt).error || errMsg;}catch(e){} addChatMessageToLog(errMsg,'ai-error'); console.error("AI Chat func err:",errTxt); aiChatInput.value = origInput; return;}
        const data = await response.json(); addChatMessageToLog(data.answer || "No AI answer.",'ai');
    } catch(err_cli) { 
        const ldMsg = document.getElementById('ai-loading-message'); if(ldMsg)ldMsg.remove(); 
        addChatMessageToLog('Connection error.','ai-error'); console.error("AI Chat fetch err:",err_cli); aiChatInput.value = origInput;
    } finally {
        aiChatInput.disabled = false; aiChatSendButton.disabled = false; if(!aiChatInput.value) aiChatInput.focus();
    }
}

export function initAiChat() {
    if (aiChatToggleButton && aiChatWidgetContainer && aiChatCloseButton && aiChatLog && aiChatInput && aiChatSendButton) {
        aiChatToggleButton.addEventListener('click', () => { 
            aiChatWidgetContainer.classList.toggle('hidden'); 
            aiChatWidgetContainer.classList.toggle('flex'); 
            if(!aiChatWidgetContainer.classList.contains('hidden')){
                aiChatInput.focus(); 
                if(aiChatLog.children.length === 0) addChatMessageToLog("Hi! I'm the SD CampusCoders AI.",'ai');
            }
        });
        aiChatCloseButton.addEventListener('click', () => {  
            aiChatWidgetContainer.classList.add('hidden'); 
            aiChatWidgetContainer.classList.remove('flex');
        });
        aiChatSendButton.addEventListener('click', handleChatMessageSend);
        aiChatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleChatMessageSend(); }});
        console.log("AI Chat Initialized.");
    } else {
        // console.warn("AI Chat widget elements not fully found during init.");
    }
}