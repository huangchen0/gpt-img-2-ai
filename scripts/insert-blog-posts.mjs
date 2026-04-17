import { db } from '../src/core/db/index.js';
import { user } from '../src/config/db/schema.js';
import { addPost, PostType, PostStatus } from '../src/shared/models/post.tsx';

// Blog post contents
const blogPosts = [
  {
    slug: 'seedance-2-0-video-complete-guide',
    title: 'happy horse Video 完全指南：AI 视频生成的革命性突破',
    description: '深入了解 happy horse video 的所有功能、使用技巧和应用场景。从文本生成视频到图片生成视频,掌握这款强大的 Happy Horseai video generator 工具。',
    content: `# happy horse Video 完全指南：AI 视频生成的革命性突破

> **关键词**: happy horse video, Happy Horsevideo generator, Happy Horseai video generator, happy horse 教程

## 什么是 happy horse Video?

**happy horse video** 是 2026 年最受关注的 AI 视频生成平台。作为新一代 **Happy Horsevideo generator**,它将文本和图片转化为电影级视频内容,彻底改变了视频创作方式。

与 **Happy Horse1.0 bytedance** 版本相比,happy horse 在视频质量、生成速度和功能多样性方面都有显著提升。

## happy horse 核心功能详解

### 1. 文本生成视频 (Text-to-Video)

**Happy Horsevideo generator** 的文本生成视频功能是其最强大的特性之一。

**如何使用:**
1. 访问 happy horse 平台
2. 选择 "Text to Video" 模式
3. 输入详细的场景描述
4. 点击生成,等待 AI 创作

### 2. 图片生成视频 (Image-to-Video)

**Happy Horseimage-to-video** 功能让静态图片"活"起来。

### 3. 音频支持

很多用户问 **does Happy Horsehave audio**?答案是肯定的!

## 应用场景和案例

**Happy Horseai video generator** 帮助营销团队快速制作产品演示视频、创建社交媒体广告内容。

## 结论

**happy horse video** 代表了 AI 视频生成的最新技术水平。立即访问 happy horse,开启你的 AI 视频创作之旅!`,
    categories: 'AI视频生成,教程',
    tags: 'happy horse,AI视频,视频生成器,教程,完全指南',
  },
  {
    slug: 'seedance-2-0-vs-sora-2-vs-capcut',
    title: 'happy horse vs Sora 2 vs CapCut：2026 年最强 AI 视频生成器对比',
    description: '全面对比 happy horse、Sora 2 和 CapCut 三大 AI 视频工具。了解 Happy Horseai video generator 的优势,找到最适合你的视频创作解决方案。',
    content: `# happy horse vs Sora 2 vs CapCut：2026 年最强 AI 视频生成器对比

> **关键词**: happy horse video, Happy Horseai video generator, capcut seedance

## 2026 年 AI 视频生成器市场格局

AI 视频生成技术在 2026 年迎来爆发式增长。**happy horse video** 作为后起之秀,与 OpenAI 的 Sora 2、字节跳动的 CapCut 形成三足鼎立之势。

## 快速对比表

| 功能特性 | happy horse | Sora 2 | CapCut |
|---------|--------------|---------|---------|
| **文本生成视频** | ✅ 优秀 | ✅ 优秀 | ❌ 不支持 |
| **图片生成视频** | ✅ 优秀 | ✅ 良好 | ⚠️ 基础 |
| **生成速度** | ⚡ 2-5 分钟 | 🐌 10-20 分钟 | ⚡ 即时 |
| **价格** | 💰 ¥99/月起 | 💰💰 $200/月 | 🆓 免费/付费 |

## happy horse 深度分析

### 核心优势

**1. 性价比之王**

**Happy Horsevideo generator** 提供业界最具竞争力的定价。

**2. 生成速度快**

比 Sora 2 快 3-4 倍!

## 选择建议

对于大多数中国用户和中小企业来说,happy horse 是最佳选择!`,
    categories: 'AI视频生成,对比评测',
    tags: 'happy horse,Sora 2,CapCut,AI视频对比,视频生成器',
  },
  {
    slug: 'seedance-2-0-prompt-tips-50',
    title: '50 个 happy horse 提示词技巧：让你的 AI 视频质量提升 10 倍',
    description: '掌握 50 个实战验证的 Happy Horse提示词技巧,从基础到高级全覆盖。学会如何写出高质量提示词,让 Happy Horsevideo generator 生成令人惊艳的视频。',
    content: `# 50 个 happy horse 提示词技巧：让你的 AI 视频质量提升 10 倍

> **关键词**: happy horse video, Happy Horsevideo generator, Happy Horseai video, 提示词技巧

## 为什么提示词如此重要?

使用 **happy horse video** 时,提示词质量直接决定生成视频的效果。

## 基础技巧 (1-10)

### 1. 使用具体的描述词

❌ **错误示例:** 一个女孩在跳舞

✅ **正确示例:** 一位穿着红色连衣裙的年轻女性,在空旷的舞蹈室中优雅地跳芭蕾

### 2. 指定镜头类型

常用镜头术语:
- 特写 (Close-up)
- 中景 (Medium shot)
- 全景 (Wide shot)

### 3. 添加运动描述

运动类型:
- 缓慢推进 (Slow push in)
- 快速拉远 (Quick pull out)

## 结论

掌握这 50 个 **happy horse video** 提示词技巧,你的创作水平将大幅提升!`,
    categories: 'AI视频生成,教程',
    tags: 'happy horse,提示词,AI视频技巧,视频生成,教程',
  },
];

async function insertBlogPosts() {
  try {
    console.log('Starting to insert blog posts...');
    
    // Get the first user from database
    const users = await db().select().from(user).limit(1);
    
    if (!users || users.length === 0) {
      console.error('No users found in database. Please create a user first.');
      process.exit(1);
    }
    
    const userId = users[0].id;
    console.log(`Using user ID: ${userId}`);
    
    // Insert each blog post
    for (const blogPost of blogPosts) {
      console.log(`\nInserting blog post: ${blogPost.title}`);
      
      const newPost = {
        id: crypto.randomUUID(),
        userId: userId,
        slug: blogPost.slug,
        type: PostType.ARTICLE,
        title: blogPost.title,
        description: blogPost.description,
        image: '',
        content: blogPost.content,
        categories: blogPost.categories,
        tags: blogPost.tags,
        authorName: 'Happy HorseTeam',
        authorImage: '',
        status: PostStatus.PUBLISHED,
        sort: 0,
      };
      
      const result = await addPost(newPost);
      
      if (result) {
        console.log(`✅ Successfully inserted: ${blogPost.slug}`);
      } else {
        console.error(`❌ Failed to insert: ${blogPost.slug}`);
      }
    }
    
    console.log('\n✅ All blog posts inserted successfully!');
    console.log('\nYou can now visit /blog to see your posts.');
    
  } catch (error) {
    console.error('Error inserting blog posts:', error);
    process.exit(1);
  }
}

insertBlogPosts();
