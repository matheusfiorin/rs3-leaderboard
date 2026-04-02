/* =============================================
   RS3 Leaderboard — AI Chat (Claude Haiku)
   Direct browser-to-API, no backend needed
   ============================================= */

let chatApiKey = '';
let chatHistory = [];
let chatStreaming = false;

function buildSystemPrompt() {
  const lang = currentLang;
  const players = data; // from script.js global

  let playerContext = '';
  if (players && players.length === 2) {
    for (const p of players) {
      const skillLines = SKILLS.map(sk => {
        const s = p.skills[sk.id] || { level: 1, xp: 0 };
        return `${tSkill(sk.id)}: ${s.level} (${s.xp} xp)`;
      }).join(', ');

      playerContext += `\n**${p.name}**: Combat ${p.combatLevel}, Total Level ${p.totalLevel}, Total XP ${p.totalXp}, Quests ${p.questsDone}/${p.totalQuests}, RuneScore ${p.runeScore}\nSkills: ${skillLines}\n`;
    }
  }

  const ptPrompt = `Voce e um assistente especializado em RuneScape 3 (RS3). Voce ajuda dois jogadores brasileiros que estao descobrindo o jogo juntos.

DADOS DOS JOGADORES (atualizados):
${playerContext}

REGRAS:
- Responda sempre em portugues brasileiro
- Use os nomes oficiais em PT-BR para habilidades (Ataque, Defesa, Forca, etc.)
- Seja direto e pratico — eles querem dicas acionaveis
- Quando recomendar treino, considere os niveis ATUAIS dos dois jogadores
- Recomende atividades que possam fazer JUNTOS quando possivel
- Para quests, verifique se os pre-requisitos de nivel sao atendidos
- Mencione a RS3 Wiki (pt.runescape.wiki) como referencia quando relevante
- Nao invente informacoes — se nao souber, diga que nao sabe
- Respostas curtas e focadas (maximo 3-4 paragrafos)
- Use formatacao simples: **negrito** para destaques, listas com - para itens`;

  const enPrompt = `You are an assistant specialized in RuneScape 3 (RS3). You help two players who are discovering the game together.

PLAYER DATA (current):
${playerContext}

RULES:
- Be direct and practical — they want actionable tips
- When recommending training, consider BOTH players' current levels
- Recommend activities they can do TOGETHER when possible
- For quests, verify level prerequisites are met
- Reference the RS3 Wiki when relevant
- Don't make up information — say you don't know if unsure
- Keep responses short and focused (max 3-4 paragraphs)
- Use simple formatting: **bold** for highlights, - for list items`;

  return lang === 'pt' ? ptPrompt : enPrompt;
}

async function sendChatMessage(userMessage) {
  if (chatStreaming || !chatApiKey || !userMessage.trim()) return;

  chatStreaming = true;
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');
  const msgList = document.getElementById('chat-msg-list');

  input.disabled = true;
  sendBtn.disabled = true;

  // Add user message
  chatHistory.push({ role: 'user', content: userMessage });
  appendChatMsg('user', userMessage);

  // Add streaming assistant placeholder
  const assistantEl = appendChatMsg('assistant', '', true);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': chatApiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: buildSystemPrompt(),
        messages: chatHistory.slice(-20), // keep last 20 messages for context
        stream: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(response.status === 401 ? (currentLang === 'pt' ? 'API key invalida' : 'Invalid API key') : `API error: ${response.status}`);
    }

    // Stream the response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6);
        if (jsonStr === '[DONE]') continue;

        try {
          const event = JSON.parse(jsonStr);
          if (event.type === 'content_block_delta' && event.delta?.text) {
            fullText += event.delta.text;
            assistantEl.textContent = fullText;
            msgList.scrollTop = msgList.scrollHeight;
          }
        } catch (_) {}
      }
    }

    assistantEl.classList.remove('streaming');
    chatHistory.push({ role: 'assistant', content: fullText });

  } catch (err) {
    assistantEl.classList.remove('streaming');
    assistantEl.textContent = '';
    appendChatMsg('system', err.message);
    // Remove the failed assistant message from history
    if (chatHistory[chatHistory.length - 1]?.role === 'user') {
      chatHistory.pop();
    }
  }

  chatStreaming = false;
  input.disabled = false;
  sendBtn.disabled = false;
  input.value = '';
  input.focus();
}

function appendChatMsg(role, text, streaming) {
  const msgList = document.getElementById('chat-msg-list');
  const div = document.createElement('div');
  div.className = `chat-msg ${role}${streaming ? ' streaming' : ''}`;
  div.textContent = text;
  msgList.appendChild(div);
  msgList.scrollTop = msgList.scrollHeight;
  return div;
}

function initChat() {
  const keyInput = document.getElementById('chat-api-key');
  const keySubmit = document.getElementById('chat-key-submit');
  const keyPrompt = document.getElementById('chat-key-prompt');
  const messages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');

  if (!keySubmit) return;

  keySubmit.addEventListener('click', () => {
    const key = keyInput.value.trim();
    if (!key) return;
    chatApiKey = key;
    chatHistory = [];
    keyPrompt.style.display = 'none';
    messages.classList.remove('hidden');
    chatInput.focus();
    sendBtn.disabled = false;

    // Welcome message
    const lang = currentLang;
    const welcome = lang === 'pt'
      ? 'Ola! Sou seu assistente RS3. Tenho acesso aos stats de Fiorovizk e Decxus. Pergunte sobre treino, quests, gear, money making, ou qualquer coisa do jogo!'
      : 'Hi! I\'m your RS3 assistant. I have access to Fiorovizk and Decxus stats. Ask about training, quests, gear, money making, or anything about the game!';
    appendChatMsg('system', welcome);
  });

  keyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') keySubmit.click();
  });

  sendBtn.addEventListener('click', () => {
    sendChatMessage(chatInput.value);
  });

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage(chatInput.value);
    }
  });
}
