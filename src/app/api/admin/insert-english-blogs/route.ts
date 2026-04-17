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
    
    // Read English blog content from markdown files
    const artifactsDir = join(process.cwd(), '../.gemini/antigravity/brain/04afca82-9c57-406f-a85d-306f2362c331');
    
    const blog1Content = await readFile(join(artifactsDir, 'blog_en_1_complete_guide.md'), 'utf-8');
    const blog2Content = await readFile(join(artifactsDir, 'blog_en_2_comparison.md'), 'utf-8');
    const blog3Content = await readFile(join(artifactsDir, 'blog_en_3_prompt_tips.md'), 'utf-8');
    
    const blogPosts = [
      {
        slug: 'seedance-2-0-video-complete-guide',
        title: 'happy horse Video Complete Guide: Revolutionary Breakthrough in AI Video Generation',
        description: 'Comprehensive guide to happy horse video features, tutorials, and use cases. Master this powerful Happy Horseai video generator tool from text-to-video to image-to-video.',
        content: blog1Content,
        categories: 'AI Video Generation,Tutorial',
        tags: 'happy horse,AI Video,Video Generator,Tutorial,Complete Guide',
      },
      {
        slug: 'seedance-2-0-vs-sora-2-vs-capcut',
        title: 'happy horse vs Sora 2 vs CapCut: 2026\'s Best AI Video Generator Comparison',
        description: 'Comprehensive comparison of happy horse, Sora 2, and CapCut. Discover the advantages of Happy Horseai video generator and find the best video creation solution for you.',
        content: blog2Content,
        categories: 'AI Video Generation,Comparison',
        tags: 'happy horse,Sora 2,CapCut,AI Video Comparison,Video Generator',
      },
      {
        slug: 'seedance-2-0-prompt-tips-50',
        title: '50 happy horse Prompt Tips: 10x Your AI Video Quality',
        description: 'Master 50 battle-tested Happy Horseprompt tips from basic to advanced. Learn how to write high-quality prompts for Happy Horsevideo generator to create amazing videos.',
        content: blog3Content,
        categories: 'AI Video Generation,Tutorial',
        tags: 'happy horse,Prompts,AI Video Tips,Video Generation,Tutorial',
      },
    ];
    
    const results = [];
    
    // Insert each blog post
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
        sort: 0,
      };
      
      try {
        const result = await addPost(newPost);
        results.push({
          slug: blogPost.slug,
          success: !!result,
          id: result?.id,
        });
      } catch (error: any) {
        results.push({
          slug: blogPost.slug,
          success: false,
          error: error.message,
        });
      }
    }
    
    return NextResponse.json({
      message: 'Blog posts insertion completed',
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
