---
title: "Animating the API3 Ecosystem with GSAP and SVGs"
date: "2024-11-14T21:56:24.849Z"
slug: "animating-the-api3-ecosystem-with"
canonical: "https://buroojs.substack.com/p/animating-the-api3-ecosystem-with"
cover: "https://substackcdn.com/image/fetch/$s_!3e7f!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F087e6ed2-e887-412f-95c1-ebe5e4864669_800x447.gif"
description: "Creating a site that feels alive takes more than static content—it’s about the small, dynamic touches that guide users, highlight important info, and make the whole experience memorable."
---

<p>Creating a site that feels alive takes more than static content—it’s about the small, dynamic touches that guide users, highlight important info, and make the whole experience memorable. In building the API3 Ecosystem site, I used GSAP (GreenSock Animation Platform) and SVG animations to add that extra dimension. Here’s how we went from static to engaging with the help of these tools.</p>

<h5>Building a GSAP Animation Composable for Vue</h5>

<p>Managing animations across multiple components needed some organization. I created a custom GSAP composable to handle starting, stopping, and cleaning up animations across the site.</p>

<aside class="embed-card"><p class="embed-card__title"><a href="/writing/streamlining-gsap-in-nuxt3">Streamlining GSAP in Nuxt3</a></p><p>Working with GSAP in a Nuxt3 project, can sometimes lead to performance issues (I know I did!). This happens due to tweens lingering in the JavaScript memory causing weird lags and slow downs that drag the user experience.</p></aside>

<h3>The Magic of Micro-Animations</h3>

<p>Micro-animations are the subtle movements that make an interface feel responsive and engaging. On the API3 site, these tiny animations make the difference between a page that just sits there and one that feels interactive.</p>

<p><strong>Entrance Animations for Cards and Decorations</strong></p>

<figure><img src="https://substackcdn.com/image/fetch/$s_!3e7f!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F087e6ed2-e887-412f-95c1-ebe5e4864669_800x447.gif" srcset="https://substackcdn.com/image/fetch/$s_!3e7f!,w_424,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F087e6ed2-e887-412f-95c1-ebe5e4864669_800x447.gif 424w, https://substackcdn.com/image/fetch/$s_!3e7f!,w_848,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F087e6ed2-e887-412f-95c1-ebe5e4864669_800x447.gif 848w, https://substackcdn.com/image/fetch/$s_!3e7f!,w_1272,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F087e6ed2-e887-412f-95c1-ebe5e4864669_800x447.gif 1272w, https://substackcdn.com/image/fetch/$s_!3e7f!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F087e6ed2-e887-412f-95c1-ebe5e4864669_800x447.gif 1456w" sizes="(min-width: 800px) 720px, 100vw" alt="" width="800" height="447" loading="lazy" decoding="async"></figure>

<h3>Bringing API3 Concepts to Life with SVG Animations</h3>

<p>SVGs are the perfect tool for illustrating complex ideas. Here’s how we used SVG animations to explain some of API3’s technical concepts.</p>

<h4>1. First-Party Oracle Services Visualization</h4>

<p>To showcase API3’s data feeds, I animated rotating gears and numeric displays. It’s a mix of precision and energy, capturing both the mechanics and motion of real-time data.</p>

<pre tabindex="0"><code>useGsap((gsap) =&gt; {
  const timeline = gsap.timeline({
    repeat: -1,
  });

  timeline.fromTo(
    ".datafeed-first-party .digit",
    {
      opacity: 0,
    },
    {
      opacity: 1,
      duration: 0,
      stagger: {
        each: 0.1,
        from: "random",
      },
      ease: "power1.inOut",
    }
  );

  timeline.to(
    ".datafeed-first-party .gear",
    {
      rotate: 360,
      transformOrigin: "center",
      duration: 1.5,
      ease: "power1.inOut",
    },
    "-=1"
  );
});</code></pre>

<figure><img src="https://substackcdn.com/image/fetch/$s_!PUzO!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F1bb2df73-6a39-4137-bf5f-8182e5f6aa48_800x405.gif" srcset="https://substackcdn.com/image/fetch/$s_!PUzO!,w_424,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F1bb2df73-6a39-4137-bf5f-8182e5f6aa48_800x405.gif 424w, https://substackcdn.com/image/fetch/$s_!PUzO!,w_848,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F1bb2df73-6a39-4137-bf5f-8182e5f6aa48_800x405.gif 848w, https://substackcdn.com/image/fetch/$s_!PUzO!,w_1272,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F1bb2df73-6a39-4137-bf5f-8182e5f6aa48_800x405.gif 1272w, https://substackcdn.com/image/fetch/$s_!PUzO!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F1bb2df73-6a39-4137-bf5f-8182e5f6aa48_800x405.gif 1456w" sizes="(min-width: 800px) 720px, 100vw" alt="" width="800" height="405" loading="lazy" decoding="async"></figure>

<h4>2. Developer Experience Flow</h4>

<p>One of the more intricate animations was for API3’s developer experience flow. Using GSAP’s MotionPath plugin, I animated data points following a path, showing how data moves and interacts. This animation visually explains data flow—a complex concept made intuitive.</p>

<pre tabindex="0"><code>function pointPathAnimation(timeline, path) {
  timeline.to(
    `${path} ~ .point`,
    {
      transformOrigin: "50% 50%",
      duration: 2,
      scale: 0.25,
      ease: "power2.inOut",
      motionPath: {
        path: path,
        align: path,
        alignOrigin: [0.5, 0.5],
        autoRotate: true,
        start: 1,
        end: 0,
      },
      stagger: {
        each: 0.5,
        from: "random",
        easing: "power3.inOut",
      },
    },
    0.5
  );
}</code></pre>

<figure><img src="https://substackcdn.com/image/fetch/$s_!brm4!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F73e8ef4c-0b30-4aee-a36e-118f3f3e0187_800x372.gif" srcset="https://substackcdn.com/image/fetch/$s_!brm4!,w_424,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F73e8ef4c-0b30-4aee-a36e-118f3f3e0187_800x372.gif 424w, https://substackcdn.com/image/fetch/$s_!brm4!,w_848,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F73e8ef4c-0b30-4aee-a36e-118f3f3e0187_800x372.gif 848w, https://substackcdn.com/image/fetch/$s_!brm4!,w_1272,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F73e8ef4c-0b30-4aee-a36e-118f3f3e0187_800x372.gif 1272w, https://substackcdn.com/image/fetch/$s_!brm4!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F73e8ef4c-0b30-4aee-a36e-118f3f3e0187_800x372.gif 1456w" sizes="(min-width: 800px) 720px, 100vw" alt="" width="800" height="372" loading="lazy" decoding="async"></figure>

<h4>3. The OEV Network Loading Animation</h4>

<p>For the OEV Network loader, I went for a timeline animation that combined scaling, rotation, and staggering. This loader has a “loading” feel but in a way that keeps things visually interesting.</p>

<pre tabindex="0"><code>useGsap((gsap) =&gt; {
  const timeline = gsap.timeline({ repeat: 0, repeatDelay: 0.1 });

  timeline.set(".oev-loader :is(#O, #V) path", {
    scale: 0.5,
    y: 100,
    opacity: 1,
  });

  timeline.to(".oev-loader :is(#O, #V) path", {
    duration: 0.75,
    y: 0,
    scale: 1,
    ease: "back.out(1.7)",
    stagger: {
      each: 0.3,
      from: "end",
    },
  });
});</code></pre>

<figure><img src="https://substackcdn.com/image/fetch/$s_!f0df!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F983a24be-06be-4682-8a5a-17fecdbd23e0_800x445.gif" srcset="https://substackcdn.com/image/fetch/$s_!f0df!,w_424,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F983a24be-06be-4682-8a5a-17fecdbd23e0_800x445.gif 424w, https://substackcdn.com/image/fetch/$s_!f0df!,w_848,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F983a24be-06be-4682-8a5a-17fecdbd23e0_800x445.gif 848w, https://substackcdn.com/image/fetch/$s_!f0df!,w_1272,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F983a24be-06be-4682-8a5a-17fecdbd23e0_800x445.gif 1272w, https://substackcdn.com/image/fetch/$s_!f0df!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F983a24be-06be-4682-8a5a-17fecdbd23e0_800x445.gif 1456w" sizes="(min-width: 800px) 720px, 100vw" alt="" width="800" height="445" loading="lazy" decoding="async"></figure>

<h3>Wrapping Up</h3>

<p>With GSAP and SVG animations, we transformed API3’s Ecosystem site from static content to an interactive experience. These animations don’t just look cool; they guide users, make the site feel more responsive, and help explain API3’s services in a visual way.</p>

<p>The takeaway? Animations, when used thoughtfully, can turn an ordinary interface into something much more engaging. By combining strategic animation with performance optimizations, we’ve built a site that’s as functional as it is fun to use.</p>
