'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import SectionHeading from './section-heading';
import { useSectionInView } from '@/lib/hooks';
import { BiHeart, BiBookmark, BiShare } from 'react-icons/bi';
import { BsEye, BsArrowRight } from 'react-icons/bs';
import { FiSearch } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';
import blogData from '@/lib/data/blogs.json';

// Types
interface Blog {
  id: string;
  title: string;
  description: string;
  date: string;
  readTime: number;
  tags: string[];
  imageUrl: string;
  link: string;
  views: number;
  likes: number;
  hashnodeSlug?: string;
}

interface HashnodeStats {
  views: number;
  likes: number;
}

// Hashnode API integration
const HASHNODE_API_ENDPOINT = 'https://api.hashnode.com/';

async function fetchHashnodeStats(slug: string): Promise<HashnodeStats> {
  try {
    const query = `
      query GetArticleStats($slug: String!) {
        post(slug: $slug) {
          totalReactions
          views
        }
      }
    `;

    const response = await fetch(HASHNODE_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add your Hashnode API key if required
        // 'Authorization': process.env.NEXT_PUBLIC_HASHNODE_API_KEY,
      },
      body: JSON.stringify({
        query,
        variables: { slug },
      }),
    });

    const data = await response.json();
    return {
      views: data.data.post.views || 0,
      likes: data.data.post.totalReactions || 0,
    };
  } catch (error) {
    console.error('Error fetching Hashnode stats:', error);
    return { views: 0, likes: 0 };
  }
}

const BlogCard: React.FC<{ blog: Blog; index: number }> = ({ blog, index }) => {
  const [stats, setStats] = useState({ views: blog.views, likes: blog.likes });

  useEffect(() => {
    if (blog.hashnodeSlug) {
      fetchHashnodeStats(blog.hashnodeSlug).then(setStats);
    }
  }, [blog.hashnodeSlug]);

  const fadeInAnimationVariants = {
    initial: { opacity: 0, y: 50 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.05 * index,
        duration: 0.5,
      },
    },
  };

  return (
    <motion.article
      variants={fadeInAnimationVariants}
      initial='initial'
      whileInView='animate'
      viewport={{ once: true }}
      className='flex flex-col bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 w-full'
    >
      {/* Image Container */}
      <div className='relative h-48 w-full overflow-hidden group'>
        <Image
          src={blog.imageUrl}
          alt={blog.title}
          fill
          className='object-cover transition-transform duration-500 group-hover:scale-105'
          sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
        />
        <div className='absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
      </div>

      {/* Content */}
      <div className='p-6 flex flex-col flex-grow'>
        {/* Tags */}
        <div className='flex flex-wrap gap-2 mb-3'>
          {blog.tags.map((tag) => (
            <span
              key={tag}
              className='px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200 rounded-full'
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Title */}
        <h3 className='text-lg font-semibold mb-2 line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left'>
          {blog.title}
        </h3>

        {/* Description */}
        <p className='text-gray-600 dark:text-gray-300 mb-4 line-clamp-2 text-xs text-left'>
          {blog.description}
        </p>

        {/* Meta Info */}
        <div className='mt-auto'>
          <div className='flex items-center justify-between text-xs text-gray-500 dark:text-gray-400'>
            <span>{blog.date}</span>
            <span>{blog.readTime} min read</span>
          </div>

          <div className='flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700'>
            <div className='flex items-center gap-4'>
              <button className='flex items-center gap-1 text-gray-500 hover:text-blue-600 transition-colors'>
                <BsEye className='w-4 h-4' />
                <span className='text-sm'>{stats.views}</span>
              </button>
              <button className='flex items-center gap-1 text-gray-500 hover:text-red-600 transition-colors'>
                <BiHeart className='w-4 h-4' />
                <span className='text-sm'>{stats.likes}</span>
              </button>
              <button className='p-2 hover:bg-gray-500 dark:hover:bg-gray-700 rounded-full transition-colors'>
                <BiShare className='w-4 h-4' />
              </button>
            </div>
            <Link
              href={blog.link}
              className='inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline gap-1 text-xs font-medium'
            >
              Read More
              <BsArrowRight className='w-4 h-4' />
            </Link>
          </div>
        </div>
      </div>
    </motion.article>
  );
};

const Blogs: React.FC = () => {
  const { ref } = useSectionInView('Blogs');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Get unique tags from blog data
  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    tags.add('All');
    blogData.forEach((blog) => {
      blog.tags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags);
  }, []);

  // Filter and sort blogs
  const filteredAndSortedBlogs = useMemo(() => {
    return [...blogData]
      .filter((blog) => {
        const matchesTag =
          selectedTag === 'All' || blog.tags.includes(selectedTag);
        const matchesSearch =
          blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          blog.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          blog.tags.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase())
          );
        return matchesTag && matchesSearch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedTag, searchQuery]);

  return (
    <section
      ref={ref}
      id='blogs'
      className='mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 max-w-[60rem] scroll-mt-28 text-center sm:mb-40 mb-28'
    >
      <SectionHeading>Latest Articles</SectionHeading>

      {/* Search and Filter Controls */}
      <div className='flex flex-col sm:flex-row items-center justify-between gap-4 mb-8'>
        {/* Search Bar */}
        <div className='relative w-full sm:w-64 md:top-0'>
          <input
            type='text'
            placeholder='Search articles...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-full px-4 py-2 pl-10 text-sm border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700'
          />
          <FiSearch className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' />
        </div>

        {/* Tags Filter */}
        <div className='flex flex-wrap gap-2 justify-center sm:justify-end'>
          {uniqueTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                selectedTag === tag
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Blog Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {filteredAndSortedBlogs.map((blog, index) => (
          <BlogCard key={blog.id} blog={blog} index={index} />
        ))}
      </div>

      {/* No Results Message */}
      {filteredAndSortedBlogs.length === 0 && (
        <div className='text-center py-12'>
          <p className='text-gray-600 dark:text-gray-400'>
            No articles found matching your criteria.
          </p>
        </div>
      )}
    </section>
  );
};

export default Blogs;
