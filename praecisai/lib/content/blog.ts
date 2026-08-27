import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  author: string;
  content: string;
};

const blogDir = path.join(process.cwd(), 'content', 'blog');

export function getBlogPosts(): BlogPost[] {
  if (!fs.existsSync(blogDir)) {
    return [];
  }

  const files = fs.readdirSync(blogDir).filter((file) => file.endsWith('.mdx'));

  const posts = files.map((file) => {
    const filePath = path.join(blogDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);

    return {
      slug: data.slug || file.replace(/\.mdx$/, ''),
      title: data.title || '',
      description: data.description || '',
      publishedAt: data.publishedAt || '',
      author: data.author || '',
      content,
    };
  });

  return posts.sort((a, b) => (new Date(a.publishedAt) < new Date(b.publishedAt) ? 1 : -1));
}

export function getBlogPost(slug: string): BlogPost | undefined {
  return getBlogPosts().find((post) => post.slug === slug);
}
