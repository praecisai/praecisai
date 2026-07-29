'use client';

import { Fragment } from 'react';
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
        <Fragment key={`${word}-${i}`}>
          <motion.span
            className="inline-block"
            custom={i}
            variants={wordItem}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
          >
            {word}
          </motion.span>
          {/* Real space text node: keeps the heading readable to crawlers */}
          {i < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </Tag>
  );
}
