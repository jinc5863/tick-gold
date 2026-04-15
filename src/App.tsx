import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';

import Dashboard from './pages/Dashboard';
import Database from './pages/DataManagement/Database';
import DataClean from './pages/DataManagement/DataClean';
import Statistics from './pages/DataManagement/Statistics';
import DataImport from './pages/DataManagement/DataImport';
import DataCleanProgress from './pages/DataManagement/DataCleanProgress';
import FactorAnalysis from './pages/FactorAnalysis';
import RiskControl from './pages/RiskControl';
import EAGenerator from './pages/EAGenerator';
import Backtesting from './pages/Backtesting';
import AIResearch from './pages/AIResearch';
import Trading from './pages/Trading';
import KlinePanel from './pages/KlinePanel';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/data-management" element={<Database />} />
        <Route path="/data-management/cleaning" element={<DataClean />} />
        <Route path="/data-management/database" element={<Database />} />
        <Route path="/data-management/statistics" element={<Statistics />} />
        <Route path="/data-management/import" element={<DataImport />} />
        <Route path="/data-clean" element={<DataClean />} />
        <Route path="/data-clean-progress" element={<DataCleanProgress />} />
        <Route path="/factor-analysis" element={<FactorAnalysis />} />
        <Route path="/risk-control" element={<RiskControl />} />
        <Route path="/ea-generator" element={<EAGenerator />} />
        <Route path="/backtesting" element={<Backtesting />} />
        <Route path="/ai-research" element={<AIResearch />} />
        <Route path="/trading" element={<Trading />} />
        <Route path="/kline-panel" element={<KlinePanel />} />
      </Routes>
    </Layout>
  );
}

export default App;
