// Complete Blog System with CRUD, Comments, Rich Text Editor, Search, Filter, Sort
(function() {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  const LS_KEY = 'cds_blog_posts';
  const DRAFT_KEY = 'cds_blog_draft';

  const state = {
    posts: [],
    filters: { category:'', sort:'-date', search:'' },
    current: null, // viewing post
    editing: null // currently editing post
  };

  function loadPosts(){
    try { return JSON.parse(localStorage.getItem(LS_KEY)||'[]'); } catch { return []; }
  }
  function savePosts(posts){ localStorage.setItem(LS_KEY, JSON.stringify(posts)); }
  function loadDraft(){ try { return JSON.parse(localStorage.getItem(DRAFT_KEY)||'null'); } catch { return null; } }
  function saveDraft(d){ localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); }
  function clearDraft(){ localStorage.removeItem(DRAFT_KEY); }

  function authUser(){ try { return JSON.parse(localStorage.getItem('cds_user')||'null'); } catch { return null; } }
  function toast(msg){ let t=$('.toast'); if(!t){t=document.createElement('div'); t.className='toast'; document.body.appendChild(t);} t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2000); }

  // Render blog posts grid
  function renderGrid(posts) {
    const gallery = $('#blogGallery');
    const emptyState = $('#emptyState');
    
    if (!gallery) return;
    
    gallery.innerHTML = '';
    
    if (!posts.length) {
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }
    
    if (emptyState) emptyState.classList.add('hidden');
    
    const signedIn = !!authUser();
    
    posts.forEach((post, index) => {
      const card = document.createElement('article');
      card.className = 'blog-card';
      card.setAttribute('role', 'listitem');
      card.tabIndex = 0;
      
      // Animation delay
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      card.style.transition = `all 0.4s ease ${index * 0.05}s`;
      
      const coverImg = post.coverUrl || 'https://via.placeholder.com/400x225/1a2238/965aff?text=' + encodeURIComponent(post.title);
      const dateStr = formatDate(post.date);
      const excerpt = post.excerpt || stripHtml(post.content).slice(0, 150) + '...';
      const readTime = calculateReadTime(post.content);
      
      card.innerHTML = `
        <div class="card-image-wrapper">
          <img class="card-image" src="${coverImg}" alt="${post.title}" onerror="this.src='https://via.placeholder.com/400x225/1a2238/965aff?text=Blog'">
          <div class="category-badge">${getCategoryEmoji(post.category)} ${formatCategory(post.category)}</div>
        </div>
        <div class="card-content">
          <div class="post-meta">
            <span>👤 ${post.author || 'Anonymous'}</span>
            <span>📅 ${dateStr}</span>
            <span>⏱️ ${readTime} min read</span>
          </div>
          <h3 class="card-title">${post.title}</h3>
          <p class="card-excerpt">${excerpt}</p>
          <div class="tag-chips">
            ${(post.tags || []).slice(0, 3).map(tag => `<span class="tag-chip">#${tag}</span>`).join('')}
          </div>
          <div class="card-stats">
            <div class="stat-item"><span>👁️</span> ${post.views || 0}</div>
            <div class="stat-item"><span>💬</span> ${(post.comments || []).length}</div>
          </div>
        </div>
      `;
      
      // Animate in
      setTimeout(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, 50 + index * 50);
      
      card.addEventListener('click', () => openPostDetail(post));
      
      if (signedIn) {
        attachActions(card, post);
      }
      
      gallery.appendChild(card);
    });
    
    // Update stats
    updateStats(posts);
  }

  function attachActions(card, p){
    const bar=document.createElement('div'); bar.style.position='absolute'; bar.style.top='10px'; bar.style.right='10px'; bar.style.display='flex'; bar.style.gap='6px';
    const edit=document.createElement('button'); edit.type='button'; edit.className='icon-btn'; edit.textContent='✎'; edit.title='Edit';
    const del=document.createElement('button'); del.type='button'; del.className='icon-btn'; del.textContent='🗑'; del.title='Delete';
    bar.append(edit,del); card.style.position='relative'; card.appendChild(bar);
    edit.addEventListener('click', (e)=>{ e.stopPropagation(); beginEdit(p); });
    del.addEventListener('click', (e)=>{ e.stopPropagation(); if(confirm('Delete this post?')){ state.posts = state.posts.filter(x=>x.id!==p.id); savePosts(state.posts); toast('Deleted'); load(); } });
  }

  // Helper Functions
  function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  
  function stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }
  
  function calculateReadTime(content) {
    const wordsPerMinute = 200;
    const text = stripHtml(content);
    const wordCount = text.split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  }
  
  function getCategoryEmoji(category) {
    const emojis = {
      webdev: '🌐',
      mobiledev: '📱',
      aiml: '🤖',
      design: '🎨',
      devops: '⚙️',
      blockchain: '⛓️',
      tutorials: '📚',
      opinion: '💭',
      other: '📌'
    };
    return emojis[category] || '📝';
  }
  
  function formatCategory(category) {
    const names = {
      webdev: 'Web Dev',
      mobiledev: 'Mobile Dev',
      aiml: 'AI/ML',
      design: 'Design',
      devops: 'DevOps',
      blockchain: 'Blockchain',
      tutorials: 'Tutorials',
      opinion: 'Opinion',
      other: 'Other'
    };
    return names[category] || category;
  }
  
  function updateStats(posts) {
    const totalPosts = posts.length;
    const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
    const totalComments = posts.reduce((sum, p) => sum + (p.comments || []).length, 0);
    
    const totalPostsEl = $('#totalPosts');
    const totalViewsEl = $('#totalViews');
    const totalCommentsEl = $('#totalComments');
    
    if (totalPostsEl) totalPostsEl.textContent = totalPosts;
    if (totalViewsEl) totalViewsEl.textContent = totalViews;
    if (totalCommentsEl) totalCommentsEl.textContent = totalComments;
  }
  
  // Open post detail modal
  function openPostDetail(post) {
    // Increment views
    const idx = state.posts.findIndex(x => x.id === post.id);
    if (idx >= 0) {
      state.posts[idx].views = (state.posts[idx].views || 0) + 1;
      savePosts(state.posts);
      post = state.posts[idx];
    }
    
    state.current = post;
    
    const modal = $('#postDetailModal');
    const content = $('#postDetailContent');
    
    if (!modal || !content) return;
    
    const dateStr = new Date(post.date).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const readTime = calculateReadTime(post.content);
    const coverImg = post.coverUrl || 'https://via.placeholder.com/800x400/1a2238/965aff?text=' + encodeURIComponent(post.title);
    
    content.innerHTML = `
      <article class=\"post-article\">
        <div class=\"post-category-badge\">${getCategoryEmoji(post.category)} ${formatCategory(post.category)}</div>
        <h1 class=\"post-title\">${post.title}</h1>
        <div class=\"post-meta-info\">
          <div class=\"author-info\">
            <div class=\"author-avatar\">${(post.author || 'A')[0].toUpperCase()}</div>
            <div>
              <div class=\"author-name\">${post.author || 'Anonymous'}</div>
              <div class=\"post-date\">${dateStr} • ${readTime} min read</div>
            </div>
          </div>
          <div class=\"post-stats-inline\">
            <span>👁️ ${post.views || 0} views</span>
            <span>💬 ${(post.comments || []).length} comments</span>
          </div>
        </div>
        <img class=\"post-cover-image\" src=\"${coverImg}\" alt=\"${post.title}\" onerror=\"this.style.display='none'\">
        <div class=\"post-content-body\">${post.content}</div>
        <div class=\"post-tags\">
          ${(post.tags || []).map(tag => `<span class=\"post-tag\">#${tag}</span>`).join('')}
        </div>
      </article>
    `;
    
    // Render comments
    renderComments(post.comments || []);
    
    // Update comments count
    const commentsCountEl = $('#commentsCount');
    if (commentsCountEl) commentsCountEl.textContent = (post.comments || []).length;
    
    modal.classList.remove('hidden');
  }

  function toggle(sel, open){ const m=$(sel); if(!m) return; m.classList.toggle('hidden', !open); }

  // Render comments
  function renderComments(comments) {
    const list = $('#commentsList');
    if (!list) return;
    
    list.innerHTML = '';
    
    if (!comments || comments.length === 0) {
      list.innerHTML = '<p style="text-align:center;color:rgba(255,255,255,0.5);padding:2rem;">No comments yet. Be the first to comment!</p>';
      return;
    }
    
    comments.forEach(comment => {
      const commentEl = document.createElement('div');
      commentEl.className = 'comment-item';
      const dateStr = formatDate(comment.date);
      
      commentEl.innerHTML = `
        <div class="comment-header">
          <div class="comment-author-avatar">${(comment.author || 'A')[0].toUpperCase()}</div>
          <div class="comment-meta">
            <div class="comment-author">${comment.author || 'Anonymous'}</div>
            <div class="comment-date">${dateStr}</div>
          </div>
        </div>
        <div class="comment-text">${comment.text}</div>
      `;
      
      list.appendChild(commentEl);
    });
  }
  
  // Open editor modal
  function beginEdit(post) {
    console.log('📝 beginEdit called, post:', post);
    
    const modal = $('#editorModal');
    const title = $('#editorTitle');
    const form = $('#postForm');
    
    console.log('🔍 Modal element:', modal);
    console.log('🔍 Form element:', form);
    
    if (!modal) {
      console.error('❌ Modal not found!');
      return;
    }
    
    if (!form) {
      console.error('❌ Form not found!');
      return;
    }
    
    if (title) {
      title.textContent = post ? '✎ Edit Post' : '✍️ Write New Post';
    }
    
    // Populate form
    const postTitle = $('#postTitle');
    const postCategory = $('#postCategory');
    const postExcerpt = $('#postExcerpt');
    const postTags = $('#postTags');
    const postEditor = $('#postEditor');
    const coverPreview = $('#coverPreview');
    const postStatus = $('#postStatus');
    
    if (postTitle) postTitle.value = post?.title || '';
    if (postCategory) postCategory.value = post?.category || 'webdev';
    if (postExcerpt) postExcerpt.value = post?.excerpt || '';
    if (postTags) postTags.value = (post?.tags || []).join(', ');
    if (postEditor) postEditor.innerHTML = post?.content || '';
    if (postStatus) postStatus.value = post?.status || 'published';
    
    if (coverPreview && post?.coverUrl) {
      coverPreview.innerHTML = `<div class="preview-item"><img src="${post.coverUrl}"/><button type="button" class="remove" onclick="document.getElementById('coverPreview').innerHTML=''">×</button></div>`;
    } else if (coverPreview) {
      coverPreview.innerHTML = '';
    }
    
    form.dataset.editingId = post?.id || '';
    state.editing = post || null;
    
    console.log('✅ Opening modal...');
    modal.classList.remove('hidden');
    console.log('✅ Modal opened! Classes:', modal.className);
  }

  // Build post object from form
  function buildPostFromForm() {
    const form = $('#postForm');
    const id = form?.dataset.editingId || `post_${Date.now()}`;
    const title = $('#postTitle')?.value.trim();
    const category = $('#postCategory')?.value;
    const excerpt = $('#postExcerpt')?.value.trim();
    const tags = $('#postTags')?.value.split(',').map(s => s.trim()).filter(Boolean);
    const content = $('#postEditor')?.innerHTML.trim();
    const status = $('#postStatus')?.value || 'published';
    const coverUrl = $('#coverPreview img')?.src || '';
    
    const user = authUser();
    const author = state.editing?.author || user?.username || 'Anonymous';
    const date = state.editing?.date || Date.now();
    const comments = state.editing?.comments || [];
    const views = state.editing?.views || 0;
    
    return {
      id,
      title,
      category,
      excerpt,
      tags,
      content,
      status,
      coverUrl,
      author,
      date,
      comments,
      views
    };
  }

  function persistPost(post){
    const idx = state.posts.findIndex(x=>x.id===post.id);
    if (idx>=0) state.posts[idx] = post; else state.posts.unshift(post);
    savePosts(state.posts);
  }

  function applyFilters(posts) {
    let arr = posts.slice();
    const { category, search, sort } = state.filters;
    
    // Filter by category
    if (category) {
      arr = arr.filter(p => (p.category || '').toLowerCase() === category.toLowerCase());
    }
    
    // Filter by search query
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(p => {
        const searchText = (p.title + " " + (p.content || '') + " " + (p.tags || []).join(' ')).toLowerCase();
        return searchText.includes(q);
      });
    }
    
    // Sort posts
    if (sort === '-date') {
      arr.sort((a, b) => (b.date || 0) - (a.date || 0));
    } else if (sort === 'date') {
      arr.sort((a, b) => (a.date || 0) - (b.date || 0));
    } else if (sort === '-views') {
      arr.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (sort === '-comments') {
      arr.sort((a, b) => ((b.comments || []).length) - ((a.comments || []).length));
    }
    
    return arr;
  }

  function load() {
    console.log('📚 Loading posts...');
    
    try {
      // Show loading spinner briefly
      const spinner = $('#loadingSpinner');
      if (spinner) {
        spinner.classList.remove('hidden');
      }
      
      // Load posts from localStorage
      state.posts = loadPosts();
      console.log('📊 Loaded posts:', state.posts.length);
      
      // Apply filters
      const filtered = applyFilters(state.posts);
      console.log('🔍 Filtered posts:', filtered.length);
      
      // Render the grid
      renderGrid(filtered);
      
      // Always hide loading spinner
      if (spinner) {
        spinner.classList.add('hidden');
        console.log('✅ Spinner hidden');
      }
    } catch (error) {
      console.error('❌ Error in load():', error);
      // Force hide spinner on error
      const spinner = $('#loadingSpinner');
      if (spinner) spinner.classList.add('hidden');
    }
  }

  // Initialize sample posts if none exist
  function initializeSamplePosts() {
    console.log('🔄 Checking for existing posts...');
    const existing = loadPosts();
    console.log('📦 Found', existing.length, 'existing posts');
    
    if (existing.length > 0) {
      console.log('✅ Posts already exist, skipping initialization');
      return; // Already have posts
    }
    
    console.log('🎨 Creating sample posts...');
    
    const samplePosts = [
      {
        id: 'sample_1',
        title: 'Getting Started with React Hooks',
        category: 'webdev',
        excerpt: 'Learn how to use React Hooks to manage state and side effects in your functional components. A comprehensive guide for beginners.',
        content: `<h2>Introduction to React Hooks</h2>
          <p>React Hooks revolutionized the way we write React components. Instead of using class components, we can now use functional components with state and lifecycle methods.</p>
          <h3>The useState Hook</h3>
          <p>The most basic hook is useState, which allows you to add state to functional components:</p>
          <pre>const [count, setCount] = useState(0);</pre>
          <h3>The useEffect Hook</h3>
          <p>useEffect lets you perform side effects in functional components. It's similar to componentDidMount, componentDidUpdate, and componentWillUnmount combined.</p>
          <p>Hooks make your code more readable and easier to understand. Start using them in your next project!</p>`,
        tags: ['react', 'javascript', 'hooks', 'tutorial'],
        author: 'Tech Blogger',
        date: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
        comments: [
          { author: 'Dev User', text: 'Great tutorial! Very helpful for understanding hooks.', date: Date.now() - 1 * 24 * 60 * 60 * 1000 },
          { author: 'Code Ninja', text: 'Thanks for the clear explanations!', date: Date.now() - 12 * 60 * 60 * 1000 }
        ],
        views: 142,
        status: 'published',
        coverUrl: 'https://via.placeholder.com/800x400/1a2238/965aff?text=React+Hooks'
      },
      {
        id: 'sample_2',
        title: '10 Tips for Better UI Design',
        category: 'design',
        excerpt: 'Improve your user interface design with these essential tips and best practices. Learn from real-world examples.',
        content: `<h2>Essential UI Design Tips</h2>
          <p>Good UI design is crucial for user experience. Here are 10 tips to improve your designs:</p>
          <h3>1. Consistency is Key</h3>
          <p>Maintain consistent colors, fonts, and spacing throughout your application.</p>
          <h3>2. White Space Matters</h3>
          <p>Don't be afraid of empty space. It helps users focus on what's important.</p>
          <h3>3. Typography Hierarchy</h3>
          <p>Use different font sizes and weights to create clear visual hierarchy.</p>
          <p>Remember: great design is invisible. Users should focus on content, not the interface.</p>`,
        tags: ['design', 'ui', 'ux', 'tips'],
        author: 'Design Expert',
        date: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
        comments: [
          { author: 'Designer Pro', text: 'These tips are gold! Sharing with my team.', date: Date.now() - 3 * 24 * 60 * 60 * 1000 }
        ],
        views: 89,
        status: 'published',
        coverUrl: 'https://via.placeholder.com/800x400/1a2238/965aff?text=UI+Design+Tips'
      },
      {
        id: 'sample_3',
        title: 'Introduction to Machine Learning',
        category: 'aiml',
        excerpt: 'A beginner-friendly guide to understanding machine learning concepts, algorithms, and applications in modern software.',
        content: `<h2>What is Machine Learning?</h2>
          <p>Machine Learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed.</p>
          <h3>Types of Machine Learning</h3>
          <ul>
            <li><strong>Supervised Learning:</strong> Learning from labeled data</li>
            <li><strong>Unsupervised Learning:</strong> Finding patterns in unlabeled data</li>
            <li><strong>Reinforcement Learning:</strong> Learning through trial and error</li>
          </ul>
          <h3>Popular Algorithms</h3>
          <p>Some widely-used ML algorithms include Linear Regression, Decision Trees, Neural Networks, and Support Vector Machines.</p>
          <p>Start your ML journey today with Python and libraries like scikit-learn and TensorFlow!</p>`,
        tags: ['ai', 'ml', 'tutorial', 'python'],
        author: 'ML Researcher',
        date: Date.now() - 1 * 24 * 60 * 60 * 1000, // Yesterday
        comments: [
          { author: 'Data Scientist', text: 'Perfect introduction for beginners!', date: Date.now() - 12 * 60 * 60 * 1000 },
          { author: 'Student', text: 'Finally understood the basics, thanks!', date: Date.now() - 6 * 60 * 60 * 1000 },
          { author: 'Developer', text: 'Looking forward to more ML content!', date: Date.now() - 2 * 60 * 60 * 1000 }
        ],
        views: 256,
        status: 'published',
        coverUrl: 'https://via.placeholder.com/800x400/1a2238/965aff?text=Machine+Learning'
      }
    ];
    
    console.log('💾 Saving sample posts to localStorage...');
    savePosts(samplePosts);
    console.log('✅ Sample posts saved!');
    
    // Verify they were saved
    const verified = loadPosts();
    console.log('✔️ Verified:', verified.length, 'posts in storage');
    
    return samplePosts;
  }

  // Main initialization function
  function init() {
    console.log('🚀 Blog init called');
    console.log('📄 Body classes:', document.body.className);
    
    if (!document.body.classList.contains('blog-page')) {
      console.log('⚠️ Not a blog page, skipping init');
      return;
    }
    
    console.log('🎨 Initializing Blog System...');

    // Initialize sample posts
    initializeSamplePosts();
    console.log('✅ Sample posts initialized');

    // Category Filter
    $('#categoryFilter')?.addEventListener('change', e => {
      state.filters.category = e.target.value;
      console.log('📂 Category filter:', e.target.value);
      load();
    });

    // Sort Select
    $('#sortSelect')?.addEventListener('change', e => {
      const sortMap = {
        'newest': '-date',
        'oldest': 'date',
        'views': '-views',
        'comments': '-comments',
        'trending': '-views'
      };
      state.filters.sort = sortMap[e.target.value] || '-date';
      console.log('🔄 Sort:', e.target.value);
      load();
    });

    // Search Input
    $('#searchInput')?.addEventListener('input', e => {
      state.filters.search = e.target.value.trim();
      console.log('🔍 Search:', e.target.value);
      load();
    });

    // Write Post Button
    const writePostBtn = $('#writePostBtn');
    if (writePostBtn) {
      writePostBtn.addEventListener('click', () => {
        const user = authUser();
        if (!user) {
          toast('⚠️ Please sign in to write a post.');
          setTimeout(() => window.location.href = 'login.html', 1500);
          return;
        }
        console.log('✍️ Opening editor...');
        beginEdit();
      });
    }
    
    // Write First Post Button
    const writeFirstPostBtn = $('#writeFirstPost');
    console.log('🔍 Write First Post button:', writeFirstPostBtn);
    
    if (writeFirstPostBtn) {
      writeFirstPostBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('🎯 Write First Post clicked!');
        
        const user = authUser();
        console.log('👤 User check:', user);
        
        if (!user) {
          console.log('❌ Not logged in');
          toast('⚠️ Please sign in to write a post.');
          setTimeout(() => window.location.href = 'login.html', 1500);
          return;
        }
        
        console.log('✅ User logged in, opening editor...');
        beginEdit();
      });
    } else {
      console.error('❌ Write First Post button not found!');
    }

    // Close Editor
    $('#closeEditor')?.addEventListener('click', () => {
      const modal = $('#editorModal');
      if (modal) modal.classList.add('hidden');
    });
    
    // Cancel Post
    $('#cancelPost')?.addEventListener('click', () => {
      const modal = $('#editorModal');
      if (modal) modal.classList.add('hidden');
    });

    // Editor toolbar commands
    $$('.editor-toolbar button[data-cmd]')?.forEach(btn=> btn.addEventListener('click',()=>{
      const cmd = btn.dataset.cmd; const val = btn.dataset.val || null; document.execCommand(cmd, false, val);
    }));
    $('#insertLink')?.addEventListener('click', ()=>{ const url=prompt('Enter URL'); if(url) document.execCommand('createLink', false, url); });
    $('#insertCode')?.addEventListener('click', ()=>{ const sel=document.getSelection(); if(!sel || sel.rangeCount===0) return; const r=sel.getRangeAt(0); const pre=document.createElement('pre'); pre.textContent = sel.toString(); r.deleteContents(); r.insertNode(pre); });
    $('#insertImage')?.addEventListener('click', ()=>{ const url=prompt('Image URL'); if(url){ const img=document.createElement('img'); img.src=url; $('#postEditor').appendChild(img); } });
    $('#togglePreview')?.addEventListener('click', ()=>{ $('#postPreview').innerHTML=$('#postEditor').innerHTML; const isPrev=$('#postPreview').hidden===false; $('#postPreview').hidden = isPrev; $('#postEditor').hidden = !isPrev; });

    // Cover upload (preview only)
    $('#chooseCover')?.addEventListener('click', ()=>$('#coverInput').click());
    function setCoverFromFile(f){ if(!f) return; const reader=new FileReader(); reader.onload=()=>{ const url=reader.result; $('#coverPreview').innerHTML=`<div class="preview-item"><img src="${url}"/></div>`; }; reader.readAsDataURL(f); }
    $('#coverInput')?.addEventListener('change', e=>{ const f=e.target.files?.[0]; setCoverFromFile(f); });
    // Drag & drop on cover
    const dz = $('#coverDrop');
    if (dz){
      dz.addEventListener('dragover', e=>{ e.preventDefault(); dz.classList.add('dragover'); });
      dz.addEventListener('dragleave', ()=> dz.classList.remove('dragover'));
      dz.addEventListener('drop', e=>{ e.preventDefault(); dz.classList.remove('dragover'); const f=e.dataTransfer?.files?.[0]; setCoverFromFile(f); });
    }

    // Auto-save draft
    const draft = loadDraft();
    if (draft){ $('#postTitle').value=draft.title||''; $('#postCategory').value=draft.category||'dev'; $('#postTags').value=(draft.tags||[]).join(', '); $('#postEditor').innerHTML=draft.content||''; if(draft.coverUrl){ $('#coverPreview').innerHTML=`<div class="preview-item"><img src="${draft.coverUrl}"/></div>`; } }
    function updateDraft(){
      const d={ title:$('#postTitle').value, category:$('#postCategory').value, tags:$('#postTags').value.split(',').map(s=>s.trim()).filter(Boolean), content:$('#postEditor').innerHTML, coverUrl: $('#coverPreview img')?.src || '' };
      saveDraft(d);
    }
    ['input','keyup'].forEach(ev=> $('#postEditor')?.addEventListener(ev, updateDraft));
    $('#postTitle')?.addEventListener('input', updateDraft);
    $('#postTags')?.addEventListener('input', updateDraft);
    $('#postCategory')?.addEventListener('change', updateDraft);

    // Character counters
    $('#postTitle')?.addEventListener('input', e => {
      const counter = $('#titleCharCount');
      if (counter) counter.textContent = e.target.value.length;
    });
    
    $('#postExcerpt')?.addEventListener('input', e => {
      const counter = $('#excerptCharCount');
      if (counter) counter.textContent = e.target.value.length;
    });
    
    $('#commentText')?.addEventListener('input', e => {
      const counter = $('#commentCharCount');
      if (counter) counter.textContent = e.target.value.length;
    });

    // Cover image upload
    $('#chooseCover')?.addEventListener('click', () => $('#coverInput')?.click());
    
    $('#coverInput')?.addEventListener('change', e => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          const preview = $('#coverPreview');
          if (preview) {
            preview.innerHTML = `<div class="preview-item"><img src="${reader.result}"/><button type="button" class="remove" onclick="document.getElementById('coverPreview').innerHTML=''">×</button></div>`;
          }
        };
        reader.readAsDataURL(file);
      }
    });
    
    // Drag & drop for cover
    const coverDrop = $('#coverDrop');
    if (coverDrop) {
      coverDrop.addEventListener('dragover', e => {
        e.preventDefault();
        coverDrop.classList.add('dragover');
      });
      
      coverDrop.addEventListener('dragleave', () => {
        coverDrop.classList.remove('dragover');
      });
      
      coverDrop.addEventListener('drop', e => {
        e.preventDefault();
        coverDrop.classList.remove('dragover');
        const file = e.dataTransfer?.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            const preview = $('#coverPreview');
            if (preview) {
              preview.innerHTML = `<div class="preview-item"><img src="${reader.result}"/><button type="button" class="remove" onclick="document.getElementById('coverPreview').innerHTML=''">×</button></div>`;
            }
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Post form submission
    $('#postForm')?.addEventListener('submit', e => {
      e.preventDefault();
      
      const user = authUser();
      if (!user) {
        toast('⚠️ Please sign in to publish.');
        return;
      }
      
      const post = buildPostFromForm();
      
      if (!post.title) {
        toast('❌ Please enter a title');
        return;
      }
      
      if (!post.content || post.content.trim() === '') {
        toast('❌ Please enter some content');
        return;
      }
      
      persistPost(post);
      clearDraft();
      toast('✅ Post published successfully!');
      
      const modal = $('#editorModal');
      if (modal) modal.classList.add('hidden');
      
      load();
      state.editing = null;
    });
    
    // Save as draft
    $('#saveDraft')?.addEventListener('click', () => {
      const post = buildPostFromForm();
      post.status = 'draft';
      persistPost(post);
      toast('💾 Draft saved!');
      const modal = $('#editorModal');
      if (modal) modal.classList.add('hidden');
      load();
    });

    // Back to blog button
    $('#backToBlog')?.addEventListener('click', () => {
      const modal = $('#postDetailModal');
      if (modal) modal.classList.add('hidden');
    });
    
    // Copy post link
    $('#copyPostLink')?.addEventListener('click', () => {
      if (state.current) {
        const url = `${location.origin}${location.pathname}#post-${state.current.id}`;
        navigator.clipboard.writeText(url).then(() => {
          toast('🔗 Link copied to clipboard!');
        });
      }
    });

    // Comment form submission
    $('#commentForm')?.addEventListener('submit', e => {
      e.preventDefault();
      
      const commentText = $('#commentText');
      const text = commentText?.value.trim();
      
      if (!text) {
        toast('❌ Please enter a comment');
        return;
      }
      
      const user = authUser();
      if (!user) {
        toast('⚠️ Please sign in to comment.');
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
      }
      
      const comment = {
        author: user.username || user.name || 'Anonymous',
        text: text,
        date: Date.now()
      };
      
      const idx = state.posts.findIndex(x => x.id === state.current.id);
      if (idx >= 0) {
        state.posts[idx].comments = state.posts[idx].comments || [];
        state.posts[idx].comments.push(comment);
        savePosts(state.posts);
        
        // Refresh the post detail view
        openPostDetail(state.posts[idx]);
        
        if (commentText) commentText.value = '';
        toast('✅ Comment added!');
      }
    });

    // Modal backdrop clicks
    $$('.modal-backdrop')?.forEach(backdrop => {
      backdrop.addEventListener('click', e => {
        if (e.target === backdrop) {
          const modal = backdrop.closest('.modal');
          if (modal) modal.classList.add('hidden');
        }
      });
    });

    // Load posts
    console.log('📚 Loading blog posts...');
    
    // Make sure to hide loading spinner after initialization
    setTimeout(() => {
      const spinner = $('#loadingSpinner');
      if (spinner) {
        spinner.classList.add('hidden');
        console.log('🔄 Loading spinner hidden');
      }
      load();
    }, 100);

    // Deep-link support
    if (location.hash.startsWith('#post-')) {
      const id = location.hash.slice(6); // Remove '#post-'
      const found = state.posts.find(p => p.id === id);
      if (found) {
        console.log('🔗 Opening post from deep link:', id);
        openPostDetail(found);
      }
    }
    
    console.log('✅ Blog system initialized!');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
