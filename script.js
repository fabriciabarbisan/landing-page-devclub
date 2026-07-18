/* ============================================================
   3D WAVE GRID — "cortina" de cubos de frente para a câmera,
   cobrindo toda a área do hero. Cada cubo ondula sozinho para
   frente/trás (e um pouco para os lados) e reage à posição do
   mouse com uma ondulação que se propaga a partir do cursor,
   como se fosse um tecido sendo tocado.
   Implementado em Canvas 2D com projeção em perspectiva manual
   (sem dependências externas).
   ============================================================ */
function initWaveGrid(reduceMotion) {
  const canvas = document.getElementById('waveGridCanvas');
  const heroBg = canvas ? canvas.closest('.hero-bg') : null;
  if (!canvas || !heroBg) return;
  const ctx = canvas.getContext('2d');
  const isFinePointer = window.matchMedia('(pointer: fine)').matches;

  const spacing = 54;       // distância entre cubos (grade de frente)
  const cellFill = 0.6;     // fração do espaçamento ocupada pelo cubo
  const refDepth = 620;     // "distância" de referência da câmera até a cortina
  const waveAmp = 16;       // amplitude da ondulação ambiente (para frente/trás)
  const rippleAmp = 60;     // força do empurrão perto do mouse
  const swayAmp = 9;        // deslocamento sutil para os lados

  // paleta (mesma da página)
  const COL_FAR = [10, 40, 32];      // cubos "afastados" (tom próximo de --green-deep)
  const COL_NEAR = [76, 242, 174];   // --green
  const COL_HI = [216, 255, 92];     // --lime, brilho perto do mouse

  let W = 0, H = 0, dpr = 1;
  let cols = 0, rows = 0;

  let mouseWX = 0, mouseWY = 0;
  let smoothWX = 0, smoothWY = 0;

  function resize() {
    const rect = heroBg.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // densidade adaptada ao tamanho da tela, cobrindo sempre a área inteira
    const density = W < 640 ? 1.5 : W < 1000 ? 1.15 : 1;
    const step = spacing * density;
    cols = Math.ceil(W / step) + 2;
    rows = Math.ceil(H / step) + 2;
  }
  resize();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  function onPointerMove(e) {
    const rect = heroBg.getBoundingClientRect();
    if (e.clientY < rect.top || e.clientY > rect.bottom || e.clientX < rect.left || e.clientX > rect.right) return;
    mouseWX = (e.clientX - rect.left) - W / 2;
    mouseWY = (e.clientY - rect.top) - H / 2;
  }
  if (isFinePointer) {
    window.addEventListener('mousemove', onPointerMove, { passive: true });
  }

  function mix(a, b, t) {
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return (
      Math.round(a[0] + (b[0] - a[0]) * t) + ',' +
      Math.round(a[1] + (b[1] - a[1]) * t) + ',' +
      Math.round(a[2] + (b[2] - a[2]) * t)
    );
  }

  function roundRectPath(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  const start = performance.now();
  const density = () => (W < 640 ? 1.5 : W < 1000 ? 1.15 : 1);

  function render(now) {
    const t = (now - start) / 1000;
    smoothWX += (mouseWX - smoothWX) * 0.06;
    smoothWY += (mouseWY - smoothWY) * 0.06;

    ctx.clearRect(0, 0, W, H);
    const cx = W / 2;
    const cy = H / 2;
    const step = spacing * density();
    const size0 = step * cellFill;

    const cubes = [];
    for (let r = 0; r < rows; r++) {
      const gy0 = (r - (rows - 1) / 2) * step;
      for (let c = 0; c < cols; c++) {
        const gx0 = (c - (cols - 1) / 2) * step;

        // ondulação ambiente: para frente e para trás (eixo Z)
        let waveZ = (Math.sin(gx0 * 0.028 + gy0 * 0.02 + t * 0.75) +
                     Math.cos(gy0 * 0.03 - gx0 * 0.015 + t * 0.55)) * (waveAmp * 0.5);

        // empurrão perto do mouse, propagando como uma onda no tecido
        const dx = gx0 - smoothWX;
        const dy = gy0 - smoothWY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const proximity = Math.exp(-dist / 190);
        waveZ += proximity * Math.sin(dist * 0.045 - t * 3.4) * rippleAmp;

        // leve deslocamento para os lados, dando sensação de "pano" balançando
        const swayX = Math.sin(gy0 * 0.025 + t * 0.4) * swayAmp;
        const swayY = Math.cos(gx0 * 0.025 + t * 0.35) * swayAmp * 0.6;

        const scale = refDepth / (refDepth - waveZ);
        const sx = cx + (gx0 + swayX) * scale;
        const sy = cy + (gy0 + swayY) * scale;
        const size = size0 * scale;

        // não desenha cubos que saíram da área visível
        if (sx < -size || sx > W + size || sy < -size || sy > H + size) continue;

        const tNear = Math.max(0, Math.min(1, (scale - 0.82) / (1.35 - 0.82)));
        const glow = Math.min(1, proximity * 1.5);

        cubes.push({ sx, sy, size, scale, tNear, glow });
      }
    }

    // desenha do mais distante (menor) para o mais próximo (maior)
    cubes.sort((a, b) => a.scale - b.scale);

    for (let i = 0; i < cubes.length; i++) {
      const cb = cubes[i];
      const half = cb.size / 2;
      const color = mix(mix(COL_FAR, COL_NEAR, cb.tNear).split(',').map(Number), COL_HI, cb.glow);
      const alpha = 0.22 + cb.tNear * 0.55 + cb.glow * 0.2;

      roundRectPath(cb.sx - half, cb.sy - half, cb.size, cb.size, Math.max(2, cb.size * 0.16));
      ctx.fillStyle = 'rgba(' + color + ',' + Math.min(0.95, alpha).toFixed(3) + ')';
      ctx.fill();
      ctx.strokeStyle = 'rgba(' + mix(COL_NEAR, COL_HI, cb.glow) + ',' + Math.min(0.9, alpha + 0.18).toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  if (reduceMotion) {
    render(performance.now());
    return;
  }

  let raf = null;
  function loop(now) {
    render(now);
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  if ('IntersectionObserver' in window) {
    const hero = document.querySelector('.hero');
    new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (!raf) raf = requestAnimationFrame(loop);
        } else if (raf) {
          cancelAnimationFrame(raf);
          raf = null;
        }
      });
    }, { threshold: 0 }).observe(hero);
  }
}

/* ============================================================
   Pequenos ícones SVG originais e genéricos (sem imitar logos
   de marcas) usados nos chips de tecnologia e nos módulos bônus.
   ============================================================ */
function miniIcon(key) {
  const inner = {
    brackets: '<path d="M9 6L4 12l5 6M15 6l5 6-5 6" stroke-linecap="round" stroke-linejoin="round"/>',
    brush: '<path d="M12 3c3 4 6 7 6 10a6 6 0 1 1-12 0c0-3 3-6 6-10z" stroke-linecap="round" stroke-linejoin="round"/>',
    braces: '<path d="M9 4c-2 0-3 1-3 3v3c0 1-1 2-2 2 1 0 2 1 2 2v3c0 2 1 3 3 3M15 4c2 0 3 1 3 3v3c0 1 1 2 2 2-1 0-2 1-2 2v3c0 2-1 3-3 3" stroke-linecap="round" stroke-linejoin="round"/>',
    nodes: '<circle cx="12" cy="5" r="1.8" fill="currentColor" stroke="none"/><circle cx="6" cy="17" r="1.8" fill="currentColor" stroke="none"/><circle cx="18" cy="17" r="1.8" fill="currentColor" stroke="none"/><path d="M12 7l-4.7 8.3M12 7l4.7 8.3M7.5 17h9" stroke-linecap="round"/>',
    hex: '<path d="M12 3l7 4v10l-7 4-7-4V7l7-4z" stroke-linecap="round" stroke-linejoin="round"/>',
    branch: '<circle cx="6" cy="5" r="1.8" fill="currentColor" stroke="none"/><circle cx="6" cy="19" r="1.8" fill="currentColor" stroke="none"/><circle cx="17" cy="12" r="1.8" fill="currentColor" stroke="none"/><path d="M6 7v10M6 12c3 0 5-2.5 8.5-2.5" stroke-linecap="round"/>',
    swap: '<path d="M7 7h10M7 7l3-3M7 7l3 3M17 17H7M17 17l-3-3M17 17l-3 3" stroke-linecap="round" stroke-linejoin="round"/>',
    db: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" stroke-linecap="round" stroke-linejoin="round"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="M15 9l-2 6-6 2 2-6 6-2z" stroke-linejoin="round"/>',
    chat: '<path d="M4 5h16v11H9l-4 4V5z" stroke-linejoin="round" stroke-linecap="round"/>',
    doc: '<path d="M7 3h7l4 4v14H7V3z" stroke-linejoin="round" stroke-linecap="round"/><path d="M9 12h6M9 16h6" stroke-linecap="round"/>',
    profile: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="12" cy="10" r="2.6"/><path d="M7 17c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5" stroke-linecap="round"/>',
    briefcase: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 13h18" stroke-linecap="round"/>',
    bubbles: '<path d="M4 6h11v7H9l-3 3v-3H4V6z" stroke-linejoin="round" stroke-linecap="round"/><path d="M13 9h7v6h-2v3l-3-3h-2" stroke-linejoin="round" stroke-linecap="round"/>',
  };
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">' + (inner[key] || '') + '</svg>';
}

document.addEventListener('DOMContentLoaded', () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============ NAV: scroll state + mobile menu ============ */
  const nav = document.getElementById('nav');
  const backToTop = document.getElementById('backToTop');
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 12);
    backToTop.classList.toggle('show', window.scrollY > 700);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');
  menuToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('mobile-open');
    menuToggle.classList.toggle('open', open);
    menuToggle.setAttribute('aria-expanded', open);
  });
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    navLinks.classList.remove('mobile-open');
    menuToggle.classList.remove('open');
  }));

  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

  /* ============ 3D WAVE GRID (fundo do hero) ============ */
  initWaveGrid(reduceMotion);

  /* ============ MODAIS (login / matrícula) ============ */
  initModals();

  /* ============ CURSOR GLOW ============ */
  if (!reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    const glow = document.querySelector('.cursor-glow');
    window.addEventListener('mousemove', (e) => {
      glow.style.left = e.clientX + 'px';
      glow.style.top = e.clientY + 'px';
    });
  }

  /* ============ SCROLL REVEAL ============ */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach((el, i) => { el.style.setProperty('--i', i % 6); io.observe(el); });
  } else {
    revealEls.forEach(el => el.classList.add('in-view'));
  }

  /* ============ COUNT UP ============ */
  const counters = document.querySelectorAll('.count-up');
  const animateCount = (el) => {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1600;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(eased * target / 1000);
      if (p < 1) requestAnimationFrame(step); else el.textContent = Math.floor(target / 1000);
    };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { animateCount(entry.target); cio.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(c => cio.observe(c));
  }

  /* ============ HERO CODE TYPING ANIMATION ============ */
  const snippets = [
    {
      gutter: 6,
      html: [
        `<span class="tok-punc">&lt;</span><span class="tok-tag">section</span> <span class="tok-attr">class</span><span class="tok-punc">=</span><span class="tok-str">"hero"</span><span class="tok-punc">&gt;</span>`,
        `  <span class="tok-punc">&lt;</span><span class="tok-tag">h1</span><span class="tok-punc">&gt;</span>Vira Dev com a gente<span class="tok-punc">&lt;/</span><span class="tok-tag">h1</span><span class="tok-punc">&gt;</span>`,
        `  <span class="tok-punc">&lt;</span><span class="tok-tag">p</span><span class="tok-punc">&gt;</span>Front-end + Back-end<span class="tok-punc">&lt;/</span><span class="tok-tag">p</span><span class="tok-punc">&gt;</span>`,
        `  <span class="tok-punc">&lt;</span><span class="tok-tag">button</span><span class="tok-punc">&gt;</span>Quero começar<span class="tok-punc">&lt;/</span><span class="tok-tag">button</span><span class="tok-punc">&gt;</span>`,
        `<span class="tok-punc">&lt;/</span><span class="tok-tag">section</span><span class="tok-punc">&gt;</span>`,
      ],
    },
    {
      gutter: 6,
      html: [
        `<span class="tok-punc">.</span><span class="tok-fn">btn-primary</span> <span class="tok-punc">{</span>`,
        `  <span class="tok-key">background</span><span class="tok-punc">:</span> <span class="tok-str">#4CF2AE</span><span class="tok-punc">;</span>`,
        `  <span class="tok-key">border-radius</span><span class="tok-punc">:</span> <span class="tok-str">999px</span><span class="tok-punc">;</span>`,
        `  <span class="tok-key">transition</span><span class="tok-punc">:</span> <span class="tok-str">.3s ease</span><span class="tok-punc">;</span>`,
        `<span class="tok-punc">}</span>`,
      ],
    },
    {
      gutter: 6,
      html: [
        `<span class="tok-key">function</span> <span class="tok-fn">virarDev</span><span class="tok-punc">(</span><span class="tok-plain">aluno</span><span class="tok-punc">) {</span>`,
        `  aluno<span class="tok-punc">.</span>estudar<span class="tok-punc">();</span>`,
        `  aluno<span class="tok-punc">.</span>construirProjetos<span class="tok-punc">();</span>`,
        `  <span class="tok-key">return</span> <span class="tok-str">"dev fullstack"</span><span class="tok-punc">;</span>`,
        `<span class="tok-punc">}</span>`,
      ],
    },
  ];

  const codeContent = document.getElementById('codeContent');
  const typeCaret = document.getElementById('typeCaret');
  const gutter = document.getElementById('editorGutter');
  const statusMsg = document.getElementById('statusMsg');
  const terminalToast = document.getElementById('terminalToast');
  const tabs = document.querySelectorAll('.editor-tabs .tab');

  let snippetIndex = 0;
  let typingActive = false;

  function buildGutter(n) {
    gutter.innerHTML = Array.from({ length: n }, (_, i) => (i + 1)).join('\n');
  }

  function typeSnippet(snippet) {
    if (typingActive) return;
    typingActive = true;
    codeContent.innerHTML = '';
    terminalToast.classList.remove('show');
    statusMsg.textContent = 'compilando…';
    statusMsg.classList.remove('ok');
    buildGutter(snippet.html.length);

    const lines = snippet.html;
    let li = 0;

    function typeLine() {
      if (li >= lines.length) {
        typingActive = false;
        statusMsg.textContent = 'build ok';
        statusMsg.classList.add('ok');
        terminalToast.classList.add('show');
        setTimeout(() => {
          terminalToast.classList.remove('show');
          snippetIndex = (snippetIndex + 1) % snippets.length;
          tabs.forEach(t => t.classList.toggle('active', t.dataset.tab == snippetIndex));
          setTimeout(() => typeSnippet(snippets[snippetIndex]), 400);
        }, 1800);
        return;
      }
      const wrapper = document.createElement('div');
      wrapper.innerHTML = '';
      codeContent.appendChild(wrapper);
      const full = lines[li];
      // Reveal char by char but preserve HTML tags intact
      let charIndex = 0;
      const plain = full;
      function revealStep() {
        // find a safe slice that doesn't cut a tag in half
        charIndex += reduceMotion ? plain.length : Math.max(1, Math.round(plain.length / 26));
        let slice = plain.slice(0, charIndex);
        // ensure we don't leave an unclosed tag mid-attribute; close open tags naively
        const openCount = (slice.match(/</g) || []).length;
        const closeCount = (slice.match(/>/g) || []).length;
        if (openCount > closeCount) {
          const lastLt = slice.lastIndexOf('<');
          slice = slice.slice(0, lastLt);
        }
        wrapper.innerHTML = slice;
        if (charIndex < plain.length) {
          requestAnimationFrame(() => setTimeout(revealStep, reduceMotion ? 0 : 10));
        } else {
          wrapper.innerHTML = full;
          li++;
          setTimeout(typeLine, reduceMotion ? 0 : 90);
        }
      }
      revealStep();
    }
    typeLine();
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const idx = parseInt(tab.dataset.tab, 10);
      if (idx === snippetIndex || typingActive) return;
      snippetIndex = idx;
      tabs.forEach(t => t.classList.toggle('active', t === tab));
      typeSnippet(snippets[snippetIndex]);
    });
  });

  if (codeContent) {
    if ('IntersectionObserver' in window) {
      const eio = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !typingActive && codeContent.innerHTML === '') {
            typeSnippet(snippets[snippetIndex]);
          }
        });
      }, { threshold: 0.3 });
      eio.observe(document.getElementById('editorWindow'));
    } else {
      typeSnippet(snippets[0]);
    }
  }

  /* ============ MARQUEE CONTENT (empresas / formações / bônus) ============ */
  // nomes e marcas 100% fictícios, criados para ilustrar o layout — não representam empresas reais.
  const empresas = [
    { name: 'Nébula Cloud', mark: 'NC', color: '#4CF2AE' },
    { name: 'Vórtice Labs', mark: 'VL', color: '#8FA6FF' },
    { name: 'Raiz Sistemas', mark: 'RS', color: '#D8FF5C' },
    { name: 'Portoflow', mark: 'PF', color: '#4CF2AE' },
    { name: 'Zenith Digital', mark: 'ZD', color: '#FF8FA3' },
    { name: 'Kaya Software', mark: 'KS', color: '#8FA6FF' },
    { name: 'Bússola Tech', mark: 'BT', color: '#D8FF5C' },
    { name: 'Estúdio Prisma', mark: 'EP', color: '#4CF2AE' },
    { name: 'Trilha Ventures', mark: 'TV', color: '#FF8FA3' },
    { name: 'Órbita Systems', mark: 'OS', color: '#8FA6FF' },
  ];
  const empresasTrack = document.getElementById('empresasTrack');
  if (empresasTrack) {
    const html = empresas.map(e =>
      `<span class="company-pill"><i style="background:${e.color}1a;color:${e.color};border-color:${e.color}40">${e.mark}</i>${e.name}</span>`
    ).join('');
    empresasTrack.innerHTML = html + html;
  }

  const formacoes = ['Programação Front End', 'Programação Back End', 'Programação Full Stack', 'Programação Mobile', 'React', 'Node.js', 'JavaScript Completo', 'HTML5', 'CSS3', 'Git & GitHub', 'Lógica de Programação', 'Deploy & Cloud'];
  const formacoesTrack = document.getElementById('formacoesTrack');
  if (formacoesTrack) {
    const html = formacoes.map(f => `<span class="formacao-pill">${f}</span>`).join('');
    formacoesTrack.innerHTML = html + html;
  }

  const bonus = [
    ['Carreira Tech', 'Como conseguir a primeira vaga', 'compass'],
    ['Entrevistas', 'Simulando processos seletivos', 'chat'],
    ['Currículo Dev', 'Montando um portfólio forte', 'doc'],
    ['LinkedIn pra Devs', 'Se posicionando no mercado', 'profile'],
    ['Freelas', 'Primeiros projetos pagos', 'briefcase'],
    ['Soft Skills', 'Comunicação em times de tech', 'bubbles'],
  ];
  const bonusTrack = document.getElementById('bonusTrack');
  if (bonusTrack) {
    const html = bonus.map(([t, s, ico]) => `<div class="bonus-card"><div class="bonus-thumb"><span class="chip-ico">${miniIcon(ico)}</span></div><div class="bonus-info"><strong>${t}</strong><span>${s}</span></div></div>`).join('');
    bonusTrack.innerHTML = html + html;
  }

  const stack = [
    ['HTML5', '#FF6B5C', 'brackets'], ['CSS3', '#8FA6FF', 'brush'], ['JavaScript', '#D8FF5C', 'braces'], ['React', '#4CF2AE', 'nodes'],
    ['Node.js', '#4CF2AE', 'hex'], ['Git', '#FF8FA3', 'branch'], ['APIs REST', '#8FA6FF', 'swap'], ['Banco de Dados', '#D8FF5C', 'db'],
  ];
  const stackGrid = document.getElementById('stackGrid');
  if (stackGrid) {
    stackGrid.innerHTML = stack.map(([name, color, ico]) =>
      `<span class="stack-chip"><span class="chip-ico" style="background:${color}22;color:${color}">${miniIcon(ico)}</span>${name}</span>`
    ).join('');
  }

  /* ============ TESTIMONIAL CAROUSEL ============ */
  const track = document.getElementById('testiTrack');
  const cards = track ? Array.from(track.children) : [];
  const dotsWrap = document.getElementById('carouselDots');
  let testiIndex = 0;

  if (track && cards.length) {
    cards.forEach((_, i) => {
      const dot = document.createElement('span');
      if (i === 0) dot.classList.add('active');
      dot.addEventListener('click', () => goToTesti(i));
      dotsWrap.appendChild(dot);
    });

    function goToTesti(i) {
      testiIndex = (i + cards.length) % cards.length;
      track.style.transform = `translateX(-${testiIndex * 100}%)`;
      Array.from(dotsWrap.children).forEach((d, idx) => d.classList.toggle('active', idx === testiIndex));
    }

    document.getElementById('nextTesti').addEventListener('click', () => goToTesti(testiIndex + 1));
    document.getElementById('prevTesti').addEventListener('click', () => goToTesti(testiIndex - 1));

    let autoTimer = setInterval(() => goToTesti(testiIndex + 1), 6000);
    track.closest('.testimonial-carousel').addEventListener('mouseenter', () => clearInterval(autoTimer));
    track.closest('.testimonial-carousel').addEventListener('mouseleave', () => {
      autoTimer = setInterval(() => goToTesti(testiIndex + 1), 6000);
    });

    // swipe support
    let startX = 0;
    track.addEventListener('touchstart', e => startX = e.touches[0].clientX, { passive: true });
    track.addEventListener('touchend', e => {
      const diff = e.changedTouches[0].clientX - startX;
      if (diff > 50) goToTesti(testiIndex - 1);
      else if (diff < -50) goToTesti(testiIndex + 1);
    }, { passive: true });
  }

  /* ============ FAQ ACCORDION ============ */
  document.querySelectorAll('.faq-item').forEach(item => {
    const q = item.querySelector('.faq-q');
    const a = item.querySelector('.faq-a');
    q.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(other => {
        if (other !== item) {
          other.classList.remove('open');
          other.querySelector('.faq-a').style.maxHeight = null;
        }
      });
      item.classList.toggle('open', !isOpen);
      a.style.maxHeight = !isOpen ? a.scrollHeight + 'px' : null;
    });
  });

  /* ============ SALARY CHART BARS ============ */
  const chartCard = document.getElementById('chartCard');
  if (chartCard && 'IntersectionObserver' in window) {
    const bio = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll('.bar').forEach(bar => {
            bar.style.width = bar.dataset.width + '%';
          });
          bio.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    bio.observe(chartCard);
  }

  /* ============ SMOOTH ANCHOR SCROLL (offset for fixed nav) ============ */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const offset = 70;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });
});

/* ============================================================
   MODAIS — login ("Área do aluno") e matrícula ("Quero...").
   Formulários de demonstração: validam no navegador e mostram
   um estado de sucesso simulado, sem enviar dados a servidor
   nenhum (não há back-end nesse projeto).
   ============================================================ */
function initModals() {
  const overlay = document.getElementById('modalOverlay');
  const modals = {
    login: document.getElementById('modalLogin'),
    matricula: document.getElementById('modalMatricula'),
  };
  if (!overlay || !modals.login || !modals.matricula) return;

  let activeModal = null;
  let lastFocused = null;

  function resetForm(form) {
    if (!form) return;
    form.hidden = false;
    form.reset();
    form.querySelectorAll('.invalid').forEach((el) => el.classList.remove('invalid'));
    form.querySelectorAll('.field-error').forEach((el) => { el.textContent = ''; });
  }

  function setLoginMode(recovering) {
    const form = document.getElementById('formLogin');
    const senhaField = form.querySelector('[data-field="senha"]');
    const rememberField = form.querySelector('[data-field="lembrar"]');
    const senhaInput = form.querySelector('[name="senha"]');
    const title = document.getElementById('modalLoginTitle');
    const sub = document.getElementById('modalLoginSub');
    const submitLabel = form.querySelector('.modal-submit span');
    const forgotBtn = document.getElementById('forgotPasswordBtn');

    form.dataset.mode = recovering ? 'recover' : 'login';
    senhaField.style.display = recovering ? 'none' : '';
    rememberField.style.display = recovering ? 'none' : '';
    senhaInput.required = !recovering;
    title.textContent = recovering ? 'Recuperar senha' : 'Área do aluno';
    sub.textContent = recovering
      ? 'Informe seu e-mail — vamos simular o envio do link de recuperação.'
      : 'Entre com seu e-mail e senha para acessar a plataforma.';
    submitLabel.textContent = recovering ? 'Enviar link de recuperação' : 'Entrar';
    forgotBtn.textContent = recovering ? '← Voltar para o login' : 'Esqueci minha senha';
  }

  function resetModalState() {
    resetForm(document.getElementById('formLogin'));
    resetForm(document.getElementById('formMatricula'));
    document.getElementById('modalLoginSuccess').hidden = true;
    document.getElementById('modalMatriculaSuccess').hidden = true;
    document.getElementById('forgotPasswordBtn').hidden = false;
    setLoginMode(false);
  }

  function openModal(key, opts) {
    const modal = modals[key];
    if (!modal) return;
    opts = opts || {};

    Object.values(modals).forEach((m) => {
      m.classList.remove('open');
      m.setAttribute('aria-hidden', 'true');
    });
    resetModalState();

    if (key === 'matricula') {
      const title = document.getElementById('modalMatriculaTitle');
      const sub = document.getElementById('modalMatriculaSub');
      const select = document.getElementById('matriculaInteresse');
      const isMba = opts.interesse === 'MBA em Inteligência Artificial';
      if (select && opts.interesse) select.value = opts.interesse;
      if (title) title.textContent = isMba ? 'Quero minha pré-matrícula no MBA' : 'Quero fazer parte';
      if (sub) sub.textContent = isMba
        ? 'Preencha seus dados pra garantir sua vaga na turma do MBA.'
        : 'Preencha seus dados e dê o primeiro passo rumo ao primeiro emprego dev.';
    }

    lastFocused = document.activeElement;
    activeModal = modal;
    overlay.classList.add('open');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    setTimeout(() => {
      const firstField = modal.querySelector('input, select');
      if (firstField) firstField.focus();
    }, 250);
  }

  function closeModal() {
    if (!activeModal) return;
    overlay.classList.remove('open');
    activeModal.classList.remove('open');
    activeModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    activeModal = null;
  }

  document.querySelectorAll('[data-open-modal]').forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(trigger.getAttribute('data-open-modal'), {
        interesse: trigger.getAttribute('data-interesse') || '',
      });
    });
  });

  document.querySelectorAll('[data-close-modal]').forEach((el) => {
    el.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  document.getElementById('forgotPasswordBtn').addEventListener('click', () => {
    const form = document.getElementById('formLogin');
    setLoginMode(form.dataset.mode !== 'recover');
  });

  function validateForm(form) {
    let valid = true;
    let firstInvalid = null;
    const fields = form.querySelectorAll('input[required], select[required]');
    fields.forEach((input) => {
      if (input.offsetParent === null) return; // campo escondido (ex.: senha no modo recuperação)
      const errorEl = form.querySelector('[data-error-for="' + input.name + '"]');
      const isValid = input.checkValidity();
      input.classList.toggle('invalid', !isValid);
      if (errorEl) {
        let msg = '';
        if (!isValid) {
          if (input.validity.valueMissing) msg = 'Campo obrigatório';
          else if (input.validity.typeMismatch) msg = 'Formato inválido';
          else if (input.validity.tooShort) msg = 'Muito curto — confira o campo';
          else msg = 'Verifique este campo';
        }
        errorEl.textContent = msg;
      }
      if (!isValid) {
        valid = false;
        if (!firstInvalid) firstInvalid = input;
      }
    });
    if (!valid) {
      if (firstInvalid) firstInvalid.focus();
      if (activeModal) {
        activeModal.classList.remove('shake');
        void activeModal.offsetWidth;
        activeModal.classList.add('shake');
      }
    }
    return valid;
  }

  const formLogin = document.getElementById('formLogin');
  formLogin.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateForm(formLogin)) return;
    const recovering = formLogin.dataset.mode === 'recover';
    const successBox = document.getElementById('modalLoginSuccess');
    const h4 = successBox.querySelector('h4');
    const p = successBox.querySelector('p');
    if (recovering) {
      h4.textContent = 'Link enviado (simulação)!';
      p.textContent = 'Em um ambiente real, um e-mail de recuperação chegaria agora na sua caixa de entrada.';
    } else {
      h4.textContent = 'Login simulado com sucesso!';
      p.textContent = 'Em produção, você seria redirecionado(a) para a sua área do aluno agora.';
    }
    formLogin.hidden = true;
    document.getElementById('forgotPasswordBtn').hidden = true;
    successBox.hidden = false;
  });

  const formMatricula = document.getElementById('formMatricula');
  formMatricula.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateForm(formMatricula)) return;
    const nome = (formMatricula.querySelector('[name="nome"]').value || '').trim().split(' ')[0];
    const successBox = document.getElementById('modalMatriculaSuccess');
    successBox.querySelector('h4').textContent = nome ? 'Show, ' + nome + '! Recebemos seus dados.' : 'Recebemos seus dados!';
    formMatricula.hidden = true;
    successBox.hidden = false;
  });
}
