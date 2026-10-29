import React, { createContext, useCallback, useContext, useState } from 'react';
import Modal from './Modal';

// window.confirm Electron'da kiritish maydonlari fokusini buzadi, shuning uchun o'zimizning oyna
const ConfirmContext = createContext(() => Promise.resolve(false));

export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);

  const confirm = useCallback((options) => new Promise((resolve) => setRequest({ ...options, resolve })), []);

  const close = (result) => {
    if (request) request.resolve(result);
    setRequest(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && (
        <Modal
          size="sm"
          title={request.title || 'Tasdiqlang'}
          onClose={() => close(false)}
          footer={(
            <>
              <button type="button" className="btn btn-secondary" onClick={() => close(false)}>
                {request.cancelText || 'Bekor qilish'}
              </button>
              <button type="button" className={`btn ${request.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => close(true)} autoFocus>
                {request.confirmText || 'Tasdiqlash'}
              </button>
            </>
          )}
        >
          <p className="confirm-text">{request.message}</p>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}
