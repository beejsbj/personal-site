---
title: "Building a Beat-Syncing UI"
subtitle: "Inspired by Hi-Fi Rush"
date: "2024-11-12T18:46:17.177Z"
slug: "building-a-beat-syncing-ui"
canonical: "https://buroojs.substack.com/p/building-a-beat-syncing-ui"
cover: "https://substack-post-media.s3.amazonaws.com/public/images/f19f30eb-212f-4d42-ae3b-35efac018cbb_3360x1738.png"
description: "Inspired by Hi-Fi Rush"
---

<p>When I first played <em>Hi-Fi Rush</em>, the rhythm-based action gameplay lit up something in my mind—what if I could make a UI dance to the beat too? Inspired by the game, I set out to create a small interactive demo where shapes "dance" in sync with a beat, changing colors and animations as they pulse to music. Here's a breakdown of how I built it, so you can jump in and maybe try your own remix.</p>

<h3>Step 1: Laying Out the HTML Structure</h3>

<p>At the core of this experiment is a simple HTML structure of shapes and a song selector. Each shape in the UI represents a different beat frequency (quarter, half, double, etc.), creating a complex visual rhythm as the animations sync with the tempo.</p>

<pre><code>&lt;div class="parent"&gt;
    &lt;div class="dancer shape square common-beat"&gt;&lt;/div&gt;
    &lt;div class="dancer shape line quarter-beat"&gt;&lt;/div&gt;
    &lt;div class="dancer shape triangle third-beat"&gt;&lt;/div&gt;
    &lt;!-- More shapes here --&gt;
    &lt;p class='common-beat dancer'&gt;
        Beats per Minute: &lt;span class='bpm'&gt;&lt;/span&gt;
    &lt;/p&gt;
    &lt;form class='dancer common-beat'&gt;
        &lt;!-- Song choices here --&gt;
        &lt;button class='dancer common-beat rotate'&gt;
            Play
        &lt;/button&gt;
    &lt;/form&gt;
&lt;/div&gt;</code></pre>

<p>Each <code>.dancer</code> class in the markup is a beat-timed element that we control through CSS animations and JavaScript. The <code>bpm</code> field shows the current tempo, and a song choice form lets users pick different tracks to vibe with.</p>

<h3>Step 2: CSS Animations to Match the Beat</h3>

<p>Here, CSS handles the heavy lifting for animation timing, color shifts, and shape manipulation. I set up the CSS variables to represent different beat times based on the BPM (beats per minute), allowing us to scale the animations in real time.</p>

<pre><code>html {
    --bpm: 100; /* Initial BPM, updated in JS */
    --common-time-beat: calc(60s / var(--bpm));
    --quarter-time-beat: calc(var(--common-time-beat) * 4);
    /* Additional beat calculations for timing variations */
}

@keyframes beat {
    0% { scale: 0.8; }
    14% { scale: 1.1; box-shadow: -5px -5px var(--color); }
    96% { scale: 1; }
    100% { scale: 0.8; }
}

@keyframes rotate {
    0% { transform: rotate(-5deg); }
    14% { transform: rotate(3deg); }
    100% { transform: rotate(10deg); }
}
</code></pre>

<p>Each shape, like <code>.square</code> or <code>.hexagon</code>, has specific animations applied at different beat intervals. This creates the visual illusion of each shape "dancing" to a unique beat, adding variety and depth to the animation.</p>

<h3>Step 3: Syncing Animations to Music with JavaScript</h3>

<p>The JavaScript here connects everything together. I used the <code>music-tempo</code> library to calculate the tempo of each audio track, which then drives the animations.</p>

<h4>Setting up the BPM</h4>

<p>Once a track is selected and played, we calculate its BPM and set the root variable <code>--bpm</code> based on that tempo.</p>

<pre><code>async function addAnimation() {
    const bpm = (await calcTempo()).tempo;
    $bpm.innerHTML = bpm;
    $html.style.setProperty("--bpm", bpm);
    $dancers.forEach(function (dancer) {
        dancer.style.animation =
            "var(--beat-time) var(--action, beat) infinite forwards";
    });
}</code></pre>

<p>This function updates the <code>--bpm</code> variable, which in turn recalculates all timing-related CSS variables like <code>--quarter-time-beat</code>, <code>--double-time-beat</code>, etc., ensuring that each element’s animation frequency matches the song’s tempo.</p>

<h4>Animating the Colors</h4>

<p>The colors shift based on the beat duration, giving the UI a dynamic, pulsing feel that syncs with the track. Using <code>setInterval</code>, I updated the hue to slowly evolve, which adds another layer of visual interest to the composition.</p>

<pre><code>function shiftColors(beatDuration) {
    setInterval(() =&gt; {
        let hue = 36 + Number($html.style.getPropertyValue("--hue"));
        $html.style.setProperty("--hue", hue);
    }, beatDuration * 4 * 1000);
}</code></pre>

<h3>Step 4: Audio Analysis for Tempo Detection</h3>

<p>Finally, using an <code>AudioContext</code>, we fetch and decode audio data to get the tempo with <code>music-tempo</code>. This was key for synchronizing animations without manually defining the tempo for each track.</p>

<pre><code>async function getAudioBufferData(url) {
    let context = new AudioContext();
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await context.decodeAudioData(arrayBuffer);
    return audioBuffer;
}

async function calcTempo() {
    const buffer = await getAudioBufferData(trackUrl);
    let audioData = buffer.getChannelData(0);
    let mt = new musicTempo(audioData);
    return mt;
}</code></pre>

<p>The function <code>calcTempo</code> performs the tempo analysis, providing the BPM necessary to drive the animations. Once we have the tempo, it’s off to the beat-driven races!</p>

<h3>Final Thoughts</h3>

<p>This project turned out to be a fun blend of CSS, JavaScript, and a bit of music analysis. Watching shapes dance in sync with the beat was incredibly satisfying and gave me a whole new appreciation for interactive UI elements.</p>

<p>check it out https://codepen.io/beejsbj/pen/BaeoNPG</p>
