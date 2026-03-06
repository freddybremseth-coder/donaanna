
import React from 'react';
import ProfitabilityDashboard from '../components/ProfitabilityDashboard';
import { Language } from '../types';

interface ProfitabilityPageProps {
  language: Language;
}

const ProfitabilityPage: React.FC<ProfitabilityPageProps> = ({ language }) => {
  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <ProfitabilityDashboard language={language} />
    </div>
  );
};

export default ProfitabilityPage;
