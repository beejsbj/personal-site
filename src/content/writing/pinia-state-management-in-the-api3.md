---
title: "Pinia State Management in the API3 Ecosystem"
date: "2024-11-14T21:28:31.709Z"
slug: "pinia-state-management-in-the-api3"
canonical: "https://buroojs.substack.com/p/pinia-state-management-in-the-api3"
cover: "https://substack-post-media.s3.amazonaws.com/public/images/df75852e-86c6-40ab-8eb3-1997df822601_1240x694.jpeg"
description: "Building API3’s Ecosystem hub was a balancing act between user experience, performance, and real-time data interactions."
---

<p>Building API3’s Ecosystem hub was a balancing act between user experience, performance, and real-time data interactions. With so much going on—complex filters, responsive layouts, and Web3 connectivity—keeping everything in sync was essential. Pinia quickly became my go-to for structuring state across the site. Here’s a peek into how each store was set up and how it made the entire ecosystem feel fast, interactive, and cohesive.</p>

<h3>Why Pinia?</h3>

<p>With Pinia, each feature of the site could have its own dedicated store, handling its own piece of the puzzle without cluttering the codebase. This approach kept things modular, clear, and scalable. From filtering dApps to managing user interactions, Pinia’s reactivity and modularity were the backbone that held it all together.</p>

<h3>Behind the Scenes: API3’s Key Pinia Stores</h3>

<p>Here’s how each store came together to create an engaging experience.</p>

<h4><strong>1. Ecosystem Store: The Data Hub</strong></h4>

<p>The <code>ecosystem.js</code> store is the core of all data-driven interactions. It pulls in project lists, keeps track of user-selected filters, and handles pagination. This store is the real MVP behind the <code>DappFilter</code> and <code>DappGrid</code> components, ensuring that users can search, filter, and load content without missing a beat.</p>

<pre tabindex="0"><code>// ecosystem.js - Ecosystem Store
import { defineStore } from "pinia";
import { useFetch } from "nuxt/app";

export const useEcosystemStore = defineStore("ecosystem", () =&gt; {
  const filterQuery = ref({
    searchKey: "",
    chains: {},
    categories: {},
    productTypes: {},
    page: 1,
  });
  const projectList = ref([]);
  const hasMoreItems = ref(true);

  const serverURL = computed(() =&gt; {
    let url = `/api/projects/?page=${filterQuery.value.page}`;
    url += filterQuery.value.searchKey ? `&amp;search=${filterQuery.value.searchKey}` : "";
    return url;
  });

  const { data } = useFetch(() =&gt; serverURL.value);

  watch([filterQuery, data], ([newQuery, newData]) =&gt; {
    if (!newData) return;
    projectList.value = newQuery.page === 1 ? newData.projects : [...projectList.value, ...newData.projects];
    hasMoreItems.value = newData.projects.length &gt;= 10;
  });

  return { list: projectList, filterQuery, hasMoreItems };
});</code></pre>

<p>In the ecosystem, this store synchronizes with the <code>DappFilter</code> component, which enables users to refine their search by networks, product types, categories, and more. The filter options are dynamically populated based on <code>ecosystem.stats</code>, a dataset that allows the filter criteria to expand and adapt. For instance:</p>

<pre tabindex="0"><code>const categories = computed(() =&gt; {
  if (ecosystem.stats) {
    return [...ecosystem.stats.categories];
  }
});</code></pre>

<p>The <code>DappGrid</code> component then uses this store’s pagination capabilities to display filtered results, enabling an infinite scroll experience with the help of <code>GSAP ScrollTrigger</code>. This setup lets users explore the dApp ecosystem with zero friction, as new items load only when needed.</p>

<h4><strong>2. Blog Store: Managing Content with Dynamic Pagination</strong></h4>

<p>The <code>blog.js</code> store handles the articles section of the site, managing both pagination and dynamic sorting to keep everything organized and relevant. This store powers the <code>ArticleGrid</code> component, which displays articles in multiple grid layouts based on user preferences.</p>

<pre tabindex="0"><code>// blog.js - Blog Store
import { defineStore } from "pinia";

export const useBlogStore = defineStore("blog", () =&gt; {
  const filterQuery = ref({ searchKey: "", page: 1 });
  const articlesList = ref([]);
  const hasMoreItems = ref(true);

  const serverURL = computed(() =&gt; `/api/articles/?page=${filterQuery.value.page}`);
  const { data } = useFetch(() =&gt; serverURL.value);

  watch([filterQuery, data], ([newQuery, newData]) =&gt; {
    if (!newData) return;
    articlesList.value = newQuery.page === 1 ? newData.articles : [...articlesList.value, ...newData.articles];
    hasMoreItems.value = newData.articles.length &gt;= 10;
  });

  return { list: articlesList, filterQuery, hasMoreItems };
});</code></pre>

<p><code>ArticleGrid</code> takes this data and organizes it with dynamic layouts based on props like <code>isRecentSort</code> or <code>isPopularSort</code>. The <code>sorted</code> computed property ensures that the latest, most popular, or trending content is always front and center.</p>

<pre tabindex="0"><code>const sorted = computed(() =&gt; {
  if (blog.list &amp;&amp; props.isRecentSort) {
    return blog.list.sort((a, b) =&gt; new Date(b.created_at) - new Date(a.created_at));
  }
  if (blog.list &amp;&amp; props.isPopularSort) {
    return blog.list.sort((a, b) =&gt; (b.views ?? 0) - (a.views ?? 0));
  }
  return blog.list.filter((article) =&gt; !article.hidden);
});</code></pre>

<p>Thanks to Pinia’s reactivity, this store keeps the <code>ArticleGrid</code> responsive, instantly updating whenever filters or sorting options change, giving users an experience that feels polished and frictionless.</p>

<hr>

<h4><strong>3. Interface Store: Centralized UI State</strong></h4>

<p>The <code>interface.js</code> store is responsible for all global UI elements, like modal visibility, viewport tracking, and responsive layouts. This store connects with components throughout the app, from managing modals in <code>DappFilter</code> to tracking responsive layouts for mobile devices.</p>

<pre tabindex="0"><code>// interface.js - Interface Store
import { defineStore } from "pinia";

export const useInterfaceStore = defineStore("interface", () =&gt; {
  const isMobile = ref(false);
  const mainMenuOpen = ref(false);

  function toggleMenu() {
    mainMenuOpen.value = !mainMenuOpen.value;
  }

  function updateViewportSize() {
    isMobile.value = window.innerWidth &lt; 768;
  }

  onMounted(() =&gt; {
    updateViewportSize();
    window.addEventListener("resize", updateViewportSize);
  });

  return { isMobile, mainMenuOpen, toggleMenu };
});</code></pre>

<p>The <code>DappFilter</code> component also relies on this store to provide mobile-specific actions, including modal controls for applying or canceling filters. This approach enables users to navigate the site effortlessly, regardless of device size. The store manages responsive breakpoints to adapt the layout dynamically, especially crucial for components like <code>ArticleGrid</code>, which adjust their layout based on <code>isMobile</code> or <code>isTablet</code> flags.</p>

<h4><strong>4. Web3 Store: Simplifying Blockchain Interactions</strong></h4>

<p>Finally, the <code>web3Store.js</code> store centralizes all Web3-related interactions, from wallet connections to blockchain switching. This keeps Web3 functionality straightforward and easily accessible across components.</p>

<pre tabindex="0"><code>// web3Store.js - Web3 Store
import { defineStore } from "pinia";

export const useWeb3Store = defineStore("web3Store", () =&gt; {
  const state = ref({ account: null, isConnected: false });

  return { state };
});</code></pre>

<p>Finally, the <code>web3Store.js</code> store centralizes all Web3-related interactions, from wallet connections to blockchain switching. This keeps Web3 functionality straightforward and easily accessible across components.</p>

<h3>Wrapping Up</h3>

<p>Using Pinia for state management in API3's Ecosystem was transformative. Each store—whether handling data, UI elements, or Web3 functionality—became a self-contained module, making complex functionality simple and ensuring a consistent, performant experience for users. If you're working on a Vue project with a lot of moving parts, consider Pinia’s modular setup; it could be the key to keeping everything in sync and under control.</p>
