import React from 'react';

interface AnswerBubbleProps {
  answer: string;
  onClose: () => void;
}

const AnswerBubble: React.FC<AnswerBubbleProps> = ({ answer, onClose }) => {
  return (
    <div style={{ background: '#f1f1f1', borderRadius: '8px', padding: '10px', marginTop: '8px' }}>
      <strong>AI:</strong> {answer}
      <button onClick={onClose} style={{ marginLeft: '10px' }}>Dismiss</button>
    </div>
  );
};

export default AnswerBubble;
