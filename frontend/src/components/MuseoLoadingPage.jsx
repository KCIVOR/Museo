import React from 'react';
import './MuseoLoadingPage.css';

const MuseoLoadingPage = () => {
  return (
    <div className="museo-loading-page">
      <img 
        src="https://ddkkbtijqrgpitncxylx.supabase.co/storage/v1/object/public/uploads/Museo.png"
        alt="Museo"
        className="museo-loading-logo"
      />
    </div>
  );
};

export default MuseoLoadingPage;
