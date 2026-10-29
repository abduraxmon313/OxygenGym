import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// Ochiq oynalar steki: Esc faqat eng ustidagi oynani yopadi
const stack = [];

export default function Modal({ title, subtitle, onClose, size = 'md', footer, children }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const id = {};
    stack.push(id);
    const onKey = (e) => {
      if (e.key === 'Escape' && stack[stack.length - 1] === id && closeRef.current) {
        e.stopPropagation();
        closeRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      stack.splice(stack.indexOf(id), 1);
    };
  }, []);

  return (
    <div className="modal-backdrop">
      <div className={`modal modal-${size}`} role="dialog" aria-modal="true">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{title}</h2>
            {subtitle && <p className="modal-subtitle">{subtitle}</p>}
          </div>
          {onClose && (
            <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Yopish">
              <X size={18} />
            </button>
          )}
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
