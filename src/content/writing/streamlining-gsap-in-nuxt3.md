---
title: "Streamlining GSAP in Nuxt3"
subtitle: "Simple and Clean!"
date: "2024-04-15T22:23:02.414Z"
slug: "streamlining-gsap-in-nuxt3"
canonical: "https://buroojs.substack.com/p/streamlining-gsap-in-nuxt3"
cover: "https://substackcdn.com/image/fetch/$s_!PKpL!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F5442f861-d94c-41b7-a371-a176f1cd7845_800x429.gif"
description: "Simple and Clean!"
---

<figure><img src="https://substackcdn.com/image/fetch/$s_!PKpL!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F5442f861-d94c-41b7-a371-a176f1cd7845_800x429.gif" srcset="https://substackcdn.com/image/fetch/$s_!PKpL!,w_424,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F5442f861-d94c-41b7-a371-a176f1cd7845_800x429.gif 424w, https://substackcdn.com/image/fetch/$s_!PKpL!,w_848,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F5442f861-d94c-41b7-a371-a176f1cd7845_800x429.gif 848w, https://substackcdn.com/image/fetch/$s_!PKpL!,w_1272,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F5442f861-d94c-41b7-a371-a176f1cd7845_800x429.gif 1272w, https://substackcdn.com/image/fetch/$s_!PKpL!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F5442f861-d94c-41b7-a371-a176f1cd7845_800x429.gif 1456w" sizes="(min-width: 800px) 720px, 100vw" alt="" width="444" height="238" loading="lazy" decoding="async"></figure>

<p>Working with GSAP in a Nuxt3 project, can sometimes lead to performance issues (I know I did!). This happens due to tweens lingering in the JavaScript memory causing weird lags and slow downs that drag the user experience.</p>

<p>Plus, since Nuxt is a server-side rendered (SSR) framework by default, it becomes rather cumbersome with the cluttering of your components with repetitive boilerplate.</p>

<p>So the dev experience isn’t any fun either.</p>

<h2><strong>The Problem</strong></h2>

<p>So typically, it seems that GSAP animations are not automatically cleaned up, which can cause them to accumulate and bog down your application's performance.</p>

<p>Add in the fact Nuxt is SSR and therefore will execute JavaScript on the server before it hits the client-side, which doesn't have access to the DOM. We need to constantly use the onMounted hook.</p>

<p>Here is a common setup:</p>

<pre><code>import { gsap } from "gsap";

onMounted(() =&gt; { 
//needs this hook since the script tag runs in SSR before the DOM is present.

   gsap.from(".site-header", {
      delay: "0.5",
      duration: 0.5,
      y: -50,
      opacity: 0,
      ease: "power4.out",
    });
  });</code></pre>

<h3><strong>Introducing </strong><code>gsap.context()</code></h3>

<p><a href="https://gsap.com/docs/v3/GSAP/gsap.context()/">I learnt about the </a><code>gsap.context()</code><a href="https://gsap.com/docs/v3/GSAP/gsap.context()/"> method</a>, which offers a neat solution by encapsulating all animations within a given context, making it easy to manage and dispose of them efficiently when they are no longer needed.</p>

<p>Here’s how you can better manage animations with <code>gsap.context()</code>, ensuring they don’t overstay their welcome,</p>

<h4>Kill tweens after a time <em>(Not Ideal)</em>:</h4>

<pre><code>import { gsap } from "gsap";

onMounted(() =&gt; { 
  let context = gsap.context(() =&gt; { //create context
    gsap.from(".site-header", {
      delay: "0.5",
      duration: 0.5,
      y: -50,
      opacity: 0,
      ease: "power4.out",
    });
  });

  setTimeout(() =&gt; {
    context.kill(); //kill the animation after a second
  }, 1000);
});
</code></pre>

<h4>Kill when Component is unmounted:</h4>

<pre><code>import { gsap } from "gsap";

let context; //create this outside the hook to be able to use it in the second hook

onMounted(() =&gt; { 
  context = gsap.context(() =&gt; {
    gsap.from(".site-header", {
      delay: "0.5",
      duration: 0.5,
      y: -50,
      opacity: 0,
      ease: "power4.out",
    }); 
  });
});

onUnmounted(() =&gt; {
  context.kill();
});</code></pre>

<hr>

<p>Now that we've seen the headaches GSAP can cause in a Nuxt3 project. I’ll walk you through the best solution ive gathered to keep things smooth, simple and clean.</p>

<p>Lets dive!</p>

<h2><strong>Creating a GSAP Plugin for Nuxt</strong></h2>

<p>to streamline using GSAP in Nuxt3 we can create a plugin. This centralizes your GSAP logic, making it easier to maintain and reuse:</p>

<pre><code>import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger"; 

export default defineNuxtPlugin((nuxtApp) =&gt; {
  if (process.client) {
    gsap.registerPlugin(ScrollTrigger);
  }
  return { provide: { gsap: { gsap, ScrollTrigger } } }; 

//this allows you to use gsap and its plugins from a single object 'gsap' containing them at from useNuxtApp()
});
</code></pre>

<h5>Make sure to add GSAP to the transpile array in your <code>nuxt.config </code>for optimal performance across all browsers:</h5>

<pre><code>export default defineNuxtConfig({
    build: {
        transpile: ["gsap"],
    },
...
}</code></pre>

<h3><strong>The </strong><code>useGsap</code> Composable</h3>

<p>We can further encapsulate your GSAP logic within a custom composable for cleaner, more manageable code. This composable will wrap your <strong>animation</strong> <strong>contexts</strong> within its lifecycle hooks—specifically using <code>onMounted</code> for initialization and <code>onUnmounted</code> for cleanup.</p>

<p>Here’s how:</p>

<pre><code>export default function useGsap(animationFunction) {
  // auto imported by nuxt
  const { $gsap } = useNuxtApp();

  // To ensure the animation function is called within the GSAP context
  let context; 
  // This context will automatically collect all animations created within it

  onMounted(() =&gt; {
    context = $gsap.gsap.context(() =&gt; {
      // Provide gsap and ScrollTrigger to the animation function
      if (animationFunction) animationFunction(...Object.values($gsap));
    });
  });

  // Automatically clean up when the component using this composable is unmounted
  onUnmounted(() =&gt; {
    // Kills all animations in the context, reverting their properties to the initial states
    context.kill();
  });

  return {
    ...$gsap, // allows you to destructure from the composble if needed
  };
}
</code></pre>

<h3><strong>Using the Composable</strong></h3>

<pre><code>useGsap((gsap) =&gt; { //pass the plugins you need (gsap, scrollTrigger, ...)
  gsap.from(".site-header", {
    delay: "0.5",
    duration: 0.5,
    y: -50,
    opacity: 0,
    ease: "power4.out",
  }
});</code></pre>

<h2>Conclusion</h2>

<p>Integrating GSAP into Nuxt3 efficiently can be challenging, but with the setup we've discussed, you can reduce complexity and enhance performance.</p>

<p>Encapsulating your animations in a custom composable, you ensure cleaner, more maintainable code and a smoother dev and user experience.</p>

<p>Check out <a href="https://stackblitz.com/edit/nuxt-starter-5cjwur?file=plugins%2Fgsap.js,nuxt.config.ts,composables%2FuseGsap.js,components%2FTextShowcase.vue">this StackBlitz</a> to see the composable in action and get a feel for how it can clean up your Nuxt3 projects.</p>

<h5>Further reading:</h5>

<ul><li><p><a href="https://gsap.com/docs/v3/GSAP/gsap.context()/">Understanding GSAP Context</a>: Master the nuances of animation context management with GSAP.</p></li><li><p><a href="https://gsap.com/resources/frameworks">Using GSAP in Various Frameworks</a>: Learn how GSAP integrates with other popular frameworks.</p></li><li><p><a href="https://nuxt.com/docs/api/nuxt-config#transpile">Nuxt3 Transpilation</a>: Get insights into optimizing your Nuxt3 projects for production.</p></li><li><p><a href="https://gsap.com/docs/v3/React/tools/useGSAP/">useGSAP for React</a>: Discover how to implement similar animation strategies in React applications.</p></li></ul>
