import React, { useState } from 'react';
import IdeaList from './IdeaList';
import IdeaChat from './IdeaChat';

export default function IdeaIncubator({ currentUser, onExit, onProductCreated }) {
  const [selectedIdea, setSelectedIdea] = useState(null);

  if (selectedIdea) {
    return (
      <IdeaChat 
        ideaId={selectedIdea.id} 
        onBack={() => setSelectedIdea(null)} 
        currentUser={currentUser}
        onProductCreated={onProductCreated}
      />
    );
  }

  return (
    <IdeaList 
      onSelectIdea={setSelectedIdea} 
      currentUser={currentUser}
      onExit={onExit}
    />
  );
}
