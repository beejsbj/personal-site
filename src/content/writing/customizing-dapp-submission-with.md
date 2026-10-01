---
title: "Customizing dApp Submission with FormKit: Building a Multi-Step Form for API3"
date: "2024-11-14T22:13:19.616Z"
slug: "customizing-dapp-submission-with"
canonical: "https://buroojs.substack.com/p/customizing-dapp-submission-with"
cover: "https://substackcdn.com/image/fetch/$s_!urxh!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F3beeae0a-b3ca-4c6d-a783-dda37ebe2ab6_3352x2694.png"
description: "Creating a smooth, on-brand experience for dApp submissions can be tough, especially when the form needs to look and feel like a seamless part of your site."
---

<p>Creating a smooth, on-brand experience for dApp submissions can be tough, especially when the form needs to look and feel like a seamless part of your site. API3’s Ecosystem platform required a multi-step submission form that matched its design language and handled everything from conditional steps to custom validations. Here’s how we used FormKit to make it happen—and the challenges we solved along the way.</p>

<figure><img src="https://substackcdn.com/image/fetch/$s_!urxh!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F3beeae0a-b3ca-4c6d-a783-dda37ebe2ab6_3352x2694.png" srcset="https://substackcdn.com/image/fetch/$s_!urxh!,w_424,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F3beeae0a-b3ca-4c6d-a783-dda37ebe2ab6_3352x2694.png 424w, https://substackcdn.com/image/fetch/$s_!urxh!,w_848,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F3beeae0a-b3ca-4c6d-a783-dda37ebe2ab6_3352x2694.png 848w, https://substackcdn.com/image/fetch/$s_!urxh!,w_1272,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F3beeae0a-b3ca-4c6d-a783-dda37ebe2ab6_3352x2694.png 1272w, https://substackcdn.com/image/fetch/$s_!urxh!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F3beeae0a-b3ca-4c6d-a783-dda37ebe2ab6_3352x2694.png 1456w" sizes="(min-width: 800px) 720px, 100vw" alt="" width="1456" height="1170" loading="lazy" decoding="async"></figure>

<hr>

<h3>Why We Chose FormKit</h3>

<p>When we set out to build API3’s dApp submission form, we needed a toolkit that could handle multi-step navigation, complex validation, and high customizability. FormKit turned out to be exactly what we needed. Its built-in multi-step support provided a strong foundation, and its flexibility meant we could style and adapt it to match API3’s unique design without losing functionality.</p>

<hr>

<h3>Structuring the Multi-Step Experience</h3>

<p>Our form had to walk users through a series of distinct steps, making the experience straightforward and intuitive. Here’s the breakdown of each step:</p>

<ol><li><p><strong>Basic Info</strong>: Collects essentials like the dApp name, logo, and description.</p></li><li><p><strong>Images</strong>: Gathers cover images and screenshots.</p></li><li><p><strong>Tags</strong>: Lets users select categories and blockchain networks.</p></li><li><p><strong>Proxy Information</strong>: Only appears if the dApp is a data feed.</p></li><li><p><strong>Links</strong>: Collects social media links and contact information.</p></li></ol>

<p>Here’s a snippet of how we structured the main FormKit component to flow through each of these steps:</p>

<pre><code>&lt;FormKit
  type="multi-step"
  tab-style="progress"
  :allow-incomplete="ui.isDev"
  :hide-progress-labels="true"
  valid-step-icon=""
&gt;
  &lt;FormKit type="step" name="content"&gt;
    &lt;ContentStep :dappForm="dappForm" /&gt;
  &lt;/FormKit&gt;
  &lt;!-- Additional steps go here --&gt;
&lt;/FormKit&gt;</code></pre>

<h3>Custom FormKit Configuration</h3>

<p>One of the standout aspects of this project was how we customized FormKit using plugins. By extending its default capabilities, we created a polished, intuitive experience that feels native to API3’s ecosystem. Here are the plugins we implemented:</p>

<pre><code>const plugins = [
  createMultiStepPlugin(),
  createAutoHeightTextareaPlugin,
  createAutoAnimatePlugin(autoAnimate.config, autoAnimate.targets),
  addAsteriskPlugin,
  addPrefixIconPlugin,
  addSuffixHelpTooltipPlugin,
];</code></pre>

<p>These custom plugins added everything from contextual tooltips to automatic icons and required field indicators, making the form both visually cohesive and highly functional.</p>

<h4>Help Tooltips</h4>

<p>To offer guidance on specific fields, we added help tooltips using <code>floating-vue</code>. These appear when users hover over a field, providing contextual information without cluttering the interface.</p>

<pre><code>function addSuffixHelpTooltipPlugin(node) {
  if (!node.props.help) {
    node.props.suffixIcon = null;
    return;
  }

  let tooltip;
  
  node.context.handlers.mouseEnter = (e) =&gt; {
    const el = e.target;
    tooltip = createTooltip(el, {
      triggers: [],
      content: node.props.help,
    });
    tooltip.show();
  };

  node.context.handlers.mouseLeave = (e) =&gt; {
    tooltip.hide();
    setTimeout(() =&gt; {
      destroyTooltip(e.target);
    }, 400);
  };
}</code></pre>

<p>These tooltips make it easy for users to understand field requirements or limitations, especially helpful in a multi-step form with different types of information.</p>

<h4>Automatic Input Icons</h4>

<p>To improve user recognition, we configured automatic icons for common input types, such as email and password fields. These icons appear automatically, based on field type, adding visual consistency to the form.</p>

<pre><code>function addPrefixIconPlugin(node) {
  node.on("created", () =&gt; {
    const typesToApply = ["email", "password", "text", "url", "search"];
    
    if (node.props.prefixIcon) return;
    if (!typesToApply.includes(node.props.type)) return;

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

<p>This addition boosts usability by making fields instantly recognizable and guiding users through the form intuitively.</p>

<h4>Required Field Indicators</h4>

<p>To clearly signal which fields are required, we implemented an asterisk indicator plugin. This plugin adds a subtle but clear visual cue to help users understand what needs to be filled out.</p>

<pre><code>function addAsteriskPlugin(node) {
  const legends = ["checkbox_multi", "radio_multi", "repeater", "transferlist"];
  
  if (["button", "submit", "hidden", "group"].includes(node.props.type)) return;

  node.on("created", () =&gt; {
    const legendOrLabel = legends.includes(
      `${node.props.type}${node.props.options ? "_multi" : ""}`
    ) ? "legend" : "label";

    node.props.definition.schema = (sectionsSchema = {}) =&gt; {
      sectionsSchema[legendOrLabel] = {
        children: [
          {
            $el: "span",
            if: "$state.required",
            attrs: {
              class: "text-action-error-500 required-star",
            },
            children: ["*"],
          },
          "$label",
        ],
      };
      return schemaFn(sectionsSchema);
    };
  });
}</code></pre>

<p>This small visual detail goes a long way in making the form clearer and more user-friendly, ensuring that users know exactly what’s required.</p>

<h3>Customizing the Design</h3>

<p>Matching API3’s design language meant modifying FormKit’s default styles to feel cohesive with the rest of the Ecosystem site. With a mix of CSS variables and custom components, we brought API3’s visual language into the form itself.</p>

<pre><code>:root {
  --formkit-theme: api3;
  --fk-color-primary: var(--ink);
  --fk-border-width: var(--line-width);
  --fk-padding-input: var(--space-s);
}</code></pre>

<h3>Enhanced Validation and File Handling</h3>

<p>We needed to ensure image uploads followed specific guidelines, so we created custom validation rules to check image dimensions and file size. This helped us keep user submissions clean and consistent.</p>

<pre><code>const imageRatio = async function (node) {
  if (!node.value) return true;

  const imageRatios = await Promise.all(
    node.value.map(async (file) =&gt; {
      // Calculate the image ratio
      const ratio = image.naturalWidth / image.naturalHeight;
      return ratio;
    })
  );

  return imageRatios.every((ratio) =&gt; {
    const lowerBound = 16 / 6.5;
    const upperBound = 16 / 5.5;
    return ratio &gt;= lowerBound &amp;&amp; ratio &lt;= upperBound;
  });
};</code></pre>

<p>This rule automatically validates that images have the right aspect ratio, ensuring that uploaded assets maintain a uniform look across the platform.</p>

<hr>

<h3>Dynamic Form Behavior</h3>

<p>To keep things user-friendly, we added conditional rendering based on user selections. For example, the “Proxy Information” step only appears for data feed dApps, making the form experience customized and relevant.</p>

<pre><code>&lt;FormKit
  type="step"
  name="proxy"
  v-if="dappForm.productType === 'datafeed'"
  :next-attrs="nextClasses"
  :previous-attrs="prevClasses"
&gt;
  &lt;ProxyStep :dappForm="dappForm" :feedNameOptions="feedNameOptions" /&gt;
&lt;/FormKit&gt;</code></pre>

<p>This approach means that users only see what’s relevant to them, helping them move through the form faster without getting bogged down in irrelevant fields.</p>

<h3>User Experience Enhancements</h3>

<p>To make the form feel as seamless and engaging as possible, we added several UX touches:</p>

<ul><li><p><strong>Progress Tracking</strong>: Custom progress indicators let users know exactly where they are in the process.</p></li><li><p><strong>Automatic Data Persistence</strong>: Using <code>useStorage</code>, we stored form data locally so that users don’t lose progress if they navigate away accidentally.</p></li></ul>

<pre><code>const dappForm = useStorage("dapp-form", {});</code></pre>

<ul><li><p><strong>Clear Validation and Help Text</strong>: We customized validation messages and added helpful hints to guide users through each step.</p></li><li><p><strong>Mobile-Responsive Design</strong>: The form adjusts itself based on device size, so the experience remains intuitive on mobile and desktop alike.</p></li></ul>

<hr>

<h3>Wrapping Up</h3>

<p>Building a custom multi-step form with FormKit allowed us to create a submission process that feels both functional and true to API3’s brand. Thanks to FormKit’s multi-step structure and flexibility, we were able to integrate custom validation, adaptive styling, and dynamic field behavior—all while keeping the codebase clean and manageable.</p>

<h4>Key Takeaways:</h4>

<ul><li><p><strong>Multi-Step Simplicity</strong>: FormKit’s multi-step support provided a strong foundation for our complex form.</p></li><li><p><strong>Flexible Validation</strong>: Custom validation rules made it easy to meet API3’s unique requirements.</p></li><li><p><strong>Seamless Styling</strong>: CSS variables allowed us to bring the design language of API3 into every part of the form.</p></li><li><p><strong>Data Persistence</strong>: Leveraging local storage prevented users from losing data, making the form more forgiving and user-friendly.</p></li></ul>

<p>The result? A form that doesn’t just look and feel like a natural extension of the API3 ecosystem but also makes it easy and intuitive for users to submit their dApps. FormKit’s adaptability helped us build a form that’s as robust as it is user-friendly.</p>

<figure><img src="https://substackcdn.com/image/fetch/$s_!R-7q!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fa2581965-eae9-4e23-8af7-0cd13e7532c0_2622x2876.png" srcset="https://substackcdn.com/image/fetch/$s_!R-7q!,w_424,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fa2581965-eae9-4e23-8af7-0cd13e7532c0_2622x2876.png 424w, https://substackcdn.com/image/fetch/$s_!R-7q!,w_848,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fa2581965-eae9-4e23-8af7-0cd13e7532c0_2622x2876.png 848w, https://substackcdn.com/image/fetch/$s_!R-7q!,w_1272,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fa2581965-eae9-4e23-8af7-0cd13e7532c0_2622x2876.png 1272w, https://substackcdn.com/image/fetch/$s_!R-7q!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fa2581965-eae9-4e23-8af7-0cd13e7532c0_2622x2876.png 1456w" sizes="(min-width: 800px) 720px, 100vw" alt="" width="1456" height="1597" loading="lazy" decoding="async"></figure>
