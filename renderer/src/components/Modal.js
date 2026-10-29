import React from 'react';

export default function Modal({ children, onClose, title, large }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal fade-in ${large ? 'modal-lg' : ''}`}>
        {title && (
          <h3>
            {title}
            <span style={{ marginLeft: 'auto', cursor: 'pointer', fontSize: 20 }} onClick={onClose}>✕</span>
          </h3>
        )}
        {children}
      </div>
    </div>
  );
}
