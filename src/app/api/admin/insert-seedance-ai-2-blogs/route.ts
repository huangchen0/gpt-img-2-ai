import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

import { addPost, PostType, PostStatus } from '@/shared/models/post';
import { db } from '@/core/db';
import { user } from '@/config/db/schema';

export async function GET(request: NextRequest) {
  try {
    // Get the first user from database
    const users = await db().select().from(user).limit(1);

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: 'No users found in database' },
        { status: 404 }
      );
    }

    const userId = users[0].id;

    // Read blog content from markdown files in the same directory
    const blogDir = join(process.cwd(), 'src/app/api/admin/insert-english-blogs');

    const enContent = await readFile(join(blogDir, 'blog_seedance_ai_2_en.md'), 'utf-8');
    const zhContent = await readFile(join(blogDir, 'blog_seedance_ai_2_zh.md'), 'utf-8');

    const blogPosts = [
      {
        slug: 'seedance-ai-2-next-generation-video-generator',
        title: 'Happy HorseAI 2.0: The Next-Generation AI Video Generator from ByteDance',
        description: 'Discover Happy HorseAI 2.0, ByteDance\'s revolutionary AI video generation model with multimodal input, director-level control, and immersive audio-visual experience.',
        content: enContent,
        categories: 'AI Video Generation,Product Launch',
        tags: 'Happy HorseAI 2.0,ByteDance,AI Video,Video Generator,happy horse,See Dance,Seed Dance',
        locale: 'en',
      },
      {
        slug: 'seedance-ai-2-xia-yi-dai-shipin-shengcheng',
        title: 'Happy HorseAI 2.0：字节跳动推出的下一代AI视频生成模型',
        description: '深入了解Happy HorseAI 2.0，字节跳动推出的革命性AI视频生成模型，支持多模态输入、导演级控制和沉浸式音视频体验。',
        content: zhContent,
        categories: 'AI视频生成,产品发布',
        tags: 'Happy HorseAI 2.0,字节跳动,AI视频,视频生成器,happy horse,See Dance,Seed Dance',
        locale: 'zh',
      },
    ];

    const results = [];

    for (const blogPost of blogPosts) {
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
        locale: blogPost.locale,
        sort: 0,
      };

      try {
        const result = await addPost(newPost);
        results.push({
          slug: blogPost.slug,
          locale: blogPost.locale,
          success: !!result,
          id: result?.id,
        });
      } catch (error: any) {
        results.push({
          slug: blogPost.slug,
          locale: blogPost.locale,
          success: false,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      message: 'Happy HorseAI 2.0 blog posts insertion completed',
      userId,
      results,
    });
  } catch (error: any) {
    console.error('Error inserting blog posts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to insert blog posts' },
      { status: 500 }
    );
  }
}
