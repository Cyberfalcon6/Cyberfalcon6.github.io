/* ================================================
   CONFETTI ENGINE
   ================================================ */
const canvas = document.getElementById('confetti-canvas');
const ctx    = canvas.getContext('2d');
let pieces   = [];
let raining  = true;

const COLORS = [
    '#B87380','#5C1E2D','#D4A4AE','#EDD8DC',
    '#C9A873','#8C3345','#F2E4E6','#A05060',
    '#E8C9CE','#D4896A','#F5EDE8','#C4846A'
];

function resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function makePiece(x, y, burst) {
    return {
        x:      x ?? Math.random() * canvas.width,
        y:      y ?? -10,
        w:      Math.random() * 11 + 4,
        h:      Math.random() * 7  + 3,
        color:  COLORS[Math.floor(Math.random() * COLORS.length)],
        rot:    Math.random() * 360,
        rotSpd: (Math.random() - 0.5) * (burst ? 14 : 5),
        vx:     (Math.random() - 0.5) * (burst ? 9 : 2.5),
        vy:     burst ? -(Math.random() * 7 + 3) : Math.random() * 2.8 + 1.8,
        grav:   burst ? 0.28 : 0,
        alpha:  1,
        circle: Math.random() > 0.45,
        burst:  !!burst
    };
}

(function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (raining && pieces.filter(p => !p.burst).length < 60) {
        for (let i = 0; i < 3; i++) pieces.push(makePiece());
    }
    pieces = pieces.filter(p => {
        p.x   += p.vx;
        p.y   += p.vy;
        p.rot += p.rotSpd;
        if (p.burst) { p.vy += p.grav; p.alpha -= 0.025; }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * Math.PI / 180);
        ctx.fillStyle = p.color;
        if (p.circle) {
            ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill();
        } else {
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();

        return p.burst ? p.alpha > 0 : p.y < canvas.height + 20;
    });
    requestAnimationFrame(loop);
})();

setTimeout(() => { raining = false; }, 3000);

/* click burst */
document.addEventListener('click', e => {
    if (e.target.closest('.lightbox') || e.target.closest('.nav-arrow') || e.target.closest('.dot-nav')) return;
    for (let i = 0; i < 10; i++) pieces.push(makePiece(e.clientX, e.clientY, true));
});

/* Floating layer unused — removed to reduce DOM churn */

/* ================================================
   SLIDE ENGINE
   ================================================ */
const slides    = Array.from(document.querySelectorAll('.slide'));
const dots      = Array.from(document.querySelectorAll('.dot'));
const prevBtn   = document.getElementById('prevBtn');
const nextBtn   = document.getElementById('nextBtn');
const topBar    = document.getElementById('topBar');
const tbTitle   = document.getElementById('tbTitle');
const tbCounter = document.getElementById('tbCounter');
const dotNav    = document.getElementById('dotNav');

let current     = 0;
let busy        = false;

/* Detect if a slide uses a dark or light theme */
function isDark(slide) {
    return slide.classList.contains('slide-dark');
}

/* Update all persistent UI elements to match the current slide */
function syncUI() {
    const slide = slides[current];
    const dark  = isDark(slide);
    const theme = dark ? 'theme-dark' : 'theme-light';

    tbTitle.textContent   = slide.dataset.title;
    tbCounter.textContent = `${current + 1} / ${slides.length}`;

    topBar.className  = `top-bar ${theme}`;
    dotNav.className  = `dot-nav ${theme}`;
    prevBtn.className = `nav-arrow prev-btn ${theme}`;
    nextBtn.className = `nav-arrow next-btn ${theme}`;

    /* Keep warning class on sdBar if already present */
    const warn = document.getElementById('sdBar')?.classList.contains('warning') ? ' warning' : '';
    const sdBarEl = document.getElementById('sdBar');
    if (sdBarEl) sdBarEl.className = `sd-bar ${theme}${warn}`;

    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === slides.length - 1;

    dots.forEach((d, i) => {
        d.classList.toggle('is-active', i === current);
    });
}

/* Navigate to a target slide in a given direction (+1 / -1) */
function goTo(target, dir) {
    if (busy || target === current || target < 0 || target >= slides.length) return;
    busy = true;

    const oldSlide = slides[current];
    const newSlide = slides[target];

    /* 1. Place new slide off-screen (no transition yet) */
    newSlide.style.transition = 'none';
    newSlide.classList.add(dir > 0 ? 'from-right' : 'from-left');
    newSlide.classList.remove('is-active');

    /* Force reflow so the browser registers the initial position */
    void newSlide.offsetWidth;

    /* 2. Re-enable transitions */
    newSlide.style.transition = '';

    /* 3. Fire both animations simultaneously */
    requestAnimationFrame(() => {
        /* Exit old slide */
        oldSlide.classList.add(dir > 0 ? 'to-left' : 'to-right');
        oldSlide.classList.remove('is-active');

        /* Enter new slide */
        newSlide.classList.remove('from-right', 'from-left');
        newSlide.classList.add('is-active', 'just-in');

        /* Reset old slide scroll position */
        oldSlide.scrollTop = 0;

        current = target;
        syncUI();

        /* Cleanup after animation */
        setTimeout(() => {
            oldSlide.classList.remove('to-left', 'to-right');
            newSlide.classList.remove('just-in');
            busy = false;
        }, 560);
    });
}

/* Arrow buttons */
prevBtn.addEventListener('click', () => goTo(current - 1, -1));
nextBtn.addEventListener('click', () => goTo(current + 1, +1));

/* Dot buttons */
dots.forEach(dot => {
    dot.addEventListener('click', () => {
        const target = parseInt(dot.dataset.go, 10);
        goTo(target, target > current ? 1 : -1);
    });
});

/* Keyboard navigation */
document.addEventListener('keydown', e => {
    if (lightbox.classList.contains('active')) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown')  goTo(current + 1, +1);
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')    goTo(current - 1, -1);
});

/* Touch / swipe navigation */
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', e => {
    if (lightbox.classList.contains('active')) return;

    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    /* Only treat as a horizontal swipe if horizontal movement dominates */
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 45) {
        if (dx < 0) goTo(current + 1, +1);  /* swipe left  → next */
        else         goTo(current - 1, -1);  /* swipe right → prev */
    }
}, { passive: true });

/* Initial sync */
syncUI();

/* Mark first slide with just-in so content animates on load */
setTimeout(() => {
    slides[0].classList.add('just-in');
    setTimeout(() => slides[0].classList.remove('just-in'), 700);
}, 100);

/* ================================================
   SELF-DESTRUCT TIMER
   ================================================ */
const sdBar     = document.getElementById('sdBar');
const sdTime    = document.getElementById('sdTime');
const expOverlay= document.getElementById('expiredOverlay');

/* Expires at midnight at the end of June 4 2026 (local time) */
const EXPIRY = new Date(2026, 5, 5, 0, 0, 0); // month is 0-indexed

function pad(n) { return String(n).padStart(2, '0'); }

function tickTimer() {
    const diff = EXPIRY - Date.now();

    if (diff <= 0) {
        clearInterval(timerTick);
        sdTime.textContent = '00:00:00';
        triggerExpiry();
        return;
    }

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    sdTime.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;

    /* Warn when under an hour */
    sdBar.classList.toggle('warning', h < 1);
}

function triggerExpiry() {
    /* Let confetti run one last burst across the screen, then fade to expired */
    raining = true;
    setTimeout(() => { raining = false; }, 2000);
    setTimeout(() => { expOverlay.classList.add('active'); }, 2400);
}

tickTimer();
const timerTick = setInterval(tickTimer, 1000);

/* ================================================
   LIGHTBOX
   ================================================ */
const PHOTOS = ['1.jpeg','2.jpeg','3.jpeg','4.jpeg','5.jpeg'];
let lbIdx    = 0;

const lightbox = document.getElementById('lightbox');
const lbImg    = document.getElementById('lbImg');
const lbCap    = document.getElementById('lbCap');

function openLB(idx) {
    lbIdx = idx;
    lbImg.src     = PHOTOS[idx];
    lbCap.textContent = `Natacha  ·  ${idx + 1} / ${PHOTOS.length}`;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLB() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
}

function shiftLB(dir) {
    lbIdx = (lbIdx + dir + PHOTOS.length) % PHOTOS.length;
    lbImg.src     = PHOTOS[lbIdx];
    lbCap.textContent = `Natacha  ·  ${lbIdx + 1} / ${PHOTOS.length}`;
}

document.querySelectorAll('.g-item').forEach(item => {
    item.addEventListener('click', () => openLB(parseInt(item.dataset.idx, 10)));
});

document.getElementById('lbClose').addEventListener('click', closeLB);
document.getElementById('lbPrev') .addEventListener('click', e => { e.stopPropagation(); shiftLB(-1); });
document.getElementById('lbNext') .addEventListener('click', e => { e.stopPropagation(); shiftLB(+1); });
lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLB(); });

document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape')     closeLB();
    if (e.key === 'ArrowLeft')  shiftLB(-1);
    if (e.key === 'ArrowRight') shiftLB(+1);
});
