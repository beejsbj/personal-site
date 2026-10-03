---
title: "Let's Create a FormKit Plugin Together!"
date: "2024-11-24T00:36:39.718Z"
slug: "lets-create-a-formkit-plugin-together"
canonical: "https://buroojs.substack.com/p/lets-create-a-formkit-plugin-together"
cover: "https://substack-post-media.s3.amazonaws.com/public/images/d81df343-d08f-4d27-b9f5-66d5f224d82f_1000x563.jpeg"
description: "I've been learning how to make FormKit plugins and want to walk you through creating one from scratch."
---

<figure><img src="https://substackcdn.com/image/fetch/$s_!AUr0!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fd81df343-d08f-4d27-b9f5-66d5f224d82f_1000x563.jpeg" srcset="https://substackcdn.com/image/fetch/$s_!AUr0!,w_424,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fd81df343-d08f-4d27-b9f5-66d5f224d82f_1000x563.jpeg 424w, https://substackcdn.com/image/fetch/$s_!AUr0!,w_848,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fd81df343-d08f-4d27-b9f5-66d5f224d82f_1000x563.jpeg 848w, https://substackcdn.com/image/fetch/$s_!AUr0!,w_1272,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fd81df343-d08f-4d27-b9f5-66d5f224d82f_1000x563.jpeg 1272w, https://substackcdn.com/image/fetch/$s_!AUr0!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fd81df343-d08f-4d27-b9f5-66d5f224d82f_1000x563.jpeg 1456w" sizes="(min-width: 800px) 720px, 100vw" alt="" width="1000" height="563" loading="lazy" decoding="async"></figure>

<p>I've been learning how to make FormKit plugins and want to walk you through creating one from scratch. We'll build a plugin that automatically adds icons to inputs - it's a good example because it touches on a lot of key FormKit concepts.</p>

<h2>Starting With the Problem</h2>

<p>Before diving into code, let's think about what we want to do. I was adding icons to my form inputs manually like this:</p>

<pre tabindex="0"><code>&lt;FormKit
  type="email"
  prefixIcon="email"
/&gt;</code></pre>

<p>For <em>every single input</em>. It was repetitive and I kept forgetting to add them. So I thought - why not make a plugin that does this automatically based on the input type?</p>

<h2>Building Our First Plugin</h2>

<p>All FormKit plugins start as a function that receives a node. The node is your connection to the input - it has all the properties, methods and lifecycle hooks you need. Here's our starting point:</p>

<pre tabindex="0"><code>function addPrefixIconPlugin(node) {
  // This is where we'll put our code
}</code></pre>

<h2>Adding Lifecycle Hooks</h2>

<p>We need to know when our input is created so we can add the icon. FormKit gives us lifecycle events for this:</p>

<pre tabindex="0"><code>function addPrefixIconPlugin(node) {
  node.on("created", () =&gt; {
    // This runs when the input is created
  });
}</code></pre>

<h2>Making Smart Decisions</h2>

<p>Now we need some logic to decide if and when to add icons. Let's add some checks:</p>

<pre tabindex="0"><code>function addPrefixIconPlugin(node) {
  node.on("created", () =&gt; {
    // Which input types should get icons?
    const typesToApply = ["email", "password", "text", "url", "search"];

    // Skip if:
    if (node.props.prefixIcon) return; // already has an icon
    if (!typesToApply.includes(node.props.type)) return; // not an input we care about 
    if (!node.props.definition) return; // something's wrong</code></pre>

<h2>The Hard Part: Modifying the Schema</h2>

<p>This is where it gets interesting. FormKit uses something called a schema to build its inputs. Think of it like a blueprint. To add our icon, we need to modify this blueprint:</p>

<pre tabindex="0"><code>// Keep the original schema function
    const originalSchema = node.props.definition.schema;

    // Create our new schema function
    node.props.definition.schema = (extensions) =&gt; {
      // Add our prefix section with the icon
      const localExtensions = {
        ...extensions,
        prefix: {
          $el: "label", 
          attrs: {
            class: "formkit-prefix-icon formkit-icon",
            innerHTML: icons[node.props.type],
          },
        },
      };

      // Important! Call the original schema with our changes
      return originalSchema(localExtensions);
    };</code></pre>

<p>Let's break down what's happening here:</p>

<ol><li><p>We save the original schema function - we'll need it later</p></li><li><p>We create a new schema function that adds our prefix section</p></li><li><p>The prefix section is a label element with our icon</p></li><li><p>We pass everything back to the original schema function</p></li></ol>

<h2>Putting It All Together</h2>

<p>Here's our complete plugin:</p>

<pre tabindex="0"><code>function addPrefixIconPlugin(node) {
  node.on("created", () =&gt; {
    const typesToApply = ["email", "password", "text", "url", "search"];

    if (node.props.prefixIcon) return;
    if (!typesToApply.includes(node.props.type)) return;
    if (!node.props.definition) return;

    const originalSchema = node.props.definition.schema;
    
    node.props.definition.schema = (extensions) =&gt; {
      const localExtensions = {
        ...extensions,
        prefix: {
          $el: "label",
          attrs: {
            class: "formkit-prefix-icon formkit-icon",
            innerHTML: icons[node.props.type],
          },
        },
      };
      return originalSchema(localExtensions);
    };
  });
}</code></pre>

<h2>Using Our Plugin</h2>

<p>To use the plugin, we add it to our FormKit config:</p>

<pre tabindex="0"><code>import { defaultConfig } from '@formkit/vue'

export default defineFormKitConfig({
  plugins: [addPrefixIconPlugin]
})</code></pre>

<p>Now all our inputs automatically get the right icons based on their type!</p>

<h2>Key Lessons About Plugin Creation</h2>

<p>Through building this, I learned some important things about making FormKit plugins:</p>

<ol><li><p><strong>Always hook into lifecycle events</strong> - <code>created</code>, <code>mounted</code>, etc. Don't try to run your code immediately.</p></li><li><p><strong>Check your conditions early</strong> - Get all your <code>if</code> checks out of the way at the start, return early if conditions aren't met.</p></li><li><p><strong>Preserve existing functionality</strong> - Notice how we kept the original schema function and called it with our changes? That's super important!</p></li><li><p><strong>Think about overrides</strong> - We check for <code>prefixIcon</code> first so users can still set their own icons if they want.</p></li></ol>

<h2>Next Steps</h2>

<p>Once you understand these basics, you can create all kinds of plugins! Some ideas:</p>

<ul><li><p>Add custom validation messages</p></li><li><p>Automatically format certain input types</p></li><li><p>Add tooltips (which is actually another plugin I made...)</p></li></ul>

<p>The key is starting small and building up. This icon plugin looks simple but it teaches all the core concepts you need to know.</p>

<p>Let me know if anything's unclear! Plugin development seems scary at first but it's really just about understanding a few core concepts.</p>

<p><a href="https://formkit.com/essentials/schema">Formkit Schema</a></p>
