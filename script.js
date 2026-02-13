(function () {
    'use strict';

    /* ══════════════════════════════════════
       1. NEURAL NETWORK CANVAS (background)
       ══════════════════════════════════════ */
    const canvas = document.getElementById('neuralCanvas');
    const ctx = canvas.getContext('2d');
    let W, H, dpr;

    function resizeMain() {
        dpr = window.devicePixelRatio || 1;
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Init main canvas dimensions first
    resizeMain();

    // Config
    const NODE_COUNT = 100;
    const CONNECTION_DIST = 210;
    const MAX_LINE_ALPHA = 0.48;
    const GLOBAL_ALPHA = 0.7;
    const LINE_COLOR = '110, 170, 255';
    const NODE_COLORS = [
        { r: 94, g: 231, b: 255 },
        { r: 108, g: 140, b: 255 },
        { r: 100, g: 200, b: 255 },
    ];

    // Mouse (shared)
    const mouse = { x: W * 0.5, y: H * 0.5 };
    const smoothMouse = { x: W * 0.5, y: H * 0.5 };
    const MOUSE_RADIUS = 180;
    const ATTRACT_FORCE = 0.035;
    const LERP_SPEED = 0.08;

    window.addEventListener('mousemove', function (e) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    class Node {
        constructor() {
            this.x = Math.random() * W;
            this.y = Math.random() * H;
            this.vx = (Math.random() - 0.5) * 0.3;
            this.vy = (Math.random() - 0.5) * 0.3;
            this.baseRadius = 3 + Math.random() * 0.5;
            this.radius = this.baseRadius;
            this.influence = 0;
            var tint = NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)];
            this.colorR = tint.r + Math.round((Math.random() - 0.5) * 16);
            this.colorG = tint.g + Math.round((Math.random() - 0.5) * 16);
            this.colorB = tint.b;
            this.nodeRGB = this.colorR + ', ' + this.colorG + ', ' + this.colorB;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            var dx = smoothMouse.x - this.x;
            var dy = smoothMouse.y - this.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < MOUSE_RADIUS && dist > 1) {
                var force = ATTRACT_FORCE * (1 - dist / MOUSE_RADIUS);
                this.vx += (dx / dist) * force;
                this.vy += (dy / dist) * force;
                this.influence += (1 - dist / MOUSE_RADIUS - this.influence) * LERP_SPEED;
            } else {
                this.influence += (0 - this.influence) * LERP_SPEED;
            }
            this.vx *= 0.995;
            this.vy *= 0.995;
            var speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (speed > 1.5) { this.vx = (this.vx / speed) * 1.5; this.vy = (this.vy / speed) * 1.5; }
            if (this.x < 0) { this.x = 0; this.vx *= -1; }
            if (this.x > W) { this.x = W; this.vx *= -1; }
            if (this.y < 0) { this.y = 0; this.vy *= -1; }
            if (this.y > H) { this.y = H; this.vy *= -1; }
            this.radius += (this.baseRadius + this.influence * 2 - this.radius) * 0.1;
        }
        draw() {
            var g = this.influence;
            var opacity = Math.min(0.78 + g * 0.15, 0.95);
            ctx.shadowColor = 'rgba(' + this.nodeRGB + ', ' + (0.5 + g * 0.3).toFixed(2) + ')';
            ctx.shadowBlur = 9 + g * 7;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + this.nodeRGB + ', ' + opacity.toFixed(2) + ')';
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    var nodes = [];
    for (var i = 0; i < NODE_COUNT; i++) nodes.push(new Node());

    function animateNeural() {
        ctx.clearRect(0, 0, W, H);
        ctx.globalAlpha = GLOBAL_ALPHA;
        smoothMouse.x += (mouse.x - smoothMouse.x) * 0.12;
        smoothMouse.y += (mouse.y - smoothMouse.y) * 0.12;

        for (var i = 0; i < nodes.length; i++) nodes[i].update();

        ctx.shadowBlur = 0;
        for (var i = 0; i < nodes.length; i++) {
            var a = nodes[i];
            for (var j = i + 1; j < nodes.length; j++) {
                var b = nodes[j];
                var dx = a.x - b.x;
                var dy = a.y - b.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < CONNECTION_DIST) {
                    var pi = Math.max(a.influence, b.influence);
                    var alpha = Math.min(MAX_LINE_ALPHA * (1 - dist / CONNECTION_DIST) * (1 + pi * 0.5), 0.5);
                    var lw = (1.1 + (1 - dist / CONNECTION_DIST) * 0.3) * (1 + pi * 0.3);
                    var lr = Math.round(110 + pi * 20);
                    var lg = Math.round(170 + pi * 40);
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.strokeStyle = 'rgba(' + lr + ', ' + lg + ', 255, ' + alpha.toFixed(3) + ')';
                    ctx.lineWidth = lw;
                    ctx.stroke();
                }
            }
        }
        for (var i = 0; i < nodes.length; i++) nodes[i].draw();
        ctx.globalAlpha = 1;
        requestAnimationFrame(animateNeural);
    }


    /* ══════════════════════════════════════
       2. CHART CANVAS (right side mini neural overlay)
       ══════════════════════════════════════ */
    var chartCanvas = document.getElementById('chartCanvas');
    var cctx = chartCanvas ? chartCanvas.getContext('2d') : null;
    var cW = 0, cH = 0;
    var miniNodes = [];
    var MINI_COUNT = 25;

    function resizeChart() {
        if (!chartCanvas || !chartCanvas.parentElement) return;
        var rect = chartCanvas.parentElement.getBoundingClientRect();
        if (rect.width === 0) return;
        cW = rect.width;
        cH = rect.height;
        chartCanvas.width = cW * dpr;
        chartCanvas.height = cH * dpr;
        chartCanvas.style.width = cW + 'px';
        chartCanvas.style.height = cH + 'px';
        if (cctx) cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function MiniNodeCreate() {
        return {
            x: Math.random() * (cW || 400),
            y: Math.random() * (cH || 300),
            vx: (Math.random() - 0.5) * 0.2,
            vy: (Math.random() - 0.5) * 0.2,
            r: 1.5 + Math.random() * 1
        };
    }
    for (var i = 0; i < MINI_COUNT; i++) miniNodes.push(MiniNodeCreate());

    function animateChart() {
        if (!cctx || cW === 0) { requestAnimationFrame(animateChart); return; }
        cctx.clearRect(0, 0, cW, cH);
        cctx.globalAlpha = 0.5;

        for (var i = 0; i < miniNodes.length; i++) {
            var n = miniNodes[i];
            n.x += n.vx; n.y += n.vy;
            if (n.x < 0 || n.x > cW) n.vx *= -1;
            if (n.y < 0 || n.y > cH) n.vy *= -1;
            cctx.beginPath();
            cctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
            cctx.fillStyle = 'rgba(94, 231, 255, 0.3)';
            cctx.fill();
            for (var j = i + 1; j < miniNodes.length; j++) {
                var m = miniNodes[j];
                var dx = n.x - m.x, dy = n.y - m.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 100) {
                    cctx.beginPath();
                    cctx.moveTo(n.x, n.y);
                    cctx.lineTo(m.x, m.y);
                    cctx.strokeStyle = 'rgba(94, 231, 255, ' + (0.12 * (1 - dist / 100)).toFixed(3) + ')';
                    cctx.lineWidth = 0.5;
                    cctx.stroke();
                }
            }
        }

        // Mouse parallax on chart visual
        var heroVisual = document.getElementById('heroVisual');
        if (heroVisual) {
            var rect = heroVisual.getBoundingClientRect();
            var cx = (mouse.x - rect.left) / rect.width - 0.5;
            var cy = (mouse.y - rect.top) / rect.height - 0.5;
            heroVisual.style.transform = 'translate(' + (cx * 8) + 'px, ' + (cy * 8) + 'px)';
        }

        cctx.globalAlpha = 1;
        requestAnimationFrame(animateChart);
    }


    /* ══════════════════════════════════════
       3. CINEMATIC LOAD CHOREOGRAPHY
       ══════════════════════════════════════ */
    function runLoadAnimation() {
        // Hero card reveal
        setTimeout(function () {
            var el = document.getElementById('heroCard');
            if (el) el.classList.add('visible');
        }, 300);

        // Name tracking reveal
        document.querySelectorAll('.anim-tracking').forEach(function (el) {
            setTimeout(function () { el.classList.add('visible'); }, parseInt(el.dataset.delay));
        });

        // Word-by-word headline
        document.querySelectorAll('.word-reveal').forEach(function (el) {
            setTimeout(function () { el.classList.add('visible'); }, parseInt(el.dataset.delay));
        });

        // Role mask reveal
        document.querySelectorAll('.anim-mask').forEach(function (el) {
            setTimeout(function () { el.classList.add('visible'); }, parseInt(el.dataset.delay));
        });

        // Quote fade
        document.querySelectorAll('.anim-fade').forEach(function (el) {
            setTimeout(function () { el.classList.add('visible'); }, parseInt(el.dataset.delay));
        });

        // Buttons stagger
        document.querySelectorAll('.anim-slide').forEach(function (el) {
            setTimeout(function () { el.classList.add('visible'); }, parseInt(el.dataset.delay));
        });

        // Chart draw
        setTimeout(function () {
            document.querySelectorAll('.chart-draw, .chart-draw-fill').forEach(function (el) {
                el.classList.add('visible');
            });
        }, 3600);

        // Data dots and labels
        document.querySelectorAll('.data-dot, .chart-label').forEach(function (el) {
            setTimeout(function () { el.classList.add('visible'); }, parseInt(el.dataset.delay));
        });
    }


    /* ══════════════════════════════════════
       4. HERO CARD TILT ON MOUSE
       ══════════════════════════════════════ */
    var heroCard = document.getElementById('heroCard');
    if (heroCard) {
        heroCard.addEventListener('mousemove', function (e) {
            var rect = heroCard.getBoundingClientRect();
            var x = (e.clientX - rect.left) / rect.width - 0.5;
            var y = (e.clientY - rect.top) / rect.height - 0.5;
            heroCard.style.transform = 'perspective(800px) rotateY(' + (x * 3) + 'deg) rotateX(' + (-y * 3) + 'deg)';
        });
        heroCard.addEventListener('mouseleave', function () {
            heroCard.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg)';
        });
    }


    /* ══════════════════════════════════════
       5. RESIZE HANDLER (all canvases)
       ══════════════════════════════════════ */
    window.addEventListener('resize', function () {
        resizeMain();
        resizeChart();
    });


    /* ══════════════════════════════════════
       6. INIT
       ══════════════════════════════════════ */
    resizeChart();
    animateNeural();
    animateChart();
    setTimeout(runLoadAnimation, 100);


    /* ══════════════════════════════════════
       7. ML PIPELINE FLOW LOGIC
       ══════════════════════════════════════ */
    var pipeSection = document.getElementById('capabilities');
    if (pipeSection) {

        // 1. SEQUENTIAL REVEAL (Card -> Line -> Card...)
        var pipeObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;

                pipeSection.classList.add('in-view');

                var cards = pipeSection.querySelectorAll('.pipe-card');
                var lines = pipeSection.querySelectorAll('.pipe-conn');

                // Reveal sequence Loop
                cards.forEach(function (card, index) {
                    var baseTime = index * 550; // Stagger

                    // Reveal Card
                    setTimeout(function () {
                        card.classList.add('revealed');
                    }, baseTime);

                    // Reveal Connecting Line (after card)
                    if (lines[index]) {
                        setTimeout(function () {
                            lines[index].style.strokeDashoffset = '0';
                            lines[index].classList.add('active');
                        }, baseTime + 300);
                    }
                });

                pipeObserver.unobserve(pipeSection);
            });
        }, { threshold: 0.15 });

        pipeObserver.observe(pipeSection);


        // 2. MOUSE PARALLAX
        var container = pipeSection.querySelector('.pipeline-container');
        var wash = pipeSection.querySelector('.pipeline-wash');
        var rafId = null;
        var targetX = 0, targetY = 0;
        var currentX = 0, currentY = 0;

        if (container) {
            // Smooth Animation Loop
            function updateParallax() {
                // Lerp current to target
                currentX += (targetX - currentX) * 0.08;
                currentY += (targetY - currentY) * 0.08;

                // Update styles (only if significant change to save paint)
                if (Math.abs(targetX - currentX) > 0.001 || Math.abs(targetY - currentY) > 0.001) {
                    container.style.transform = 'scale(1) translate(' + (currentX * -6) + 'px, ' + (currentY * -6) + 'px)';
                    if (wash) wash.style.transform = 'translate(' + (currentX * 10) + 'px, ' + (currentY * 10) + 'px)';
                }

                rafId = requestAnimationFrame(updateParallax);
            }
            // Start loop
            updateParallax();

            pipeSection.addEventListener('mousemove', function (e) {
                if (window.innerWidth < 800) return;

                // FREEZE if hovering a card to prevent jitter/conflict
                if (e.target.closest('.pipe-card')) return;

                // Calculate target (-1 to 1)
                targetX = (e.clientX / window.innerWidth - 0.5) * 2;
                targetY = (e.clientY / window.innerHeight - 0.5) * 2;
            });

            pipeSection.addEventListener('mouseleave', function () {
                targetX = 0;
                targetY = 0;
            });
        }
    }


    /* ══════════════════════════════════════
       8. PROJECT SHOWCASE LOGIC
       ══════════════════════════════════════ */
    var projectSection = document.getElementById('projects');
    if (projectSection) {

        var projObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;

                var panel = entry.target;
                panel.classList.add('in-view');

                // Trigger Count Animation (for metrics card)
                // Use slight delay to match CSS reveal
                setTimeout(function () {
                    var counters = panel.querySelectorAll('.counter-anim');
                    counters.forEach(function (c) {
                        animateCounter(c);
                    });

                    // Trigger Bar Growth
                    var bars = panel.querySelectorAll('.bar-fill');
                    bars.forEach(function (b) {
                        b.style.height = b.dataset.height || '0%';
                    });

                }, 2200); // 2.2s as requested in choreography

                projObserver.unobserve(panel);
            });
        }, { threshold: 0.15, rootMargin: "-50px" });

        // Observe each panel independently for per-scroll reveal
        document.querySelectorAll('.project-panel').forEach(function (p) {
            projObserver.observe(p);
        });

        // Helper: Counter Animation
        function animateCounter(el) {
            var target = parseInt(el.getAttribute('data-target'));
            var duration = 2000;
            var start = null;

            function step(timestamp) {
                if (!start) start = timestamp;
                var progress = Math.min((timestamp - start) / duration, 1);
                var ease = 1 - Math.pow(1 - progress, 3); // Cubic Out

                el.innerText = Math.floor(ease * target) + "%";
                if (progress < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        }
    }

    /* ══════════════════════════════════════
       9. CREDENTIALS LOGIC
       ══════════════════════════════════════ */
    var credSection = document.getElementById('credentials');
    if (credSection) {
        var credObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    credSection.classList.add('active');
                    credObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });
        credObserver.observe(credSection);
    }

    /* ══════════════════════════════════════
       10. CONTACT LOGIC
       ══════════════════════════════════════ */
    var contactSection = document.getElementById('contact');
    if (contactSection) {
        // Toggle Active
        var contactObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    contactSection.classList.add('active');
                    contactObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });
        contactObserver.observe(contactSection);

        // Magnetic Effect
        var magnets = document.querySelectorAll('.magnetic-btn');
        magnets.forEach(function (btn) {
            btn.addEventListener('mousemove', function (e) {
                var rect = btn.getBoundingClientRect();
                var x = e.clientX - rect.left - rect.width / 2;
                var y = e.clientY - rect.top - rect.height / 2;

                // Limit range
                x = Math.max(-20, Math.min(20, x));
                y = Math.max(-20, Math.min(20, y));

                // Apply transform
                btn.style.transform = "translate(" + (x * 0.3) + "px, " + (y * 0.3) + "px) scale(1.05)";
            });

            btn.addEventListener('mouseleave', function () {
                btn.style.transform = "translate(0, 0) scale(1)";
            });
        });
    }

    /* ══════════════════════════════════════
       11. PROJECT VISIBILITY LOGIC (FIX)
       ══════════════════════════════════════ */
    var projectPanels = document.querySelectorAll('.project-panel');
    if (projectPanels.length > 0) {
        var projObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    projObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        projectPanels.forEach(function (panel) {
            projObserver.observe(panel);
        });
    }

    /* ══════════════════════════════════════
       12. NUMBER COUNTER ANIMATION
       ══════════════════════════════════════ */
    var counters = document.querySelectorAll('.counter-anim');
    if (counters.length > 0) {
        var counterObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    var el = entry.target;
                    var target = parseInt(el.getAttribute('data-target'));
                    if (!isNaN(target)) {
                        animateCounter(el, target);
                    }
                    counterObserver.unobserve(el);
                }
            });
        }, { threshold: 0.5 });

        counters.forEach(function (counter) {
            counterObserver.observe(counter);
        });

        function animateCounter(el, target) {
            var current = 0;
            var duration = 2000; // 2s
            var startTime = null;

            function step(timestamp) {
                if (!startTime) startTime = timestamp;
                var progress = timestamp - startTime;
                var percent = Math.min(progress / duration, 1);

                // Ease Out Quad
                var ease = 1 - (1 - percent) * (1 - percent);

                el.innerText = Math.round(ease * target) + "%";

                if (progress < duration) {
                    window.requestAnimationFrame(step);
                }
            }
            window.requestAnimationFrame(step);
        }
    }

})();
