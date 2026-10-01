---
title: "Building API3’s OEV Comparison Tool: Interactive Data Visualization Done Right"
date: "2024-11-14T22:34:51.627Z"
slug: "building-api3s-oev-comparison-tool"
canonical: "https://buroojs.substack.com/p/building-api3s-oev-comparison-tool"
cover: "https://substackcdn.com/image/fetch/$s_!qg0x!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F48fa12b4-ff38-4048-a493-2858a254b4d8_3352x1874.png"
description: "Visualizing blockchain data in a way that’s accessible and engaging is no easy task."
---

<p>Visualizing blockchain data in a way that’s accessible and engaging is no easy task. API3’s Oracle Extractable Value (OEV) comparison tool needed to do just that—allow users to compare up to four protocols simultaneously on metrics like Total Liquidated Value, Potential OEV Lost, and Blockspace Auction Bribes. This tool had to be powerful for seasoned users, but intuitive enough for newcomers. Here’s how we brought it to life using Vue.js, GSAP, and Chart.js.</p>

<figure><img src="https://substackcdn.com/image/fetch/$s_!qg0x!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F48fa12b4-ff38-4048-a493-2858a254b4d8_3352x1874.png" srcset="https://substackcdn.com/image/fetch/$s_!qg0x!,w_424,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F48fa12b4-ff38-4048-a493-2858a254b4d8_3352x1874.png 424w, https://substackcdn.com/image/fetch/$s_!qg0x!,w_848,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F48fa12b4-ff38-4048-a493-2858a254b4d8_3352x1874.png 848w, https://substackcdn.com/image/fetch/$s_!qg0x!,w_1272,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F48fa12b4-ff38-4048-a493-2858a254b4d8_3352x1874.png 1272w, https://substackcdn.com/image/fetch/$s_!qg0x!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F48fa12b4-ff38-4048-a493-2858a254b4d8_3352x1874.png 1456w" sizes="(min-width: 800px) 720px, 100vw" alt="" width="1456" height="814" loading="lazy" decoding="async"></figure>

<hr>

<h3>The Challenge</h3>

<p>This wasn’t just a simple chart. We needed an interactive experience that gave users the flexibility to select metrics, visualize them side-by-side, and explore data smoothly across devices. The goal: a tool that felt as engaging as it was informative, without overwhelming users.</p>

<hr>

<h3>Core Architecture</h3>

<p>At the heart of the OEV tool are three main components:</p>

<ol><li><p><strong>Pinia Store</strong>: A robust state management solution to handle protocol data and user interactions.</p></li><li><p><strong>Custom Bar Chart</strong>: Built with html and css</p></li><li><p><strong>Charts.js Line Chart:</strong> Built with Chart.js, giving users a clear, dynamic view of protocol metrics.</p></li><li><p><strong>Protocol Selector</strong>: An interactive component that allows users to group and filter protocols by blockchain networks.</p></li></ol>

<hr>

<h3>Building the OEV Interface Chart</h3>

<figure><img src="https://substackcdn.com/image/fetch/$s_!8b6U!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fc89c1074-2ef7-4018-9ae3-58a1e370a5cb_800x447.gif" srcset="https://substackcdn.com/image/fetch/$s_!8b6U!,w_424,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fc89c1074-2ef7-4018-9ae3-58a1e370a5cb_800x447.gif 424w, https://substackcdn.com/image/fetch/$s_!8b6U!,w_848,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fc89c1074-2ef7-4018-9ae3-58a1e370a5cb_800x447.gif 848w, https://substackcdn.com/image/fetch/$s_!8b6U!,w_1272,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fc89c1074-2ef7-4018-9ae3-58a1e370a5cb_800x447.gif 1272w, https://substackcdn.com/image/fetch/$s_!8b6U!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fc89c1074-2ef7-4018-9ae3-58a1e370a5cb_800x447.gif 1456w" sizes="(min-width: 800px) 720px, 100vw" alt="" width="800" height="447" loading="lazy" decoding="async"></figure>

<p>The core of this tool is the OEVInterfaceChart, which dynamically compares metrics across selected protocols. Here’s how we approached it:</p>

<h4>Dynamic Bar Generation</h4>

<p>The chart needed bars with heights that adjust dynamically based on the highest value across selected metrics. This makes it easy for users to instantly grasp relative protocol performance.</p>

<pre><code>const maxHeight = computed(() =&gt; {
  const values = [
    {
      isShown: visibleBars.value.includes("totalSentToBuilderUSD"),
      value: getMaxValue("totalSentToBuilderUSD"),
    },
    {
      isShown: visibleBars.value.includes("totalProfitUSD"),
      value: getMaxValue("totalProfitUSD"),
    },
    // ... other metrics
  ];

  return Math.max(
    ...values.filter((value) =&gt; value.isShown).map((value) =&gt; value.value)
  );
});</code></pre>

<h4>Customizable Metric Display</h4>

<p>To keep the tool adaptable, we included a flexible legend system that lets users toggle different metrics on and off. This gives users the freedom to visualize the data that matters most to them.</p>

<pre><code>const bars = [
  {
    label: "Blockspace Auction Bribes",
    value: "totalSentToBuilderUSD",
    color: colors[2],
  },
  {
    label: "Liquidator Profits",
    value: "totalProfitUSD",
    color: colors[3],
  },
  // ... other metrics
];</code></pre>

<h4>Responsive Bar Heights</h4>

<p>Each bar’s height is calculated dynamically, while ensuring that no bar dips below a minimum visibility threshold.</p>

<pre><code>function barHeight(value) {
  let minHeight = 5; // Minimum height for visibility
  const maxHeightPixels = 350; // Maximum height in pixels
  const scaledHeight = (value / maxHeight.value) * maxHeightPixels;
  return Math.max(scaledHeight, minHeight);
}</code></pre>

<h4>Optimizing for Mobile with Smooth Scrolling</h4>

<p>On mobile, we needed to ensure users could easily scroll through multiple metrics. GSAP handled this effortlessly with smooth horizontal scrolling.</p>

<pre><code>useGsap((gsap) =&gt; {
  handleButton = (direction) =&gt; {
    const carousel = barsList.value;
    scrollPosition.value = carousel.clientWidth;
    const currentScroll = carousel.scrollLeft;
    const newScroll = direction &gt; 0
      ? currentScroll + scrollPosition.value
      : currentScroll - scrollPosition.value;

    gsap.to(carousel, {
      scrollTo: { x: newScroll }
    });
  };
});</code></pre>

<h4>Styling for Clarity</h4>

<p>To keep the chart clean and readable, we designed a styling system that ensured hierarchy and visual distinction across multiple bars and protocols.</p>

<pre><code>.bar {
  display: grid;
  grid-template-columns: repeat(var(--grid-count), 1fr);
  gap: var(--space-xs);
  height: 100%;
  align-items: end;
  
  span {
    position: relative;
    background: linear-gradient(180deg, var(--color), transparent);
    border: 1px solid;
    border-image: linear-gradient(
      180deg,
      color-mix(in hsl, var(--color), white 35%),
      color-mix(in hsl, var(--color), black 70%)
    ) 1;
  }
}</code></pre>

<hr>

<h3>Managing State with Pinia</h3>

<p>The OEV tool’s Pinia store was crucial for handling protocol data and user selections, allowing users to add or hide protocols and keeping everything in sync.</p>

<pre><code>export const useOEVStore = defineStore("oev", function () {
  const userSelectedProtocols = ref({
    "dApp-1": "morphoAaveV2-1",
    "dApp-2": "venusBsc-56",
    "dApp-3": "morphoComp-1",
    "dApp-4": "compoundV3Base-8453",
  });

  function toggleHide(protocol) {
    if (!protocol.hide &amp;&amp; protocols.value.filter((p) =&gt; !p.hide).length === 1) {
      return;
    }
    protocol.hide = !protocol.hide;
    checkHideCount(protocol);
  }
});</code></pre>

<hr>

<h3>Dynamic Visualization with Chart.js</h3>

<figure><img src="https://substackcdn.com/image/fetch/$s_!quMs!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F119d09c5-b675-4010-84a8-f56c161c4eb9_3352x1874.png" srcset="https://substackcdn.com/image/fetch/$s_!quMs!,w_424,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F119d09c5-b675-4010-84a8-f56c161c4eb9_3352x1874.png 424w, https://substackcdn.com/image/fetch/$s_!quMs!,w_848,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F119d09c5-b675-4010-84a8-f56c161c4eb9_3352x1874.png 848w, https://substackcdn.com/image/fetch/$s_!quMs!,w_1272,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F119d09c5-b675-4010-84a8-f56c161c4eb9_3352x1874.png 1272w, https://substackcdn.com/image/fetch/$s_!quMs!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F119d09c5-b675-4010-84a8-f56c161c4eb9_3352x1874.png 1456w" sizes="(min-width: 800px) 720px, 100vw" alt="" width="1456" height="814" loading="lazy" decoding="async"></figure>

<p>The chart needed to handle both logarithmic and linear scales while keeping transitions smooth between data updates. We extended Chart.js with custom plugins to handle zoom and responsive layouts.</p>

<pre><code>const options = computed(() =&gt; {
  return {
    scales: {
      y: {
        type: isLogarithmic.value ? "logarithmic" : "linear",
        alignToPixels: true,
        ticks: {
          callback: function (value) {
            return formatNumber(value);
          },
        }
      }
    },
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: ui.isMobile ? 0.9 : 1.75,
  };
});</code></pre>

<hr>

<h3>Performance Optimizations</h3>

<p>To make sure the tool remained fast and responsive, we implemented several optimizations:</p>

<ul><li><p><strong>Computed Properties</strong>: We used computed properties for heavy calculations to keep the app running smoothly.</p></li><li><p><strong>Lazy Loading</strong>: Protocol data is loaded only when needed, so initial load times stay low.</p></li><li><p><strong>Efficient DOM Updates</strong>: Vue’s virtual DOM helped ensure only essential updates were rendered.</p></li><li><p><strong>Smart State Management</strong>: By structuring our state thoughtfully, we minimized unnecessary re-renders.</p></li></ul>

<h3>Key Takeaways</h3>

<p>Building API3’s OEV tool wasn’t just about data visualization—it was about creating an engaging, responsive experience that lets users make sense of complex protocol data quickly and intuitively. Here’s what we learned:</p>

<ul><li><p><strong>State Management is Essential</strong>: Pinia helped keep everything from protocol selections to bar heights in sync.</p></li><li><p><strong>Animation Matters</strong>: GSAP timelines allowed us to create smooth, coordinated animations that didn’t disrupt performance.</p></li><li><p><strong>Designing for Mobile First</strong>: Thinking mobile-first made sure we delivered a responsive experience without sacrificing functionality on larger screens.</p></li><li><p><strong>Performance-First Mindset</strong>: With a focus on lazy loading, smart state management, and efficient updates, we kept the tool fast and enjoyable to use.</p></li></ul>

<hr>

<h3>Wrapping Up</h3>

<p>API3’s OEV comparison tool shows what’s possible when Vue.js, GSAP, and Chart.js come together. This project helped make complex data more approachable, all while keeping the experience fast and visually engaging across devices. For anyone exploring blockchain protocol data, this tool turns complex insights into something anyone can interact with and understand.</p>

<figure><img src="https://substackcdn.com/image/fetch/$s_!lLPB!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F99b2adb2-6bbb-4178-b844-6166727d3691_800x447.gif" srcset="https://substackcdn.com/image/fetch/$s_!lLPB!,w_424,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F99b2adb2-6bbb-4178-b844-6166727d3691_800x447.gif 424w, https://substackcdn.com/image/fetch/$s_!lLPB!,w_848,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F99b2adb2-6bbb-4178-b844-6166727d3691_800x447.gif 848w, https://substackcdn.com/image/fetch/$s_!lLPB!,w_1272,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F99b2adb2-6bbb-4178-b844-6166727d3691_800x447.gif 1272w, https://substackcdn.com/image/fetch/$s_!lLPB!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F99b2adb2-6bbb-4178-b844-6166727d3691_800x447.gif 1456w" sizes="(min-width: 800px) 720px, 100vw" alt="" width="800" height="447" loading="lazy" decoding="async"></figure>
