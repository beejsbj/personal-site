---
title: "Trying to recreate Apple's homepage"
subtitle: "just a bite"
date: "2022-03-29T14:33:18.959Z"
slug: "trying-to-recreate-apples-homepage"
canonical: "https://buroojs.substack.com/p/trying-to-recreate-apples-homepage"
cover: "https://substackcdn.com/image/fetch/$s_!k6vG!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2Fc20a7df5-0ade-4c2d-b4b3-52c1cb52b74f_2491x1280.jpeg"
description: "just a bite"
---

<p>So in yesterday's lesson, we were tasked with picking a site that's just out of reach of our abilities.</p>

<p>but after staring at the page for more than 30mins, I asked for help, and Derek suggested trying to recreate apple.com</p>

<figure><img src="https://substackcdn.com/image/fetch/$s_!k6vG!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2Fc20a7df5-0ade-4c2d-b4b3-52c1cb52b74f_2491x1280.jpeg" srcset="https://substackcdn.com/image/fetch/$s_!k6vG!,w_424,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2Fc20a7df5-0ade-4c2d-b4b3-52c1cb52b74f_2491x1280.jpeg 424w, https://substackcdn.com/image/fetch/$s_!k6vG!,w_848,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2Fc20a7df5-0ade-4c2d-b4b3-52c1cb52b74f_2491x1280.jpeg 848w, https://substackcdn.com/image/fetch/$s_!k6vG!,w_1272,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2Fc20a7df5-0ade-4c2d-b4b3-52c1cb52b74f_2491x1280.jpeg 1272w, https://substackcdn.com/image/fetch/$s_!k6vG!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2Fc20a7df5-0ade-4c2d-b4b3-52c1cb52b74f_2491x1280.jpeg 1456w" sizes="(min-width: 800px) 720px, 100vw" alt="" width="1456" height="748" loading="lazy" decoding="async"></figure>

<p>hoo-boy.</p>

<h2>where do I even start?</h2>

<p>When I finally sat down to tackle this, I stared at the site for a bit. Changed the size of the window, trying to feel the site out. feel out where the different parts of the sites are.</p>

<p>How I am to rebuild this smooth monstrosity.</p>

<p>eventually, I realized its way too much to think about and then just opened my code editor and built out a master layout shell that we had learnt while doing [Uncle Bill's site](https://codepen.io/beejsbj/pen/xxpgYLy)</p>

<p>then I went at it one section at a time.</p>

<h3>Header</h3>

<p>this guy is the one I spent the most time with.</p>

<p>lotsa typing, all the icons for the images, finding the right apple icon, search icon, <s>~bag icon~</s></p>

<figure><img src="https://substackcdn.com/image/fetch/$s_!LzFS!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F3de3735d-bd22-4e4e-b9b6-684f7dcd5a98_1537x62.png" srcset="https://substackcdn.com/image/fetch/$s_!LzFS!,w_424,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F3de3735d-bd22-4e4e-b9b6-684f7dcd5a98_1537x62.png 424w, https://substackcdn.com/image/fetch/$s_!LzFS!,w_848,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F3de3735d-bd22-4e4e-b9b6-684f7dcd5a98_1537x62.png 848w, https://substackcdn.com/image/fetch/$s_!LzFS!,w_1272,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F3de3735d-bd22-4e4e-b9b6-684f7dcd5a98_1537x62.png 1272w, https://substackcdn.com/image/fetch/$s_!LzFS!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F3de3735d-bd22-4e4e-b9b6-684f7dcd5a98_1537x62.png 1456w" sizes="(min-width: 800px) 720px, 100vw" alt="" width="1456" height="59" loading="lazy" decoding="async"></figure>

<p>for whatever reason, Me from that time chose to use Ul/li to build the navigation bar. I think I might have seen that in the source code of apple's site.</p>

<p>but later I just realized using nav would have been much better.</p>

<p>because I had to turn it inline anyway and switch to block only on a smaller viewport.</p>

<figure><img src="https://substackcdn.com/image/fetch/$s_!xq7s!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2Fad4496d6-07d4-4036-a366-85e6b103949e_485x462.png" srcset="https://substackcdn.com/image/fetch/$s_!xq7s!,w_424,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2Fad4496d6-07d4-4036-a366-85e6b103949e_485x462.png 424w, https://substackcdn.com/image/fetch/$s_!xq7s!,w_848,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2Fad4496d6-07d4-4036-a366-85e6b103949e_485x462.png 848w, https://substackcdn.com/image/fetch/$s_!xq7s!,w_1272,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2Fad4496d6-07d4-4036-a366-85e6b103949e_485x462.png 1272w, https://substackcdn.com/image/fetch/$s_!xq7s!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2Fad4496d6-07d4-4036-a366-85e6b103949e_485x462.png 1456w" sizes="(min-width: 800px) 720px, 100vw" alt="" width="485" height="462" loading="lazy" decoding="async"></figure>

<p>HTML seems to take so little time at the end of the day. it's always the CSS that I find needs to be constantly worked on. maybe, with experience ill be able to fully visualize what the CSS is doing. currently, I'm able to do it at a very limited capacity.</p>

<p>I think I'm FINALLY intuiting the difference between padding and margin. so, yay for that.</p>

<h3>landing</h3>

<p>this was relatively simple. I did spend a while here as well, but mostly because I was trying to figure out how the whole section is a link, but also has links within to other places. I managed to figure out that you can in fact put a div inside an a, but that didn't *really* recreate it the way apple had done it.</p>

<figure><img src="https://substackcdn.com/image/fetch/$s_!OT8u!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2Fad26c1c9-1804-41b8-bb33-ec634355e601_2166x1153.jpeg" srcset="https://substackcdn.com/image/fetch/$s_!OT8u!,w_424,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2Fad26c1c9-1804-41b8-bb33-ec634355e601_2166x1153.jpeg 424w, https://substackcdn.com/image/fetch/$s_!OT8u!,w_848,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2Fad26c1c9-1804-41b8-bb33-ec634355e601_2166x1153.jpeg 848w, https://substackcdn.com/image/fetch/$s_!OT8u!,w_1272,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2Fad26c1c9-1804-41b8-bb33-ec634355e601_2166x1153.jpeg 1272w, https://substackcdn.com/image/fetch/$s_!OT8u!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2Fad26c1c9-1804-41b8-bb33-ec634355e601_2166x1153.jpeg 1456w" sizes="(min-width: 800px) 720px, 100vw" alt="" width="1456" height="775" loading="lazy" decoding="async"></figure>

<p>some time was spent looking for images for the site.</p>

<p>making it so that it shrunk when it was smaller.</p>

<p>Apple's image changes when we shrink its site. I think I later realized they might be using @media to just switch the image?</p>

<h3>this leads me into the coda section</h3>

<p>apple's image here seems to be dynamic, it's the same image, that gets wide, and then when shrunk also has this bottom part that comes in.</p>

<p>I wasn't able to recreate it.</p>

<p>Derek mentioned that it is likely a background image, which I too suspected.</p>

<p>but I wasn't able to get it to work.</p>

<p>eventually, I decided to solve it by using two different images.</p>

<figure><img src="https://substackcdn.com/image/fetch/$s_!qCtB!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F6c565309-28a9-4aac-a226-bd1cbebe207f_2489x689.jpeg" srcset="https://substackcdn.com/image/fetch/$s_!qCtB!,w_424,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F6c565309-28a9-4aac-a226-bd1cbebe207f_2489x689.jpeg 424w, https://substackcdn.com/image/fetch/$s_!qCtB!,w_848,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F6c565309-28a9-4aac-a226-bd1cbebe207f_2489x689.jpeg 848w, https://substackcdn.com/image/fetch/$s_!qCtB!,w_1272,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F6c565309-28a9-4aac-a226-bd1cbebe207f_2489x689.jpeg 1272w, https://substackcdn.com/image/fetch/$s_!qCtB!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F6c565309-28a9-4aac-a226-bd1cbebe207f_2489x689.jpeg 1456w" sizes="(min-width: 800px) 720px, 100vw" alt="" width="1456" height="403" loading="lazy" decoding="async"></figure>

<p>first, I thought I could have them be IMG tags and then switch them out with @media...OH.</p>

<p>but that only works with CSS? hmm.</p>

<p>I think what I eventually settled on was convoluted.</p>

<p>I had the wide image as an HTML tag, that has its opacity reduced to 0 when the viewport is shrunk.</p>

<p>and the background of this section (where the IMG tag lives) is the height-focused image.</p>

<figure><img src="https://substackcdn.com/image/fetch/$s_!6tbg!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F62d96596-2bba-4b08-8cdb-31be5a3f5c0c_486x692.jpeg" srcset="https://substackcdn.com/image/fetch/$s_!6tbg!,w_424,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F62d96596-2bba-4b08-8cdb-31be5a3f5c0c_486x692.jpeg 424w, https://substackcdn.com/image/fetch/$s_!6tbg!,w_848,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F62d96596-2bba-4b08-8cdb-31be5a3f5c0c_486x692.jpeg 848w, https://substackcdn.com/image/fetch/$s_!6tbg!,w_1272,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F62d96596-2bba-4b08-8cdb-31be5a3f5c0c_486x692.jpeg 1272w, https://substackcdn.com/image/fetch/$s_!6tbg!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F62d96596-2bba-4b08-8cdb-31be5a3f5c0c_486x692.jpeg 1456w" sizes="(min-width: 800px) 720px, 100vw" alt="" width="486" height="692" loading="lazy" decoding="async"></figure>

<p>as I type this I realized I could have used @media to do the same, and it would just switch out the background image.</p>

<h3>## Grid</h3>

<p>when I got here I realized these are basically like the landing page sections, but smaller and share space.</p>

<p>so I ended up renaming some class names and named them all cards.</p>

<p>since they all shared the styling and structure within.</p>

<p>I hosted these divs within another list.</p>

<p>John's site too had it in this structure. and Derek had linked a site about early grid stuff.</p>

<p>I tried to look through them but wasn't able to really figure out what to do.</p>

<p>I was also getting really really tired.</p>

<p>so I decided to settle on inline-blocks.</p>

<figure><img src="https://substackcdn.com/image/fetch/$s_!QtRW!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F973276c0-bdfb-49e5-92f2-50990c8d5dd2_2492x1226.jpeg" srcset="https://substackcdn.com/image/fetch/$s_!QtRW!,w_424,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F973276c0-bdfb-49e5-92f2-50990c8d5dd2_2492x1226.jpeg 424w, https://substackcdn.com/image/fetch/$s_!QtRW!,w_848,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F973276c0-bdfb-49e5-92f2-50990c8d5dd2_2492x1226.jpeg 848w, https://substackcdn.com/image/fetch/$s_!QtRW!,w_1272,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F973276c0-bdfb-49e5-92f2-50990c8d5dd2_2492x1226.jpeg 1272w, https://substackcdn.com/image/fetch/$s_!QtRW!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F973276c0-bdfb-49e5-92f2-50990c8d5dd2_2492x1226.jpeg 1456w" sizes="(min-width: 800px) 720px, 100vw" alt="" width="1456" height="716" loading="lazy" decoding="async"></figure>

<p><em><strong>At least they look fine-ish on phone...</strong></em></p>

<figure><img src="https://substackcdn.com/image/fetch/$s_!aoQP!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F60257667-5900-4c11-8b96-f97f67fbfb1d_485x1287.png" srcset="https://substackcdn.com/image/fetch/$s_!aoQP!,w_424,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F60257667-5900-4c11-8b96-f97f67fbfb1d_485x1287.png 424w, https://substackcdn.com/image/fetch/$s_!aoQP!,w_848,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F60257667-5900-4c11-8b96-f97f67fbfb1d_485x1287.png 848w, https://substackcdn.com/image/fetch/$s_!aoQP!,w_1272,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F60257667-5900-4c11-8b96-f97f67fbfb1d_485x1287.png 1272w, https://substackcdn.com/image/fetch/$s_!aoQP!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F60257667-5900-4c11-8b96-f97f67fbfb1d_485x1287.png 1456w" sizes="(min-width: 800px) 720px, 100vw" alt="" width="243" height="645" loading="lazy" decoding="async"></figure>

<h3>## footer</h3>

<p>I was at the end of my rope.</p>

<p>sleepy and tired. sad about my second road test failure because I didn't look over my shoulder and almost ran into another car (even though this never happens when I'm alone.... I suck at tests). and now trying to recreate apple's site. wanting to do it perfectly and sad that I can't because they are obviously using magic.</p>

<p>so I just copy-pasted the text into &lt;p&gt;s and styled it appropriately.</p>

<figure><img src="https://substackcdn.com/image/fetch/$s_!_-Xh!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F3fc2cfd8-b5a7-4f26-8620-a8b2d107345e_753x255.png" srcset="https://substackcdn.com/image/fetch/$s_!_-Xh!,w_424,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F3fc2cfd8-b5a7-4f26-8620-a8b2d107345e_753x255.png 424w, https://substackcdn.com/image/fetch/$s_!_-Xh!,w_848,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F3fc2cfd8-b5a7-4f26-8620-a8b2d107345e_753x255.png 848w, https://substackcdn.com/image/fetch/$s_!_-Xh!,w_1272,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F3fc2cfd8-b5a7-4f26-8620-a8b2d107345e_753x255.png 1272w, https://substackcdn.com/image/fetch/$s_!_-Xh!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2F3fc2cfd8-b5a7-4f26-8620-a8b2d107345e_753x255.png 1456w" sizes="(min-width: 800px) 720px, 100vw" alt="" width="753" height="255" loading="lazy" decoding="async"></figure>

<p>did some final touchings and called it a night.</p>
