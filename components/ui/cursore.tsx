'use client';
import React, { useEffect } from 'react';

function Cursor() {
  useEffect(() => {
    const link = document.querySelectorAll('.hover-this');
    const cursor = document.querySelector('.cursor') as HTMLDivElement;

    const animateit = (e: MouseEvent) => {
      const hoverAnim = (e.currentTarget as HTMLElement).querySelector(
        '.hover-anim'
      );
      const { offsetX: x, offsetY: y } = e;
      const { offsetWidth: width, offsetHeight: height } =
        e.currentTarget as HTMLElement;
      const move = 25;
      const xMove = (x / width) * (move * 2) - move;
      const yMove = (y / height) * (move * 2) - move;

      (
        hoverAnim as HTMLElement
      ).style.transform = `translate(${xMove}px, ${yMove}px)`;
      if (e.type === 'mouseleave')
        (hoverAnim as HTMLElement).style.transform = '';
    };

    const editCursor = (e: MouseEvent) => {
      const { clientX: x, clientY: y } = e;
      cursor.style.left = x + 'px';
      cursor.style.top = y + 'px';
    };

    link.forEach((b) => b.addEventListener('mousemove', animateit));
    link.forEach((b) => b.addEventListener('mouseleave', animateit));
    window.addEventListener('mousemove', editCursor);

    document.querySelectorAll('a, .cursor-pointer').forEach((el) => {
      el.addEventListener('mousemove', () => {
        cursor.classList.add('cursor-active');
      });
      el.addEventListener('mouseleave', () => {
        cursor.classList.remove('cursor-active');
      });
    });
  }, []);

  return <div className='cursor'></div>;
}

export default Cursor;
