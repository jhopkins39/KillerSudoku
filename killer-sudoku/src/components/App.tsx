import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SettingsProvider } from '../contexts/SettingsContext';
import HomePage from '../pages/HomePage';
import GamePage from '../pages/GamePage';
import StatsPage from '../pages/StatsPage';
import OptionsPage from '../pages/OptionsPage';
import styles from './App.module.css';

export default function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <div className={styles.app}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/play" element={<GamePage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/options" element={<OptionsPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </SettingsProvider>
  );
}
