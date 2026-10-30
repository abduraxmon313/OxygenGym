import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './styles/global.css';
import App from './App';
import { applyTheme, initialTheme } from './lib/theme';

// Birinchi chizishdan oldin rejimni qo'yamiz — oq/qora "miltillash" bo'lmasin
applyTheme(initialTheme());

const root = ReactDOM.createRoot(document.getElementById('root'));

if (!window.api) {
  root.render(<div className="fatal">OxygenGym ilovasini Electron orqali ishga tushiring.</div>);
} else {
  root.render(<App />);
}
