'use client';

import { motion } from 'framer-motion';
import { wordItem, viewportOnce } from './motion';

interface AnimatedHeadingProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  as?: 'h1' | 'h2' | 'h3';
}

export default function AnimatedHeading({ text, className = '', style, as: Tag = 'h2' }: AnimatedHeadingProps) {
  const words = text.split(' ');
  return (
    <Tag className={className} style={style}>
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="inline-block mr-[0.25em]"
          custom={i}
          variants={wordItem}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {word}
        </motion.span>
      ))}
    </Tag>
  );
}
