import React from 'react';
import { useFeedNavigation } from '@/contexts/FeedContext';
import { SharedArticleList } from './SharedArticleList';
import { LayoutType } from '@/services/settings/types';
import './MainArea.css';

interface MainAreaProps {
  layout?: LayoutType;
}

export const MainArea: React.FC<MainAreaProps> = ({ layout = '2-column' }) => {
  const { selectedSmartView } = useFeedNavigation();

  return (
    <main className="main-area" data-section="main-area">
      <SharedArticleList
        layout={layout}
        variant={selectedSmartView === 'saved' ? 'saved' : 'common'}
      />
    </main>
  );
};
