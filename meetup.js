/* =============================================
   RS3 Leaderboard — Meetup / Encontros
   Session plans for playing together
   ============================================= */

const MEETUPS = [
  {
    id: '2026-04-01',
    date: '2026-04-01',
    duration: '3h',
    title: {
      pt: 'Primeiro de Abril em Gielinor',
      en: 'April Fools in Gielinor',
    },
    subtitle: {
      pt: 'Pascoa, Dungeon juntos, e corrida de quests',
      en: 'Easter event, Dungeoneering duo, and quest race',
    },
    blocks: [
      {
        time: '0:00 - 0:45',
        icon: '\uD83E\uDD5A',
        title: { pt: 'Blooming Burrow — Evento de Pascoa', en: 'Blooming Burrow — Easter Event' },
        desc: {
          pt: 'Encontrem-se no Grand Exchange. Vao juntos pro portal ao norte do GE que leva ao Blooming Burrow. Completem o tutorial da Egg Hunt se ainda nao fizeram, e cachem os ovos dourados da Semana 1 juntos. Comparem as pistas e troquem dicas. Gastem Spring Tokens na loja Grand Eggs-change.',
          en: 'Meet at the Grand Exchange. Head north to the Blooming Burrow portal together. Complete the Egg Hunt tutorial if not done, then hunt Week 1 golden eggs together. Compare clues and share tips. Spend Spring Tokens at Grand Eggs-change.',
        },
        tips: {
          pt: [
            'Fale com Nougat Bunny pra liberar a primeira pista da semana',
            'Sao 7 ovos por semana (3 sao F2P)',
            'Cada ovo da 200 Spring Tokens + 10 Treasure Trail Points',
            'Aproveitem pra pegar as decoracoes e cosmeticos no hub',
          ],
          en: [
            'Talk to Nougat Bunny to unlock the first clue of the week',
            '7 eggs per week (3 are F2P)',
            'Each egg gives 200 Spring Tokens + 10 Treasure Trail Points',
            'Grab decorations and cosmetics at the hub while there',
          ],
        },
        rewards: {
          pt: 'Spring Tokens, Treasure Trail Points, cosmeticos de Pascoa',
          en: 'Spring Tokens, Treasure Trail Points, Easter cosmetics',
        },
      },
      {
        time: '0:45 - 1:45',
        icon: '\uD83C\uDFF0',
        title: { pt: 'Dungeoneering Duo — Daemonheim', en: 'Dungeoneering Duo — Daemonheim' },
        desc: {
          pt: 'Vao pra Daemonheim (teleporte pelo anel de Kinship ou corra pro norte de Al Kharid). Formem um grupo de 2 e facam andares juntos! E a unica habilidade do jogo feita pra co-op. Fiorovizk ta no DG 33 e Decxus no DG 23, entao facam andares no nivel de quem ta mais baixo (complexity 6 pra max XP). Tentem fazer 4-5 andares em 1 hora.',
          en: 'Head to Daemonheim (kinship ring teleport or run north of Al Kharid). Form a party of 2 and do floors together! It\'s the only skill designed for co-op. Fiorovizk is DG 33 and Decxus DG 23, so do floors at the lower level (complexity 6 for max XP). Try to clear 4-5 floors in 1 hour.',
        },
        tips: {
          pt: [
            'Usem Complexity 6 (maximo) pra XP maximo',
            'Facam andares de 1 ate o andar mais alto que Decxus pode fazer',
            'Nao esquecam de resetar os andares se ja completaram todos',
            'Guardem o token de XP de Dungeon (tome of xp) se ganharem',
            'Combinem estilos: um tanque melee/necro, outro range/mage',
          ],
          en: [
            'Use Complexity 6 (maximum) for max XP',
            'Do floors 1 up to the highest Decxus can access',
            'Reset floors if you\'ve completed them all',
            'Save Dungeoneering XP tokens if you get any',
            'Mix combat styles: one tank melee/necro, other range/mage',
          ],
        },
        rewards: {
          pt: 'XP de Dungeoneering, tokens de DG, itens de recompensa',
          en: 'Dungeoneering XP, DG tokens, reward items',
        },
      },
      {
        time: '1:45 - 2:30',
        icon: '\uD83C\uDFC1',
        title: { pt: 'Corrida de Quests!', en: 'Quest Race!' },
        desc: {
          pt: 'Hora da competicao! Voces dois vao comecar a mesma quest ao mesmo tempo e ver quem termina primeiro. Quest escolhida: "A Shadow over Ashdale" — nenhum dos dois fez, nao tem pre-requisitos, e uma quest de combate curta com historia legal. Depois, se sobrar tempo, facam "A Soul\'s Bane" juntos (tambem nenhum dos dois fez, sem pre-req).',
          en: 'Time for competition! Both start the same quest at the same time and race to finish. Chosen quest: "A Shadow over Ashdale" — neither has done it, no prerequisites, short combat quest with cool story. If time remains, do "A Soul\'s Bane" together (also neither has done it, no prereqs).',
        },
        tips: {
          pt: [
            'A Shadow over Ashdale: fale com Gudrik em Taverley pra comecar',
            'E uma quest instanciada (cada um faz na sua instancia)',
            'Nivel de combate de voces e mais que suficiente',
            'A Soul\'s Bane: fale com Launa a leste de Varrock (ponte sobre o rio)',
            'Quem perder a corrida paga um item de 10K GP pro outro no GE!',
          ],
          en: [
            'A Shadow over Ashdale: talk to Gudrik in Taverley to start',
            'It\'s an instanced quest (each in their own instance)',
            'Your combat levels are more than enough',
            'A Soul\'s Bane: talk to Launa east of Varrock (bridge over river)',
            'Loser of the race buys a 10K GP item for the winner at GE!',
          ],
        },
        rewards: {
          pt: '2+ quests completadas, XP de combate, bragging rights',
          en: '2+ quests completed, combat XP, bragging rights',
        },
      },
      {
        time: '2:30 - 3:00',
        icon: '\uD83C\uDF1F',
        title: { pt: 'Grand Exchange — Loot, Planejamento & Chill', en: 'Grand Exchange — Loot, Plan & Chill' },
        desc: {
          pt: 'Voltem pro GE. Vendam qualquer loot que pegaram. Comparem stats no site (atualizem o placar!). Planejem as metas pra proxima sessao: Fiorovizk precisa de 64 Ranged pra Temple at Senntisten, Decxus pode focar em subir Prayer pra desbloquear curses tambem. Discutam quais quests cada um quer fazer solo antes do proximo encontro.',
          en: 'Head back to GE. Sell any loot. Compare stats on the leaderboard site (refresh the board!). Plan goals for next session: Fiorovizk needs 64 Ranged for Temple at Senntisten, Decxus can focus on Prayer for curses too. Discuss which quests to solo before the next meetup.',
        },
        tips: {
          pt: [
            'Checkem o preco dos itens que pegaram antes de vender',
            'Aproveitem pra comprar gear nova se subiram de nivel',
            'Fiorovizk: comprar melhor arco pro novo Ranged level',
            'Decxus: considerar comecar a treinar Ranged tambem',
            'Tirem screenshot juntos no GE pra marcar o encontro!',
          ],
          en: [
            'Check item prices before selling',
            'Buy new gear if you leveled up',
            'Fiorovizk: buy a better bow for the new Ranged level',
            'Decxus: consider starting Ranged training too',
            'Take a screenshot together at GE to mark the meetup!',
          ],
        },
        rewards: {
          pt: 'GP do loot, planejamento, amizade fortalecida',
          en: 'GP from loot, planning done, friendship strengthened',
        },
      },
    ],
    summary: {
      pt: {
        questsTarget: ['A Shadow over Ashdale', 'A Soul\'s Bane'],
        xpExpected: 'DG: ~15-20K cada, Combat: ~10-15K, Quest XP variado',
        gpExpected: 'Spring Tokens + loot de Dungeon + quest rewards',
        funFactor: 'Corrida de quest, DG co-op, easter event juntos',
      },
      en: {
        questsTarget: ['A Shadow over Ashdale', 'A Soul\'s Bane'],
        xpExpected: 'DG: ~15-20K each, Combat: ~10-15K, Quest XP varies',
        gpExpected: 'Spring Tokens + Dungeon loot + quest rewards',
        funFactor: 'Quest race, DG co-op, easter event together',
      },
    },
  },
];

function renderMeetup() {
  const lang = currentLang;
  const el = document.querySelector('#meetup-content');
  if (!el) return;

  // Show the most recent/current meetup
  const meetup = MEETUPS[0];
  if (!meetup) {
    el.innerHTML = `<div style="text-align:center;color:var(--text-3);padding:40px">${lang === 'pt' ? 'Nenhum encontro planejado ainda.' : 'No meetups planned yet.'}</div>`;
    return;
  }

  const m = meetup;
  const saved = JSON.parse(localStorage.getItem('rs3lb-meetup') || '{}');

  el.innerHTML = `
    <div class="meetup-hero">
      <div class="meetup-hero-emoji">\uD83E\uDD1D</div>
      <h2 class="meetup-hero-title">${m.title[lang] || m.title.en}</h2>
      <p class="meetup-hero-sub">${m.date} &middot; ${m.duration} &middot; ${m.subtitle[lang] || m.subtitle.en}</p>
    </div>

    <div class="meetup-timeline">
      ${m.blocks.map((b, i) => {
        const key = `${m.id}_${i}`;
        const done = saved[key];
        return `
          <div class="meetup-block ${done ? 'done' : ''}">
            <div class="meetup-block-sidebar">
              <div class="meetup-block-dot ${done ? 'done' : ''}">${done ? '\u2713' : (i + 1)}</div>
              ${i < m.blocks.length - 1 ? '<div class="meetup-block-line"></div>' : ''}
            </div>
            <div class="meetup-block-content">
              <div class="meetup-block-header">
                <div>
                  <div class="meetup-block-time">${b.time}</div>
                  <div class="meetup-block-title">${b.icon} ${b.title[lang] || b.title.en}</div>
                </div>
                <label class="meetup-check-label">
                  <input type="checkbox" class="meetup-check" data-key="${key}" ${done ? 'checked' : ''}>
                  <span class="meetup-check-text">${done ? (lang === 'pt' ? 'Feito!' : 'Done!') : (lang === 'pt' ? 'Marcar' : 'Mark')}</span>
                </label>
              </div>
              <p class="meetup-block-desc">${b.desc[lang] || b.desc.en}</p>
              <div class="meetup-block-tips">
                <div class="meetup-tips-title">${lang === 'pt' ? 'Dicas' : 'Tips'}:</div>
                <ul>${(b.tips[lang] || b.tips.en).map(t => `<li>${t}</li>`).join('')}</ul>
              </div>
              <div class="meetup-block-reward">
                <span class="meetup-reward-icon">\uD83C\uDF81</span>
                ${b.rewards[lang] || b.rewards.en}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <div class="meetup-summary">
      <h3>${lang === 'pt' ? 'Resumo da Sessao' : 'Session Summary'}</h3>
      <div class="meetup-summary-grid">
        <div class="meetup-summary-item">
          <div class="meetup-summary-label">\uD83D\uDCDC ${lang === 'pt' ? 'Quests Alvo' : 'Target Quests'}</div>
          <div class="meetup-summary-value">${(m.summary[lang] || m.summary.en).questsTarget.join(', ')}</div>
        </div>
        <div class="meetup-summary-item">
          <div class="meetup-summary-label">\u2B50 ${lang === 'pt' ? 'XP Esperado' : 'Expected XP'}</div>
          <div class="meetup-summary-value">${(m.summary[lang] || m.summary.en).xpExpected}</div>
        </div>
        <div class="meetup-summary-item">
          <div class="meetup-summary-label">\uD83D\uDCB0 ${lang === 'pt' ? 'GP Esperado' : 'Expected GP'}</div>
          <div class="meetup-summary-value">${(m.summary[lang] || m.summary.en).gpExpected}</div>
        </div>
        <div class="meetup-summary-item">
          <div class="meetup-summary-label">\uD83C\uDF89 ${lang === 'pt' ? 'Diversao' : 'Fun Factor'}</div>
          <div class="meetup-summary-value">${(m.summary[lang] || m.summary.en).funFactor}</div>
        </div>
      </div>
    </div>
  `;

  // Checkbox persistence
  el.querySelectorAll('.meetup-check').forEach(cb => {
    cb.addEventListener('change', () => {
      const s = JSON.parse(localStorage.getItem('rs3lb-meetup') || '{}');
      if (cb.checked) s[cb.dataset.key] = true; else delete s[cb.dataset.key];
      localStorage.setItem('rs3lb-meetup', JSON.stringify(s));
      renderMeetup(); // re-render for visual update
    });
  });
}
