---
title: "Breathing Clouds"
subtitle: "Css tricks or something.."
date: "2022-05-15T19:57:31.866Z"
slug: "breathing-clouds"
canonical: "https://buroojs.substack.com/p/breathing-clouds"
cover: "https://substackcdn.com/image/fetch/w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F07b4a3f7-2172-49cf-878e-83cb63f04e92_1200x630.png"
description: "Css tricks or something.."
---

<p>This post is an attempt to try something new, I’ve been having a hard time making large posts that go through the entire process of building a website. so I’ve decided to talk about smaller ideas instead.Here I want to talk about a CSS “trick” that Derek, my webmentor, showed me off hand in one of our meetings. he used magic to turn a regular old rectangle into one that’s breathing.</p>

<p>this was my introduction to CSS keyframe animations.</p>

<hr>

<h4>setup</h4>

<p>I started with</p>

<figure><img src="https://substackcdn.com/image/fetch/$s_!seAO!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F07b4a3f7-2172-49cf-878e-83cb63f04e92_1200x630.png" srcset="https://substackcdn.com/image/fetch/$s_!seAO!,w_424,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F07b4a3f7-2172-49cf-878e-83cb63f04e92_1200x630.png 424w, https://substackcdn.com/image/fetch/$s_!seAO!,w_848,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F07b4a3f7-2172-49cf-878e-83cb63f04e92_1200x630.png 848w, https://substackcdn.com/image/fetch/$s_!seAO!,w_1272,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F07b4a3f7-2172-49cf-878e-83cb63f04e92_1200x630.png 1272w, https://substackcdn.com/image/fetch/$s_!seAO!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F07b4a3f7-2172-49cf-878e-83cb63f04e92_1200x630.png 1456w" sizes="(min-width: 800px) 720px, 100vw" alt="" width="472" height="248" loading="lazy" decoding="async"></figure>

<p>an <code>&lt;img&gt;</code> of a cloud!and then I took two more of them and housed all three of them inside a <code>&lt;div&gt;.</code></p>

<p>now they are all inside a div so I can use position to get them to overlap.<code>position: relative; </code>on the parent div <em>and</em> <code>position: absolute;</code> on each of the childrenand finally, I added <code>opacity: 0.5; </code>on all the children to get them looking all <em>cloudy.</em></p>

<hr>

<h4>cool, now to the keyframes</h4>

<p>to get the effect I wanted I needed to have each of the clouds moving in a different direction almost off sync.</p>

<p>to do that I had to create unique keyframes for each of them</p>

<pre tabindex="0"><code>@keyframes breatha {
	0% {
		transform: translate(10px, -10px);
	}
	50% {
		transform: translate(-10px, 10px);
	}

	100% {
		transform: translate(10px, -10px);
	}
}</code></pre>

<p>so to break this down. <strong>translate</strong> moves the element according to the values in the parenthesis.each of the percentages indicates where the element is to be moved at that point in the journey.</p>

<p>so at the halfway mark, 50%, the element needs to be at the indicated place.</p>

<p>so the 0, 50 and 100 are the KEY frames. saying where the cloud needs to be. the travel between those frames is figured out using magic.</p>

<figure><img src="https://substackcdn.com/image/fetch/$s_!kxKJ!,w_1456,c_limit,f_auto,q_auto:good,fl_lossy/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2Fd6f8f266-b868-44d5-a478-520af762f7d8_267x200.gif" srcset="https://substackcdn.com/image/fetch/$s_!kxKJ!,w_424,c_limit,f_auto,q_auto:good,fl_lossy/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2Fd6f8f266-b868-44d5-a478-520af762f7d8_267x200.gif 424w, https://substackcdn.com/image/fetch/$s_!kxKJ!,w_848,c_limit,f_auto,q_auto:good,fl_lossy/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2Fd6f8f266-b868-44d5-a478-520af762f7d8_267x200.gif 848w, https://substackcdn.com/image/fetch/$s_!kxKJ!,w_1272,c_limit,f_auto,q_auto:good,fl_lossy/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2Fd6f8f266-b868-44d5-a478-520af762f7d8_267x200.gif 1272w, https://substackcdn.com/image/fetch/$s_!kxKJ!,w_1456,c_limit,f_auto,q_auto:good,fl_lossy/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2Fd6f8f266-b868-44d5-a478-520af762f7d8_267x200.gif 1456w" sizes="(min-width: 800px) 720px, 100vw" alt="Merlin GIFs - Get the best GIF on GIPHY" width="320" height="240" title="Merlin GIFs - Get the best GIF on GIPHY" loading="lazy" decoding="async"></figure>

<p>I had to learn the hard way to make the 100 the same as 0 so that it’s all smooth and doesn’t have a hard, jarring reset.</p>

<p>now I just copy-pasted that for the other two clouds and slightly changed the values so they move differently.</p>

<hr>

<p>finally, you need to tell each of the cloud elements which keyframe sequence to follow.</p>

<pre tabindex="0"><code>.a {
	position: absolute;
        opacity: 0.5;
	max-width: 80vw;
	animation: 3s breatha infinite ease-in-out;
	
}</code></pre>

<p>using this animation property.</p>

<p>this breaks down into,</p>

<ul><li><p><strong>3s</strong>, take three seconds to complete the sequence</p></li><li><p><strong>“breatha”, </strong>use that sequence.</p></li><li><p>done infinitely, easing in and out of the sequence.</p></li></ul>

<p>repeat for the other two clouds, and boom! all done!!</p>

<h3><a href="https://codepen.io/beejsbj/pen/vYpwYJL?editors=1100">see it in action here!</a></h3>
